import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PathView from './PathView';
import type { Lesson, UserStats } from '../types';

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

beforeEach(() => vi.clearAllMocks());

const lessons: Lesson[] = [
  {
    id: 1,
    title: 'Saludos',
    subtitle: 'Greetings',
    description: 'Learn how to greet people in Spanish.',
    xpReward: 10,
    icon: '👋',
    exercises: [],
  },
  {
    id: 2,
    title: 'Comida',
    subtitle: 'Food',
    description: 'Discover Spanish words for food and drink.',
    xpReward: 20,
    icon: '🍎',
    exercises: [],
  },
  {
    id: 3,
    title: 'Familia',
    subtitle: 'Family',
    description: 'Learn Spanish words for family members.',
    xpReward: 30,
    icon: '👨‍👩‍👧',
    exercises: [],
  },
];

const defaultStats: UserStats = {
  xp: 0,
  streak: 1,
  lives: 5,
  lastActiveDate: null,
};

describe('PathView — progress count', () => {
  it('renders completed lesson count with correct fraction', () => {
    render(
      <PathView
        lessons={lessons}
        stats={defaultStats}
        completedLessons={[1]}
        onStartLesson={vi.fn()}
      />
    );
    expect(screen.getByText('1 / 3 Lessons')).toBeDefined();
  });
});

describe('PathView — lesson nodes', () => {
  it('renders a node button for every lesson', () => {
    render(
      <PathView
        lessons={lessons}
        stats={defaultStats}
        completedLessons={[]}
        onStartLesson={vi.fn()}
      />
    );
    expect(screen.getByTitle('Saludos')).toBeDefined();
    expect(screen.getByTitle('Comida')).toBeDefined();
    expect(screen.getByTitle('Familia')).toBeDefined();
  });

  it('renders label spans for each lesson title', () => {
    render(
      <PathView
        lessons={lessons}
        stats={defaultStats}
        completedLessons={[]}
        onStartLesson={vi.fn()}
      />
    );
    expect(screen.getByText('Saludos')).toBeDefined();
    expect(screen.getByText('Comida')).toBeDefined();
    expect(screen.getByText('Familia')).toBeDefined();
  });
});

describe('PathView — popover interaction with lives', () => {
  it('clicking first lesson node opens the popover showing description and START LESSON button', async () => {
    render(
      <PathView
        lessons={lessons}
        stats={{ ...defaultStats, lives: 5 }}
        completedLessons={[]}
        onStartLesson={vi.fn()}
      />
    );
    await userEvent.click(screen.getByTitle('Saludos'));
    expect(screen.getByText('Learn how to greet people in Spanish.')).toBeDefined();
    expect(screen.getByText('START LESSON')).toBeDefined();
  });

  it('clicking START LESSON calls onStart with lesson id 1', async () => {
    const onStart = vi.fn();
    render(
      <PathView
        lessons={lessons}
        stats={{ ...defaultStats, lives: 5 }}
        completedLessons={[]}
        onStartLesson={onStart}
      />
    );
    await userEvent.click(screen.getByTitle('Saludos'));
    await userEvent.click(screen.getByText('START LESSON'));
    expect(onStart).toHaveBeenCalledWith(1);
  });

  it('with lives 0 the start button shows REQUIRES LIVES and is disabled', async () => {
    render(
      <PathView
        lessons={lessons}
        stats={{ ...defaultStats, lives: 0 }}
        completedLessons={[]}
        onStartLesson={vi.fn()}
      />
    );
    await userEvent.click(screen.getByTitle('Saludos'));
    const btn = screen.getByText('REQUIRES LIVES') as HTMLButtonElement;
    expect(btn).toBeDefined();
    expect(btn.disabled).toBe(true);
  });

  it('with lives 0 clicking REQUIRES LIVES does NOT call onStart', async () => {
    const onStart = vi.fn();
    render(
      <PathView
        lessons={lessons}
        stats={{ ...defaultStats, lives: 0 }}
        completedLessons={[]}
        onStartLesson={onStart}
      />
    );
    await userEvent.click(screen.getByTitle('Saludos'));
    await userEvent.click(screen.getByText('REQUIRES LIVES'));
    expect(onStart).not.toHaveBeenCalled();
  });
});

describe('PathView — locked lesson', () => {
  it('clicking a locked lesson node does NOT open a popover', async () => {
    render(
      <PathView
        lessons={lessons}
        stats={{ ...defaultStats, lives: 5 }}
        completedLessons={[]}
        onStartLesson={vi.fn()}
      />
    );
    // Familia (id 3) is locked because Comida (id 2) is not completed
    await userEvent.click(screen.getByTitle('Familia'));
    expect(screen.queryByText('Learn Spanish words for family members.')).toBeNull();
  });
});

describe('PathView — daily goal', () => {
  it('shows daily goal progress and progressbar when dailyXp is set for today', () => {
    const todayStr = new Date().toDateString();
    render(
      <PathView
        lessons={lessons}
        stats={{ ...defaultStats, dailyXp: 20, dailyXpDate: todayStr }}
        completedLessons={[]}
        onStartLesson={vi.fn()}
      />
    );
    expect(screen.getByText('20/30 XP')).toBeDefined();
    expect(screen.getByRole('progressbar')).toBeDefined();
  });
});
