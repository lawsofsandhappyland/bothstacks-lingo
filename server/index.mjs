import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = normalize(join(__dirname, '..'));
const distDir = join(rootDir, 'dist');
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
const liveModel = 'gemini-3.1-flash-live-preview';

const allowedModels = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
]);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function readRequestJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', chunk => {
      body += chunk;
      if (body.length > 64_000) {
        request.destroy();
        reject(new Error('Request body too large'));
      }
    });

    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Invalid JSON request'));
      }
    });

    request.on('error', reject);
  });
}

function buildTutorPrompt({ userText, messages }) {
  const recentConversation = messages
    .map(message => `${message.sender === 'user' ? 'Learner' : 'Tutor'}: ${message.text}`)
    .join('\n');

  return `You are El Pinguino, the BothStacks Spanish tutor.
Act as a learning agent, not a novelty chatbot. Track the learner's immediate weakness from the latest message, correct it briefly in English, then continue in Spanish.

Rules:
- Respond with valid JSON only.
- JSON keys must be "text", "translation", and "correction".
- "text" is your Spanish tutor response, 2 short sentences maximum.
- "translation" is the English translation of "text".
- "correction" is brief English feedback on the learner's Spanish. If the Spanish is correct, say what they did well.
- Keep the coding/Linux/cloud theme only when it naturally fits.
- Do not ask for or reveal API keys or secrets.

Recent conversation:
${recentConversation || '(none)'}

Latest learner message:
${userText}`;
}

function buildLiveSystemInstruction() {
  return `You are El Pinguino, the BothStacks Spanish speaking coach.
This is a live voice conversation. Help the learner practice Spanish out loud.

Rules:
- Speak mostly in Spanish, but use brief English corrections when helpful.
- Keep each response short enough for conversation.
- Ask one natural follow-up question at a time.
- Correct pronunciation, grammar, or vocabulary gently.
- Prefer practical Spanish for daily conversation, coding, Linux, cloud work, coffee, and travel.
- Do not ask for secrets or API keys.`;
}

function parseTutorText(rawText) {
  try {
    const parsed = JSON.parse(rawText);
    return {
      text: String(parsed.text || '').trim(),
      translation: String(parsed.translation || '').trim(),
      correction: String(parsed.correction || '').trim()
    };
  } catch {
    return {
      text: rawText.trim(),
      translation: '',
      correction: 'The tutor response was not structured, so it was shown directly.'
    };
  }
}

async function handleTutor(request, response) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    sendJson(response, 503, {
      error: 'GEMINI_API_KEY is not configured on the server.'
    });
    return;
  }

  const body = await readRequestJson(request);
  const userText = String(body.userText || '').trim();
  const requestedModel = String(body.model || 'gemini-2.5-flash');
  const model = allowedModels.has(requestedModel) ? requestedModel : 'gemini-2.5-flash';
  const messages = Array.isArray(body.messages)
    ? body.messages
        .slice(-10)
        .filter(message => message && (message.sender === 'user' || message.sender === 'tutor'))
        .map(message => ({
          sender: message.sender,
          text: String(message.text || '').slice(0, 1000)
        }))
    : [];

  if (!userText) {
    sendJson(response, 400, { error: 'A learner message is required.' });
    return;
  }

  const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildTutorPrompt({ userText, messages }) }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 400,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    console.error('Gemini API failed:', geminiResponse.status, errorText);
    sendJson(response, 502, { error: 'Gemini API call failed.' });
    return;
  }

  const data = await geminiResponse.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const parsed = parseTutorText(rawText);

  sendJson(response, 200, parsed);
}

async function handleLiveToken(_request, response) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    sendJson(response, 503, {
      error: 'GEMINI_API_KEY is not configured on the server.'
    });
    return;
  }

  const client = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: 'v1alpha' }
  });

  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();

  const token = await client.authTokens.create({
    config: {
      uses: 1,
      expireTime,
      newSessionExpireTime,
      liveConnectConstraints: {
        model: liveModel,
        config: {
          temperature: 0.7,
          responseModalities: ['AUDIO'],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: {
            parts: [{ text: buildLiveSystemInstruction() }]
          }
        }
      },
      httpOptions: { apiVersion: 'v1alpha' }
    }
  });

  sendJson(response, 200, {
    token: token.name,
    model: liveModel,
    expiresAt: expireTime
  });
}

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const normalizedPath = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const candidatePath = join(distDir, normalizedPath === '/' ? 'index.html' : normalizedPath);
  const filePath = existsSync(candidatePath) ? candidatePath : join(distDir, 'index.html');
  const extension = extname(filePath);

  try {
    await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes[extension] || 'application/octet-stream',
      'Cache-Control': extension === '.html' ? 'no-store' : 'public, max-age=31536000, immutable'
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}

const server = createServer(async (request, response) => {
  try {
    if (request.url?.startsWith('/api/tutor') && request.method === 'POST') {
      await handleTutor(request, response);
      return;
    }

    if (request.url?.startsWith('/api/live-token') && request.method === 'POST') {
      await handleLiveToken(request, response);
      return;
    }

    if (request.url?.startsWith('/api/')) {
      sendJson(response, 404, { error: 'Unknown API route.' });
      return;
    }

    await serveStatic(request, response);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: 'Internal server error.' });
  }
});

server.listen(port, host, () => {
  console.log(`BothStacks Lingo server listening on http://${host}:${port}`);
});
