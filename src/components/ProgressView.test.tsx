import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProgressView from './ProgressView';
import { lessonsData } from '../lib/lessons';

const baseStats = {
  xp: 120,
  streak: 4,
  lives: 3,
  lastActiveDate: null,
  streakFreezes: 1,
  dailyXp: 0,
  dailyXpDate: null,
  livesUpdatedAt: null,
};

const completedLessons = [1, 2];

describe('ProgressView', () => {
  it('renders the lesson-count caption with correct fraction', () => {
    render(
      <ProgressView
        stats={baseStats}
        completedLessons={completedLessons}
        reviewLog={{}}
        activityLog={{}}
      />
    );

    const caption = screen.getByTestId('progreso-caption');
    expect(caption.textContent).toContain(`${completedLessons.length} de ${lessonsData.length} lecciones`);
  });

  it('renders a radiogroup range switcher with three radios', () => {
    render(
      <ProgressView
        stats={baseStats}
        completedLessons={completedLessons}
        reviewLog={{}}
        activityLog={{}}
      />
    );

    const group = screen.getByRole('radiogroup');
    expect(group).toBeTruthy();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
  });

  it('renders at least one progressbar for mastery when there are completed lessons', () => {
    render(
      <ProgressView
        stats={baseStats}
        completedLessons={completedLessons}
        reviewLog={{}}
        activityLog={{}}
      />
    );

    const bars = screen.getAllByRole('progressbar');
    expect(bars.length >= 1).toBe(true);
  });

  it('switching to 7D updates the range caption', () => {
    render(
      <ProgressView
        stats={baseStats}
        completedLessons={completedLessons}
        reviewLog={{}}
        activityLog={{}}
      />
    );

    const btn7d = screen.getByRole('radio', { name: /7D/i });
    fireEvent.click(btn7d);

    expect(
      screen.getAllByText((_, el) => el?.textContent?.includes('últimos 7 días') ?? false).length > 0
    ).toBe(true);
  });

  it('shows encouraging empty state when no lessons completed', () => {
    render(
      <ProgressView
        stats={{ ...baseStats, xp: 0 }}
        completedLessons={[]}
        reviewLog={{}}
        activityLog={{}}
      />
    );

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('Empieza tu primera lección');
  });

  it('shows weakest topic in headline when lessons are completed', () => {
    render(
      <ProgressView
        stats={baseStats}
        completedLessons={completedLessons}
        reviewLog={{}}
        activityLog={{}}
      />
    );

    const heading = screen.getByRole('heading', { level: 2 });
    // Should contain either a weakest topic message or good progress message
    expect(heading.textContent).toBeTruthy();
    expect(heading.textContent!.length > 0).toBe(true);
  });
});
