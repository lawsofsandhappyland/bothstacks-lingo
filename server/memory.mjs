import { GoogleAuth } from 'google-auth-library';

/**
 * Vertex AI Memory Bank client for the voice tutor.
 *
 * The Gemini Live voice loop runs browser <-> Google directly, so the server
 * gives it long-term memory out of band: it retrieves the learner's memories to
 * compose the persona baked into each live token, and after a session it sends
 * the transcript to Memory Bank to generate/consolidate new memories.
 *
 * Memories are scoped by { app_name, user_id } (ADK's convention). We use a
 * stable app_name so the voice tutor's memory is consistent across sessions.
 */

const PROJECT = process.env.GCP_PROJECT || 'both-stacks';
const LOCATION = process.env.AGENT_ENGINE_LOCATION || 'us-central1';
const AGENT_ENGINE_ID = process.env.AGENT_ENGINE_ID || '7355757528833064960';
const APP_NAME = process.env.TUTOR_MEMORY_APP || 'bothlingo';

const BASE = `https://${LOCATION}-aiplatform.googleapis.com/v1beta1/projects/${PROJECT}/locations/${LOCATION}/reasoningEngines/${AGENT_ENGINE_ID}`;

let authClientPromise = null;
function getAuthClient() {
  if (!authClientPromise) {
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    authClientPromise = auth.getClient();
  }
  return authClientPromise;
}

/** True when memory is configured (an Agent Engine instance id is available). */
export function memoryEnabled() {
  return Boolean(AGENT_ENGINE_ID);
}

/**
 * Retrieve the learner's most relevant long-term memories as plain fact strings.
 * Returns [] on any failure so the voice loop degrades gracefully.
 */
export async function retrieveMemories(userId, query, topK = 12) {
  if (!userId) return [];
  try {
    const client = await getAuthClient();
    const res = await client.request({
      url: `${BASE}/memories:retrieve`,
      method: 'POST',
      data: {
        scope: { app_name: APP_NAME, user_id: userId },
        similaritySearchParams: { searchQuery: query || 'learner profile, goals, level, and preferences', topK }
      }
    });
    const items = res.data?.retrievedMemories || [];
    return items
      .map(item => (item?.memory?.fact || '').trim())
      .filter(Boolean);
  } catch (error) {
    console.warn('Memory retrieve failed:', error.response?.status || '', String(error.response?.data?.error?.message || error.message).slice(0, 200));
    return [];
  }
}

/**
 * Send a finished voice transcript to Memory Bank to generate/consolidate
 * memories for this learner. Fire-and-forget: generation is asynchronous on the
 * platform; we only kick it off and report whether the call was accepted.
 */
export async function generateMemories(userId, turns) {
  if (!userId || !Array.isArray(turns) || turns.length === 0) return false;
  const events = turns
    .filter(turn => turn && typeof turn.text === 'string' && turn.text.trim())
    .slice(0, 200)
    .map(turn => ({
      content: {
        role: turn.speaker === 'tutor' ? 'model' : 'user',
        parts: [{ text: turn.text.slice(0, 4000) }]
      }
    }));
  if (events.length === 0) return false;
  try {
    const client = await getAuthClient();
    await client.request({
      url: `${BASE}/memories:generate`,
      method: 'POST',
      data: {
        scope: { app_name: APP_NAME, user_id: userId },
        directContentsSource: { events }
      }
    });
    return true;
  } catch (error) {
    console.warn('Memory generate failed:', error.response?.status || '', String(error.response?.data?.error?.message || error.message).slice(0, 200));
    return false;
  }
}
