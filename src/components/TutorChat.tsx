import { useRef, useState } from 'react';

const LIVE_MODEL = 'gemini-3.1-flash-live-preview';
const LIVE_ENDPOINT = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

type TutorStatus = 'idle' | 'connecting' | 'live' | 'error';

interface TranscriptLine {
  id: number;
  speaker: 'You' | 'Tutor';
  text: string;
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

export default function TutorChat() {
  const [status, setStatus] = useState<TutorStatus>('idle');
  const [error, setError] = useState('');
  const [lines, setLines] = useState<TranscriptLine[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextPlaybackTimeRef = useRef(0);
  const lineIdRef = useRef(0);

  const addLine = (speaker: TranscriptLine['speaker'], text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    lineIdRef.current += 1;
    setLines(prev => [
      ...prev.slice(-7),
      {
        id: lineIdRef.current,
        speaker,
        text: cleanText
      }
    ]);
  };

  const teardownAudio = () => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(track => track.stop());
    void inputContextRef.current?.close();

    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    inputContextRef.current = null;
  };

  const stopSession = () => {
    socketRef.current?.close();
    socketRef.current = null;
    teardownAudio();
    setStatus('idle');
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

    const startAt = Math.max(audioContext.currentTime, nextPlaybackTimeRef.current);
    source.start(startAt);
    nextPlaybackTimeRef.current = startAt + buffer.duration;
  };

  const startSession = async () => {
    setStatus('connecting');
    setError('');

    try {
      const tokenResponse = await fetch('/api/live-token', { method: 'POST' });
      if (!tokenResponse.ok) {
        throw new Error('The server could not create a Gemini Live token.');
      }

      const { token } = await tokenResponse.json() as { token?: string };
      if (!token) {
        throw new Error('The server returned an empty Gemini Live token.');
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

        setLines([]);
        setStatus('live');
      };

      socket.onmessage = event => {
        const message = JSON.parse(event.data);
        const serverContent = message.serverContent;

        if (serverContent?.inputTranscription?.text) {
          addLine('You', serverContent.inputTranscription.text);
        }

        if (serverContent?.outputTranscription?.text) {
          addLine('Tutor', serverContent.outputTranscription.text);
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
        setError('Gemini Live connection failed. Check the server log and microphone permission.');
        setStatus('error');
      };

      socket.onclose = () => {
        // Ignore close events from a superseded/stopped socket so they don't
        // tear down a newer session that reused the shared refs.
        if (socketRef.current !== socket) return;
        teardownAudio();
        setStatus(prev => (prev === 'error' ? 'error' : 'idle'));
      };
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Could not start live tutor.';
      setError(message);
      setStatus('error');
      stopSession();
    }
  };

  const isLive = status === 'live';
  const isConnecting = status === 'connecting';

  return (
    <div className="w-full max-w-2xl px-4 py-6 pb-32 mx-auto">
      <section className="retro-card bg-deep-violet text-ghost-white flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <picture className="animate-float">
            <source srcSet="/mascot-wave.webp" type="image/webp" />
            <img src="/mascot-wave.png" alt="Spanish voice tutor" width={88} height={88} className="drop-shadow-lg" />
          </picture>
          <div>
            <span className="ui-label text-fuchsia-accent text-[10px]">Gemini Live</span>
            <h2 className="text-2xl font-black text-flame-orange tracking-tight">VOICE PRACTICE</h2>
            <p className="ui-label text-slate-grey text-[10px]">{LIVE_MODEL}</p>
          </div>
        </div>

        <div className="bg-void/60 border-3 border-void rounded-2xl p-5 min-h-[15rem] flex flex-col gap-3">
          {lines.length === 0 ? (
            <div className="h-full min-h-[12rem] flex flex-col items-center justify-center text-center gap-3">
              <span className={`block w-20 h-20 rounded-full border-3 border-void ${isLive ? 'bg-fuchsia-accent animate-pulse-glow' : 'bg-electric-blue'}`}></span>
              <p className="font-bold text-ghost-white">
                {isLive ? 'Speak Spanish now. El Pingüino is listening.' : 'Start a live conversation and practice out loud.'}
              </p>
              <p className="text-xs text-slate-grey max-w-sm">
                The real Gemini key stays on the server. Your browser receives a one-use Live API token for this session.
              </p>
            </div>
          ) : (
            lines.map(line => (
              <div key={line.id} className={`rounded-xl border border-void p-3 ${line.speaker === 'You' ? 'bg-fuchsia-accent/20 ml-8' : 'bg-void mr-8'}`}>
                <span className="ui-label text-[9px] text-slate-grey">{line.speaker}</span>
                <p className="text-sm font-bold leading-relaxed">{line.text}</p>
              </div>
            ))
          )}
        </div>

        {error && (
          <div className="bg-red-950 border-3 border-red-800 rounded-2xl p-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => void startSession()}
            disabled={isLive || isConnecting}
            className={`pill-button pill-button-fuchsia flex-1 ${isLive || isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isConnecting ? 'CONNECTING...' : isLive ? 'LIVE' : 'START TALKING'}
          </button>
          <button
            onClick={stopSession}
            disabled={!isLive && !isConnecting}
            className={`pill-button bg-void text-ghost-white border-void px-5 ${!isLive && !isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            STOP
          </button>
        </div>
      </section>
    </div>
  );
}
