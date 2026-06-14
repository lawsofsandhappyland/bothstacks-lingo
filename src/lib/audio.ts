// Web Audio API Synthesizer for BothLingo
// Generates cute, retro 8-bit game sound effects entirely in code.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    // Standard audio context initialization
    const AudioContextClass = window.AudioContext || (window as Window & typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error('Web Audio API is not available in this browser.');
    }

    audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a simple beep with standard controls.
 */
function playBeep(
  frequency: number,
  type: OscillatorType,
  duration: number,
  volume: number,
  pitchSlideTo?: number,
  slideDuration?: number
) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Initial volume
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);

    // Fade out volume slightly before the end to avoid popping clicks
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    // Pitch slide (if provided)
    if (pitchSlideTo && slideDuration) {
      osc.frequency.exponentialRampToValueAtTime(pitchSlideTo, ctx.currentTime + slideDuration);
    }

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error("Web Audio playback failed: ", e);
  }
}

export const soundEffects = {
  /**
   * Sound played when the user selects a button or word bank item.
   * A short, satisfying retro click.
   */
  playTap: () => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn("Audio tap failed", e);
    }
  },

  /**
   * Sound played for a correct answer.
   * Bright, cheerful high-pitched double-tone arpeggio.
   */
  playCorrect: () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Note 1 (E5 - 659.25Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Note 2 (G5 - 783.99Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.08); // G5
      gain2.gain.setValueAtTime(0.15, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.3);
    } catch (e) {
      console.warn("Audio correct failed", e);
    }
  },

  /**
   * Sound played for an incorrect answer.
   * A classic disappointed 8-bit buzz.
   */
  playIncorrect: () => {
    // Low triangle-to-saw descending buzz
    playBeep(220, 'sawtooth', 0.25, 0.12, 110, 0.22);
  },

  /**
   * Sound played when the user finishes a lesson successfully.
   * A beautiful cascading high-energy arpeggio!
   */
  playLevelUp: () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
      const tempo = 0.06; // 60ms between notes

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * tempo);
        
        const noteVol = idx === notes.length - 1 ? 0.2 : 0.12;
        gainNode.gain.setValueAtTime(noteVol, now + idx * tempo);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + idx * tempo + 0.25);

        osc.start(now + idx * tempo);
        osc.stop(now + idx * tempo + 0.25);
      });
    } catch (e) {
      console.warn("Audio level up failed", e);
    }
  },

  /**
   * Sound played when a heart/life is lost.
   * A sad falling sliding buzz.
   */
  playHeartLost: () => {
    playBeep(330, 'triangle', 0.4, 0.15, 140, 0.35);
  }
};
