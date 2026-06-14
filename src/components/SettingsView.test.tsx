import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsView from './SettingsView';

// Mock audio
vi.mock('../lib/audio', () => ({
  soundEffects: {
    playTap: vi.fn(),
    playCorrect: vi.fn(),
    playIncorrect: vi.fn(),
    playHeartLost: vi.fn(),
    playLevelUp: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn(() => true);
  window.alert = vi.fn();
});

const defaultProps = {
  stats: { xp: 250, streak: 7, lives: 3, lastActiveDate: null },
  tutorModel: 'gemini-2.5-flash',
  setTutorModel: vi.fn(),
  resetStats: vi.fn(),
};

describe('SettingsView — stats display', () => {
  it('renders xp value', () => {
    render(<SettingsView {...defaultProps} />);
    expect(screen.getByText('250')).toBeDefined();
  });

  it('renders streak value', () => {
    render(<SettingsView {...defaultProps} />);
    expect(screen.getByText('7 days')).toBeDefined();
  });

  it('renders lives value', () => {
    render(<SettingsView {...defaultProps} />);
    expect(screen.getByText('3/5')).toBeDefined();
  });
});

describe('SettingsView — model selection', () => {
  it('select has the current tutorModel value', () => {
    render(<SettingsView {...defaultProps} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('gemini-2.5-flash');
  });

  it('selecting a different option calls setTutorModel with that value', async () => {
    const setModel = vi.fn();
    render(<SettingsView {...defaultProps} setTutorModel={setModel} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'gemini-2.5-flash-lite');
    expect(setModel).toHaveBeenCalledWith('gemini-2.5-flash-lite');
  });
});

describe('SettingsView — reset stats', () => {
  it('clicking Reset All Stats when confirm returns true calls resetStats once', async () => {
    const reset = vi.fn();
    render(<SettingsView {...defaultProps} resetStats={reset} />);
    await userEvent.click(screen.getByText('Reset All Stats'));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('clicking Reset All Stats when confirm returns false does NOT call resetStats', async () => {
    window.confirm = vi.fn(() => false);
    const reset = vi.fn();
    render(<SettingsView {...defaultProps} resetStats={reset} />);
    await userEvent.click(screen.getByText('Reset All Stats'));
    expect(reset).not.toHaveBeenCalled();
  });
});
