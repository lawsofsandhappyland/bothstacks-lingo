import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TutorChat from './TutorChat';

// ---------------------------------------------------------------------------
// Fake WebSocket
// ---------------------------------------------------------------------------

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(d: string) {
    this.sent.push(d);
  }

  close() {
    this.readyState = 3;
  }
}

(FakeWebSocket as unknown as { OPEN: number }).OPEN = 1;

// ---------------------------------------------------------------------------
// Fake AudioContext
// ---------------------------------------------------------------------------

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 16000;
  destination = {};

  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }

  createScriptProcessor() {
    return { connect: vi.fn(), disconnect: vi.fn(), onaudioprocess: null };
  }

  createBuffer() {
    return { getChannelData: () => new Float32Array(0), duration: 0 };
  }

  createBufferSource() {
    return { connect: vi.fn(), start: vi.fn(), buffer: null };
  }

  close() {
    return Promise.resolve();
  }
}

// ---------------------------------------------------------------------------
// beforeEach / afterEach
// ---------------------------------------------------------------------------

beforeEach(() => {
  FakeWebSocket.instances = [];

  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ token: 'test-token' }),
  }) as unknown as typeof fetch;

  globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
  (globalThis.WebSocket as unknown as { OPEN: number }).OPEN = 1;

  globalThis.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
  globalThis.AudioContext = FakeAudioContext as unknown as typeof AudioContext;

  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TutorChat', () => {
  it('shows idle mic button on initial render and it is not disabled', () => {
    render(<TutorChat />);

    const startButton = screen.getByRole('button', { name: /empezar a hablar/i });
    expect(startButton).toBeTruthy();
    expect(startButton.hasAttribute('disabled')).toBe(false);
  });

  it('calls fetch with /api/live-token, opens a WebSocket, and goes live after socket open', async () => {
    const user = userEvent.setup();
    render(<TutorChat />);

    await user.click(screen.getByRole('button', { name: /empezar a hablar/i }));

    expect(fetch).toHaveBeenCalledWith('/api/live-token', { method: 'POST' });

    await waitFor(() => {
      expect(FakeWebSocket.instances.length).toBe(1);
    });

    act(() => {
      FakeWebSocket.instances[0].onopen?.();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /detener/i })).toBeTruthy();
    });

    expect(FakeWebSocket.instances[0].sent.length).toBeGreaterThanOrEqual(1);
    expect(FakeWebSocket.instances[0].sent[0]).toContain('setup');
  });

  it('appends a transcript line when the socket sends an outputTranscription message', async () => {
    const user = userEvent.setup();
    render(<TutorChat />);

    await user.click(screen.getByRole('button', { name: /empezar a hablar/i }));

    await waitFor(() => {
      expect(FakeWebSocket.instances.length).toBe(1);
    });

    act(() => {
      FakeWebSocket.instances[0].onopen?.();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /detener/i })).toBeTruthy();
    });

    act(() => {
      FakeWebSocket.instances[0].onmessage?.({
        data: JSON.stringify({
          serverContent: {
            outputTranscription: { text: 'Hola mundo' },
          },
        }),
      });
    });

    await screen.findByText(/Hola mundo/);
  });

  it('closes the socket and returns to idle when Detener is clicked', async () => {
    const user = userEvent.setup();
    render(<TutorChat />);

    await user.click(screen.getByRole('button', { name: /empezar a hablar/i }));

    await waitFor(() => {
      expect(FakeWebSocket.instances.length).toBe(1);
    });

    act(() => {
      FakeWebSocket.instances[0].onopen?.();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /detener/i })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: /detener/i }));

    expect(FakeWebSocket.instances[0].readyState).toBe(3);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /empezar a hablar/i })).toBeTruthy();
    });
  });

  it('shows a friendly error message when fetch returns ok: false', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    const user = userEvent.setup();
    render(<TutorChat />);

    await user.click(screen.getByRole('button', { name: /empezar a hablar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('No pudimos conectar con el tutor. Inténtalo de nuevo en un momento.'),
      ).toBeTruthy();
    });
  });
});
