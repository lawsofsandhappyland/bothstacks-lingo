import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { getAuthReady } from './lib/firebase';
import { loadUserDoc, saveUserDoc } from './lib/persistence';

vi.mock('./components/PathView', () => ({ default: () => <div data-testid="path-view" /> }));
vi.mock('./components/LessonRunner', () => ({ default: () => <div data-testid="lesson-runner" /> }));
vi.mock('./components/TutorChat', () => ({ default: () => <div data-testid="tutor-chat" /> }));
vi.mock('./components/SettingsView', () => ({ default: () => <div data-testid="settings-view" /> }));

vi.mock('./lib/audio', () => ({
  soundEffects: {
    playTap: vi.fn(),
    playCorrect: vi.fn(),
    playIncorrect: vi.fn(),
    playHeartLost: vi.fn(),
    playLevelUp: vi.fn(),
  },
}));

vi.mock('./lib/firebase', () => ({ getAuthReady: vi.fn() }));
vi.mock('./lib/persistence', () => ({ loadUserDoc: vi.fn(), saveUserDoc: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(saveUserDoc).mockResolvedValue(undefined);
});

describe('App', () => {
  it('shows loading state while auth is pending', () => {
    vi.mocked(getAuthReady).mockReturnValue(new Promise(() => {}));
    render(<App />);
    expect(screen.getByText(/CARGANDO/)).toBeTruthy();
  });

  it('loads remote Firestore doc and displays XP', async () => {
    vi.mocked(getAuthReady).mockResolvedValue({ uid: 'u1' } as never);
    vi.mocked(loadUserDoc).mockResolvedValue({
      stats: { xp: 250, streak: 7, lives: 4, lastActiveDate: null },
      completedLessons: [1],
      tutorModel: 'gemini-2.5-flash',
    } as never);

    render(<App />);
    await waitFor(() => screen.getByTestId('path-view'));
    expect(screen.getByText('250 XP')).toBeTruthy();
  });

  it('falls back to localStorage when auth returns null', async () => {
    localStorage.setItem('bothlingo_stats', JSON.stringify({ xp: 99, streak: 2, lives: 5, lastActiveDate: null }));
    localStorage.setItem('bothlingo_completed_lessons', '[]');
    localStorage.setItem('bothlingo_tutor_model', 'gemini-2.5-flash');

    vi.mocked(getAuthReady).mockResolvedValue(null);

    render(<App />);
    await waitFor(() => screen.getByTestId('path-view'));
    expect(screen.getByText('99 XP')).toBeTruthy();
    expect(vi.mocked(loadUserDoc)).not.toHaveBeenCalled();
  });

  it('navigates between views via the nav bar', async () => {
    const user = userEvent.setup();

    vi.mocked(getAuthReady).mockResolvedValue({ uid: 'u1' } as never);
    vi.mocked(loadUserDoc).mockResolvedValue({
      stats: { xp: 250, streak: 7, lives: 4, lastActiveDate: null },
      completedLessons: [1],
      tutorModel: 'gemini-2.5-flash',
    } as never);

    render(<App />);
    await waitFor(() => screen.getByTestId('path-view'));

    const tutorButton = screen.getByText('Tutor').closest('button');
    await user.click(tutorButton!);
    expect(await screen.findByTestId('tutor-chat')).toBeTruthy();

    const ajustesButton = screen.getByText('Ajustes').closest('button');
    await user.click(ajustesButton!);
    expect(await screen.findByTestId('settings-view')).toBeTruthy();
  });
});
