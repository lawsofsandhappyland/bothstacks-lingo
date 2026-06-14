import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsView from './SettingsView';
import { soundEffects } from '../lib/audio';

// Mock audio
vi.mock('../lib/audio', () => ({
  soundEffects: {
    playTap: vi.fn(),
    playCorrect: vi.fn(),
    playIncorrect: vi.fn(),
    playHeartLost: vi.fn(),
    playLevelUp: vi.fn(),
    setMuted: vi.fn(),
    isMuted: vi.fn(() => false),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const defaultProps = {
  stats: { xp: 250, streak: 7, lives: 3, lastActiveDate: null },
  tutorModel: 'gemini-2.5-flash',
  setTutorModel: vi.fn(),
  resetStats: vi.fn(),
};

describe('SettingsView — tutor style', () => {
  it('Amigable radio is aria-checked when tutorModel is gemini-2.5-flash', () => {
    render(<SettingsView {...defaultProps} tutorModel="gemini-2.5-flash" />);
    const amigable = screen.getByRole('radio', { name: /amigable/i });
    expect(amigable.getAttribute('aria-checked')).toBe('true');
  });

  it('clicking Rápido calls setTutorModel with gemini-2.5-flash-lite', async () => {
    const setModel = vi.fn();
    render(<SettingsView {...defaultProps} setTutorModel={setModel} />);
    await userEvent.click(screen.getByRole('radio', { name: /rápido/i }));
    expect(setModel).toHaveBeenCalledWith('gemini-2.5-flash-lite');
  });

  it('clicking Paciente calls setTutorModel with gemini-1.5-pro', async () => {
    const setModel = vi.fn();
    render(<SettingsView {...defaultProps} setTutorModel={setModel} />);
    await userEvent.click(screen.getByRole('radio', { name: /paciente/i }));
    expect(setModel).toHaveBeenCalledWith('gemini-1.5-pro');
  });
});

describe('SettingsView — sound effects toggle', () => {
  it('clicking the sound switch calls soundEffects.setMuted once', async () => {
    render(<SettingsView {...defaultProps} />);
    const soundSwitch = screen.getByRole('switch', { name: /sonido/i });
    await userEvent.click(soundSwitch);
    expect(vi.mocked(soundEffects.setMuted)).toHaveBeenCalledTimes(1);
  });
});

describe('SettingsView — reset flow', () => {
  it('clicking Reiniciar opens the ConfirmDialog', async () => {
    render(<SettingsView {...defaultProps} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByText('Reiniciar'));
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('clicking the Reiniciar confirm button calls resetStats once', async () => {
    const reset = vi.fn();
    render(<SettingsView {...defaultProps} resetStats={reset} />);
    await userEvent.click(screen.getByText('Reiniciar'));
    const confirmBtn = screen.getAllByRole('button', { name: 'Reiniciar' }).find(
      b => b.closest('[role="dialog"]') !== null
    );
    await userEvent.click(confirmBtn!);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('clicking Conservar mis datos does NOT call resetStats and closes the dialog', async () => {
    const reset = vi.fn();
    render(<SettingsView {...defaultProps} resetStats={reset} />);
    await userEvent.click(screen.getByText('Reiniciar'));
    await userEvent.click(screen.getByRole('button', { name: 'Conservar mis datos' }));
    expect(reset).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Conservar mis datos' })).toBeNull();
  });
});
