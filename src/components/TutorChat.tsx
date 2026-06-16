import { useRef, useState } from 'react';
import { appendChunk, formatTranscript, toSessionTurns, type TranscriptTurn, type SessionTurn } from '../lib/transcript';

const LIVE_MODEL = 'gemini-3.1-flash-live-preview';
const LIVE_ENDPOINT = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

type TutorStatus = 'idle' | 'connecting' | 'live' | 'error';

interface TutorChatProps {
  /** Returns a fresh Firebase ID token so the server can verify the learner and personalise the persona. */
  getToken?: () => Promise<string | null>;
  /** Called once per session (on stop/disconnect) with the full conversation, when non-empty. */
  onSaveSession?: (turns: SessionTurn[]) => void;
}

function floatTo16BitPcmBase64(samples: Float32Array, sourceSampleRate: number) {
  const sampleRatio = sourceSampleRate / INPUT_SAMPLE_RATE;
  const outputLength = Math.floor(samples.length / sampleRatio);
  const output = new Int16Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const sourceIndex = Math.floor(index * sampleRatio);
    const clamped = Math.max(-1, Math.min(1, samples[sourceIndex]));
    output[index] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  return int16ToBase64(output);
}

function int16ToBase64(samples: Int16Array) {
  const bytes = new Uint8Array(samples.buffer);
  let binary = '';

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary);
}

function base64ToInt16Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Int16Array(bytes.buffer);
}

/**
 * A voice-practice tutor that fetches a short-lived server token,
 * streams microphone audio over a WebSocket, and plays back the tutor's audio with live transcripts.
 */
