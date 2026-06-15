import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { getAuthReady } from './lib/firebase';
import { loadUserDoc, saveUserDoc } from './lib/persistence';
import { onboardingSlides } from './lib/onboardingSlides';
import { LIFE_REGEN_MS } from './lib/progress';

vi.mock('./components/PathView', () => ({ default: () => <div data-testid="path-view" /> }));
vi.mock('./components/LessonRunner', () => ({ default: () => <div data-testid="lesson-runner" /> }));
vi.mock('./components/TutorChat', () => ({ default: () => <div data-testid="tutor-chat" /> }));
vi.mock('./components/SettingsView', () => ({ default: () => <div data-testid="settings-view" /> }));
vi.mock('./components/AchievementsView', () => ({ default: () => <div data-testid="achievements-view" /> }));
vi.mock('./components/ProgressView', () => ({ default: () => <div data-testid="progress-view" /> }));
vi.mock('./components/ReviewView', () => ({ default: () => <div data-testid="review-view" /> }));
vi.mock('./components/PracticeView', () => ({ default: () => <div data-testid="practice-view" /> }));

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
  localStorage.setItem('bothlingo_onboarded', 'true');
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
    await screen.findByTestId('path-view');
    expect(screen.getByText('250 XP')).toBeTruthy();
  });

  it('falls back to localStorage when auth returns null', async () => {
    localStorage.setItem('bothlingo_stats', JSON.stringify({ xp: 99, streak: 2, lives: 5, lastActiveDate: null }));
    localStorage.setItem('bothlingo_completed_lessons', '[]');
    localStorage.setItem('bothlingo_tutor_model', 'gemini-2.5-flash');

    vi.mocked(getAuthReady).mockResolvedValue(null);

    render(<App />);
    await screen.findByTestId('path-view');
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
    await screen.findByTestId('path-view');

    const tutorButton = screen.getByText('Tutor').closest('button');
    await user.click(tutorButton!);
    expect(await screen.findByTestId('tutor-chat')).toBeTruthy();

    const ajustesButton = screen.getByText('Ajustes').closest('button');
    await user.click(ajustesButton!);
    expect(await screen.findByTestId('settings-view')).toBeTruthy();
  });

  it('navigates to progress view via the Progreso nav button', async () => {
    const user = userEvent.setup();

    vi.mocked(getAuthReady).mockResolvedValue({ uid: 'u1' } as never);
    vi.mocked(loadUserDoc).mockResolvedValue({
      stats: { xp: 0, streak: 0, lives: 5, lastActiveDate: null },
      completedLessons: [],
      tutorModel: 'gemini-2.5-flash',
    } as never);

    render(<App />);
    await screen.findByTestId('path-view');

    const progresoButton = screen.getByText('Progreso').closest('button');
    await user.click(progresoButton!);
    expect(await screen.findByTestId('progress-view')).toBeTruthy();
  });

  it('shows onboarding overlay on first run', async () => {
    localStorage.removeItem('bothlingo_onboarded');

    vi.mocked(getAuthReady).mockResolvedValue({ uid: 'u1' } as never);
    vi.mocked(loadUserDoc).mockResolvedValue({
      stats: { xp: 0, streak: 0, lives: 5, lastActiveDate: null },
      completedLessons: [],
      tutorModel: 'gemini-2.5-flash',
    } as never);

    render(<App />);
    await screen.findByTestId('path-view');

    expect(screen.getByText(onboardingSlides[0].title)).toBeTruthy();
  });

  it('renders a skip link and a main region with id main-content', async () => {
    vi.mocked(getAuthReady).mockResolvedValue({ uid: 'u1' } as never);
    vi.mocked(loadUserDoc).mockResolvedValue({
      stats: { xp: 0, streak: 0, lives: 5, lastActiveDate: null },
      completedLessons: [],
      tutorModel: 'gemini-2.5-flash',
    } as never);

    render(<App />);
    await screen.findByTestId('path-view');

    expect(screen.getByText('Skip to content')).toBeTruthy();
    expect(document.getElementById('main-content')).not.toBeNull();
  });

  it('regenerates lives from an old livesUpdatedAt on load', async () => {
    const oldAnchor = Date.now() - 5 * LIFE_REGEN_MS;

    vi.mocked(getAuthReady).mockResolvedValue({ uid: 'u1' } as never);
    vi.mocked(loadUserDoc).mockResolvedValue({
      stats: { xp: 0, streak: 0, lives: 1, lastActiveDate: null, livesUpdatedAt: oldAnchor },
      completedLessons: [],
      tutorModel: 'gemini-2.5-flash',
    } as never);

    render(<App />);
    await screen.findByTestId('path-view');
    expect(within(screen.getByTitle('Hearts Remaining')).getByText('5')).toBeTruthy();
  });

  it('navigates to repaso view via the Repaso nav button', async () => {
    const user = userEvent.setup();

    vi.mocked(getAuthReady).mockResolvedValue({ uid: 'u1' } as never);
    vi.mocked(loadUserDoc).mockResolvedValue({
      stats: { xp: 0, streak: 0, lives: 5, lastActiveDate: null },
      completedLessons: [],
      tutorModel: 'gemini-2.5-flash',
    } as never);

    render(<App />);
    await screen.findByTestId('path-view');

    const repasoButton = screen.getByText('Repaso').closest('button');
    await user.click(repasoButton!);
    expect(await screen.findByTestId('review-view')).toBeTruthy();
  });
});