export default function TutorChat({ getToken, onSaveSession }: TutorChatProps) {
  const [status, setStatus] = useState<TutorStatus>('idle');
  const [error, setError] = useState('');
  const [lines, setLines] = useState<TranscriptTurn[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextPlaybackTimeRef = useRef(0);
  const speakTimerRef = useRef<number | null>(null);
  const playingSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const turnsRef = useRef<TranscriptTurn[]>([]);
  const savedRef = useRef(false);

  // Append a streaming transcription chunk, grouping consecutive same-speaker
  // chunks into one turn (otherwise each chunk renders as its own fragment line).
  const pushChunk = (speaker: TranscriptTurn['speaker'], text: string) => {
    turnsRef.current = appendChunk(turnsRef.current, speaker, text);
    setLines(turnsRef.current);
  };

  // Persist the session transcript once, on stop or disconnect, if it has content.
  const saveCurrentSession = () => {
    if (savedRef.current) return;
    const sessionTurns = toSessionTurns(turnsRef.current);
    if (sessionTurns.length === 0) return;
    savedRef.current = true;
    onSaveSession?.(sessionTurns);
  };

  const handleCopyTranscript = () => {
    const text = formatTranscript(turnsRef.current);
    if (!text || !navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => { /* clipboard unavailable */ });
  };

  const teardownAudio = () => {
    for (const source of playingSourcesRef.current) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    playingSourcesRef.current = [];
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(track => track.stop());
    void inputContextRef.current?.close();

    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    inputContextRef.current = null;

    if (speakTimerRef.current !== null) {
      window.clearTimeout(speakTimerRef.current);
      speakTimerRef.current = null;
    }
    setSpeaking(false);
  };

  const stopSession = () => {
    saveCurrentSession();
    socketRef.current?.close();
    socketRef.current = null;
    teardownAudio();
    setStatus('idle');
  };

  // Stop and discard any queued/playing tutor audio. Used for barge-in: when the
  // server reports the turn was interrupted, the already-buffered reply must be
  // dropped so the tutor yields immediately instead of talking over the learner.
  const flushPlayback = () => {
    for (const source of playingSourcesRef.current) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    playingSourcesRef.current = [];
    if (outputContextRef.current) {
      nextPlaybackTimeRef.current = outputContextRef.current.currentTime;
    }
    if (speakTimerRef.current !== null) {
      window.clearTimeout(speakTimerRef.current);
      speakTimerRef.current = null;
    }
    setSpeaking(false);
  };

  const playPcmAudio = (base64Audio: string) => {
    const audioContext = outputContextRef.current;
    if (!audioContext) return;

    const pcm = base64ToInt16Array(base64Audio);
    const buffer = audioContext.createBuffer(1, pcm.length, OUTPUT_SAMPLE_RATE);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < pcm.length; index += 1) {
      channel[index] = pcm[index] / 0x8000;
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    playingSourcesRef.current.push(source);
    source.onended = () => {
      playingSourcesRef.current = playingSourcesRef.current.filter(s => s !== source);
    };

    const startAt = Math.max(audioContext.currentTime, nextPlaybackTimeRef.current);
    source.start(startAt);
    nextPlaybackTimeRef.current = startAt + buffer.duration;

    setSpeaking(true);
    if (speakTimerRef.current !== null) {
      window.clearTimeout(speakTimerRef.current);
    }
    // Wait out any already-queued chunks (startAt may be in the future) plus this
    // chunk's own duration before flipping back to listening, so the orb doesn't
    // say "listening" while buffered tutor audio is still playing.
    const queuedSeconds = Math.max(0, startAt - audioContext.currentTime) + buffer.duration;
    speakTimerRef.current = window.setTimeout(
      () => setSpeaking(false),
      Math.max(150, queuedSeconds * 1000 + 150)
    );
  };

  const startSession = async () => {
    setStatus('connecting');
    setError('');

    try {
      const idToken = getToken ? await getToken() : null;
      const tokenResponse = await fetch('/api/live-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(idToken ? { idToken } : {})
      });
      if (!tokenResponse.ok) {
        throw new Error('No pudimos conectar con el tutor. Inténtalo de nuevo en un momento.');
      }

      const { token } = await tokenResponse.json() as { token?: string };
      if (!token) {
        throw new Error('No pudimos iniciar la sesión de voz. Inténtalo de nuevo.');
      }

      const inputContext = new AudioContext();
      const outputContext = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const socket = new WebSocket(`${LIVE_ENDPOINT}?access_token=${encodeURIComponent(token)}`);
      // The Live API delivers its messages as binary frames; default WebSocket
      // binaryType is 'blob', which would make JSON.parse(event.data) throw on
      // every message. Take ArrayBuffers so we can decode them synchronously
      // (in order) before parsing.
      socket.binaryType = 'arraybuffer';

      inputContextRef.current = inputContext;
      outputContextRef.current = outputContext;
      streamRef.current = mediaStream;
      socketRef.current = socket;
      nextPlaybackTimeRef.current = outputContext.currentTime;

      socket.onopen = () => {
        socket.send(JSON.stringify({
          setup: {
            model: `models/${LIVE_MODEL}`,
            generationConfig: {
              responseModalities: ['AUDIO']
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {}
          }
        }));

        const source = inputContext.createMediaStreamSource(mediaStream);
        const processor = inputContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = event => {
          if (socket.readyState !== WebSocket.OPEN) return;

          const audio = event.inputBuffer.getChannelData(0);
          const data = floatTo16BitPcmBase64(audio, inputContext.sampleRate);

          socket.send(JSON.stringify({
            realtimeInput: {
              audio: {
                data,
                mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`
              }
            }
          }));
        };

        source.connect(processor);
        processor.connect(inputContext.destination);
        sourceRef.current = source;
        processorRef.current = processor;

        turnsRef.current = [];
        savedRef.current = false;
        setLines([]);
        setStatus('live');
      };

      socket.onmessage = event => {
        const raw = typeof event.data === 'string'
          ? event.data
          : new TextDecoder().decode(event.data as ArrayBuffer);

        let message;
        try {
          message = JSON.parse(raw);
        } catch {
          return;
        }

        const serverContent = message.serverContent;

        // Barge-in: the learner started talking over the tutor. Drop the queued
        // reply so the tutor yields the turn instead of finishing its old answer.
        if (serverContent?.interrupted) {
          flushPlayback();
          return;
        }

        if (serverContent?.inputTranscription?.text) {
          pushChunk('You', serverContent.inputTranscription.text);
        }

        if (serverContent?.outputTranscription?.text) {
          pushChunk('Tutor', serverContent.outputTranscription.text);
        }

        const parts = serverContent?.modelTurn?.parts || [];
        for (const part of parts) {
          const inlineData = part.inlineData || part.inline_data;
          if (inlineData?.data) {
            playPcmAudio(inlineData.data);
          }
        }
      };

      socket.onerror = () => {
        setError('No pudimos conectar. Revisa el permiso del micrófono e inténtalo de nuevo.');
        setStatus('error');
      };

      socket.onclose = () => {
        // Ignore close events from a superseded/stopped socket so they don't
        // tear down a newer session that reused the shared refs.
        if (socketRef.current !== socket) return;
        saveCurrentSession();
        teardownAudio();
        setStatus(prev => (prev === 'error' ? 'error' : 'idle'));
      };
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'No pudimos iniciar el tutor de voz.';
      setError(message);
      setStatus('error');
      stopSession();
    }
  };

  // Derived state
  const isLive = status === 'live';
  const isConnecting = status === 'connecting';
  const isError = status === 'error';

  // Status indicator
  let dotColor: string;
  let statusLabel: string;
  if (isError) {
    dotColor = 'bg-red-500';
    statusLabel = 'Algo salió mal';
  } else if (isConnecting) {
    dotColor = 'bg-electric-blue';
    statusLabel = 'Conectando…';
  } else if (isLive && speaking) {
    dotColor = 'bg-success-green';
    statusLabel = 'Hablando…';
  } else if (isLive && !speaking) {
    dotColor = 'bg-fuchsia-accent';
    statusLabel = 'Escuchando…';
  } else {
    dotColor = 'bg-muted';
    statusLabel = 'En reposo';
  }

  // Orb background
  let orbBg: string;
  if (isLive && speaking) {
    orbBg = 'bg-success-green';
  } else if (isLive && !speaking) {
    orbBg = 'bg-fuchsia-accent';
  } else {
    orbBg = 'bg-electric-blue';
  }

  // Hero copy
  let headline: string;
  let subline: string;
  if (isError) {
    headline = 'Algo salió mal';
    subline = 'Revisa tu micrófono e inténtalo de nuevo.';
  } else if (isConnecting) {
    headline = 'Conectando con El Pingüino…';
    subline = 'Un momento, preparando tu sesión de voz.';
  } else if (isLive && speaking) {
    headline = 'El Pingüino está respondiendo';
    subline = 'Escucha y repite en voz alta cuando termine.';
  } else if (isLive && !speaking) {
    headline = 'Te escucho — habla con confianza';
    subline = 'Di lo que quieras en español. No te preocupes por los errores.';
  } else {
    headline = 'Practica español hablando en voz alta';
    subline = 'El Pingüino te escucha, te responde y te corrige con cariño.';
  }

  return (
    <div className="w-full max-w-2xl px-4 py-6 pb-32 mx-auto flex flex-col gap-4">
      {/* Hero card */}
      <div
        className="arcade-card-hero p-6 flex flex-col items-center gap-5"
        style={{
          background: 'radial-gradient(420px 280px at 50% 0%, rgba(232,57,246,0.16), transparent 70%), var(--color-card-alt)',
          border: '1px solid var(--color-raised-edge)',
        }}
      >
        {/* Status line */}
        <div className="flex items-center gap-2 self-start">
          <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-body-lifted">{statusLabel}</span>
        </div>

        {/* Orb */}
        <div className="relative flex items-center justify-center" style={{ width: 150, height: 150 }}>
          {/* Expanding rings when listening */}
          {isLive && !speaking && (
            <>
              <span
                className="absolute inset-0 rounded-full animate-ring"
                style={{ backgroundColor: 'rgba(232,57,246,0.25)', border: '1px solid rgba(232,57,246,0.4)' }}
              />
              <span
                className="absolute inset-0 rounded-full animate-ring"
                style={{ backgroundColor: 'rgba(232,57,246,0.15)', border: '1px solid rgba(232,57,246,0.3)', animationDelay: '0.9s' }}
              />
            </>
          )}

          {/* Main orb circle */}
          <div
            className={`relative w-[150px] h-[150px] rounded-full flex items-center justify-center overflow-hidden transition-colors duration-300 ${orbBg}`}
            style={{ border: '3px solid var(--color-hard-shadow)', boxShadow: '0 8px 0 0 var(--color-hard-shadow), 0 12px 32px rgba(0,0,0,0.5)' }}
          >
            {isLive && speaking ? (
              /* Waveform bars */
              <div className="flex items-center gap-1" style={{ height: 48 }}>
                <span className="w-2 rounded-full animate-bar delay-1" style={{ height: 32, backgroundColor: 'var(--color-void)', transformOrigin: 'center' }} />
                <span className="w-2 rounded-full animate-bar delay-2" style={{ height: 40, backgroundColor: 'var(--color-void)', transformOrigin: 'center' }} />
                <span className="w-2 rounded-full animate-bar delay-3" style={{ height: 48, backgroundColor: 'var(--color-void)', transformOrigin: 'center' }} />
                <span className="w-2 rounded-full animate-bar delay-4" style={{ height: 40, backgroundColor: 'var(--color-void)', transformOrigin: 'center' }} />
                <span className="w-2 rounded-full animate-bar delay-5" style={{ height: 32, backgroundColor: 'var(--color-void)', transformOrigin: 'center' }} />
              </div>
            ) : (
              /* Mascot */
              <picture className="animate-float">
                <source srcSet="/mascot-wave.webp" type="image/webp" />
                <img src="/mascot-wave.png" alt="El Pingüino, tu tutor de español" width={120} height={120} className="drop-shadow-lg" />
              </picture>
            )}
          </div>
        </div>

        {/* Hero copy */}
        <div className="text-center flex flex-col gap-1" style={{ maxWidth: 380 }}>
          <p className="font-bold text-base text-ghost-white">{headline}</p>
          <p className="text-[13px] text-body-lifted">{subline}</p>
        </div>

        {/* Single toggle button */}
        {(status === 'idle' || isError) && (
          <button
            onClick={() => void startSession()}
            className="pill-button pill-button-fuchsia"
          >
            🎤 Empezar a hablar
          </button>
        )}
        {isConnecting && (
          <button
            onClick={stopSession}
            className="pill-button bg-muted text-ghost-white"
            style={{ borderColor: 'var(--color-muted)' }}
          >
            Conectando… · Cancelar
          </button>
        )}
        {isLive && (
          <button
            onClick={stopSession}
            className="pill-button bg-muted text-ghost-white"
            style={{ borderColor: 'var(--color-muted)' }}
          >
            Detener
          </button>
        )}

        {/* Error box */}
        {error && (
          <div className="w-full bg-red-950 border border-red-800 rounded-2xl p-3 text-sm text-red-100">
            {error}
          </div>
        )}
      </div>

      {/* Transcript card */}
      <div className="arcade-card p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted">Conversación</span>
          {lines.length > 0 && (
            <button
              onClick={handleCopyTranscript}
              className="font-mono text-[10px] font-bold uppercase tracking-widest text-body-lifted hover:text-ghost-white transition-colors"
            >
              {copied ? '✓ Copiado' : '📋 Copiar'}
            </button>
          )}
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center gap-2 py-8">
            <span className="text-3xl">💬</span>
            <p className="font-bold text-ghost-white text-sm">Pulsa el micrófono y di «¡Hola!» — El Pingüino te responderá en voz alta.</p>
            <p className="text-[12px] text-muted">Empieza con saludos, café o tu próximo despliegue. Sin prisa, sin notas.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: 360 }}>
            {lines.map((line, index) => {
              const text = line.text.trim();
              if (!text) return null;
              return (
                <div
                  key={index}
                  className={`rounded-xl border p-3 ${line.speaker === 'You' ? 'ml-8 text-right' : 'mr-8 text-left'}`}
                  style={{
                    backgroundColor: line.speaker === 'You' ? 'rgba(232,57,246,0.12)' : 'rgba(255,255,255,0.04)',
                    borderColor: line.speaker === 'You' ? 'var(--color-fuchsia-accent)' : 'var(--color-raised-edge)',
                  }}
                >
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-muted block">
                    {line.speaker === 'You' ? 'Tú' : 'El Pingüino'}
                  </span>
                  <p className="text-sm font-bold leading-relaxed">{text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
