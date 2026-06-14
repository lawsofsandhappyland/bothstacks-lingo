import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LessonRunner from './LessonRunner';
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

// Mock canvas context for confetti
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    save: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillRect: vi.fn(),
    restore: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const multiChoiceLesson: Lesson = {
  id: 1,
  title: 'Test Lesson',
  subtitle: 'Testing',
  description: 'A test lesson',
  xpReward: 10,
  icon: '🧪',
  exercises: [
    {
      id: 'test-q1',
      type: 'multiple-choice',
      instruction: 'Pick the right one',
      questionText: 'What is 2+2?',
      options: ['3', '4', '5'],
      correctAnswer: '4',
    },
  ],
};

const matchingLesson: Lesson = {
  id: 2,
  title: 'Matching',
  subtitle: 'Pairs',
  description: 'Match pairs',
  xpReward: 15,
  icon: '🔗',
  exercises: [
    {
      id: 'match-q1',
      type: 'matching',
      instruction: 'Match them',
      questionText: 'Match pairs',
      leftPairs: ['hola', 'café'],
      rightPairs: ['coffee', 'hello'],
      matchingMap: { hola: 'hello', café: 'coffee' },
    },
  ],
};

const wordBankLesson: Lesson = {
  id: 3,
  title: 'Word Bank',
  subtitle: 'Build sentences',
  description: 'Word bank exercise',
  xpReward: 20,
  icon: '📝',
  exercises: [
    {
      id: 'wb-q1',
      type: 'word-bank',
      instruction: 'Build the sentence',
      questionText: 'I like coffee',
      englishPhrase: 'Me gusta el café',
      wordBank: ['Me', 'gusta', 'el', 'café'],
      correctWordOrder: ['Me', 'gusta', 'el', 'café.'],
    },
  ],
};

const fillBlankLesson: Lesson = {
  id: 4,
  title: 'Fill Blank',
  subtitle: 'Complete',
  description: 'Fill the blank',
  xpReward: 5,
  icon: '✍️',
  exercises: [
    {
      id: 'fb-q1',
      type: 'fill-blank',
      instruction: 'Fill it in',
      questionText: 'Yo quiero un _______',
      options: ['código', 'café', 'servidor'],
      correctAnswer: 'café',
    },
  ],
};

const defaultStats: UserStats = {
  xp: 0,
  streak: 1,
  lives: 5,
  lastActiveDate: null,
};

const baseProps = {
  stats: defaultStats,
  onLessonComplete: vi.fn(),
  onLoseLife: vi.fn(),
  onQuit: vi.fn(),
};

describe('LessonRunner — rendering', () => {
  it('renders the lesson title and quit button', () => {
    render(<LessonRunner lesson={multiChoiceLesson} {...baseProps} />);
    expect(screen.getByText('✕ QUIT')).toBeDefined();
    expect(screen.getByText('Pick the right one')).toBeDefined();
  });

  it('renders question text', () => {
    render(<LessonRunner lesson={multiChoiceLesson} {...baseProps} />);
    expect(screen.getByText('What is 2+2?')).toBeDefined();
  });

  it('renders all multiple-choice options', () => {
    render(<LessonRunner lesson={multiChoiceLesson} {...baseProps} />);
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('4')).toBeDefined();
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(2); // option text + lives count
  });

  it('CHECK ANSWER button is disabled until an option is selected', () => {
    render(<LessonRunner lesson={multiChoiceLesson} {...baseProps} />);
    const checkBtn = screen.getByText('CHECK ANSWER');
    expect((checkBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders hearts count', () => {
    render(<LessonRunner lesson={multiChoiceLesson} {...baseProps} />);
    const heartsElements = screen.getAllByText('5');
    expect(heartsElements.length).toBeGreaterThanOrEqual(2); // lives count + option
  });
});

describe('LessonRunner — multiple choice', () => {
  it('enables CHECK ANSWER after selecting an option', async () => {
    render(<LessonRunner lesson={multiChoiceLesson} {...baseProps} />);
    await userEvent.click(screen.getByText('4'));
    const checkBtn = screen.getByText('CHECK ANSWER');
    expect((checkBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows correct feedback for right answer', async () => {
    render(<LessonRunner lesson={multiChoiceLesson} {...baseProps} />);
    await userEvent.click(screen.getByText('4'));
    await userEvent.click(screen.getByText('CHECK ANSWER'));
    expect(screen.getByText('¡CORRECTO!')).toBeDefined();
  });

  it('shows incorrect feedback for wrong answer', async () => {
    render(<LessonRunner lesson={multiChoiceLesson} {...baseProps} />);
    await userEvent.click(screen.getByText('3'));
    await userEvent.click(screen.getByText('CHECK ANSWER'));
    expect(screen.getByText('¡INCORRECTO!')).toBeDefined();
  });

  it('calls onLoseLife for wrong answer', async () => {
    const onLoseLife = vi.fn();
    render(
      <LessonRunner
        lesson={multiChoiceLesson}
        stats={defaultStats}
        onLessonComplete={vi.fn()}
        onLoseLife={onLoseLife}
        onQuit={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText('3'));
    await userEvent.click(screen.getByText('CHECK ANSWER'));
    expect(onLoseLife).toHaveBeenCalled();
  });
});

describe('LessonRunner — matching', () => {
  it('renders left and right word columns', () => {
    render(<LessonRunner lesson={matchingLesson} {...baseProps} />);
    expect(screen.getByText('Spanish')).toBeDefined();
    expect(screen.getByText('English')).toBeDefined();
  });

  it('renders all left pair words', () => {
    render(<LessonRunner lesson={matchingLesson} {...baseProps} />);
    expect(screen.getByText('hola')).toBeDefined();
    expect(screen.getByText('café')).toBeDefined();
  });

  it('shows MATCH ALL PAIRS button', () => {
    render(<LessonRunner lesson={matchingLesson} {...baseProps} />);
    expect(screen.getByText('MATCH ALL PAIRS')).toBeDefined();
  });

  it('penalises incorrect match', async () => {
    const onLoseLife = vi.fn();
    render(
      <LessonRunner
        lesson={matchingLesson}
        stats={defaultStats}
        onLessonComplete={vi.fn()}
        onLoseLife={onLoseLife}
        onQuit={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText('hola'));
    await userEvent.click(screen.getByText('coffee')); // wrong! hola -> hello, not coffee
    expect(onLoseLife).toHaveBeenCalled();
  });
});

describe('LessonRunner — word bank', () => {
  it('renders word pills from the bank', () => {
    render(<LessonRunner lesson={wordBankLesson} {...baseProps} />);
    expect(screen.getByText('Me')).toBeDefined();
    expect(screen.getByText('gusta')).toBeDefined();
    expect(screen.getByText('el')).toBeDefined();
    expect(screen.getByText('café')).toBeDefined();
  });

  it('adds word to arranged area when clicked', async () => {
    render(<LessonRunner lesson={wordBankLesson} {...baseProps} />);
    await userEvent.click(screen.getByText('Me'));
    // Word should appear in the arrangement area (there may be two renders — one in bank, one in arrangement)
    const arrangedWords = screen.getAllByText('Me');
    expect(arrangedWords.length).toBeGreaterThanOrEqual(2);
  });

  it('enables CHECK ANSWER when words are arranged', async () => {
    render(<LessonRunner lesson={wordBankLesson} {...baseProps} />);
    await userEvent.click(screen.getByText('Me'));
    const checkBtn = screen.getByText('CHECK ANSWER');
    expect((checkBtn as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('LessonRunner — fill-blank', () => {
  it('renders fill-blank options', () => {
    render(<LessonRunner lesson={fillBlankLesson} {...baseProps} />);
    expect(screen.getByText('código')).toBeDefined();
    expect(screen.getByText('café')).toBeDefined();
    expect(screen.getByText('servidor')).toBeDefined();
  });
});

describe('LessonRunner — lives and failure', () => {
  it('shows lesson failed screen when last life is lost', async () => {
    const oneLifeStats: UserStats = { ...defaultStats, lives: 1 };
    render(
      <LessonRunner
        lesson={multiChoiceLesson}
        stats={oneLifeStats}
        onLessonComplete={vi.fn()}
        onLoseLife={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText('3'));
    await userEvent.click(screen.getByText('CHECK ANSWER'));
    expect(screen.getByText('¡SE TERMINARON LAS VIDAS!')).toBeDefined();
  });

  it('RETURN TO PATH button calls onQuit', async () => {
    const onQuit = vi.fn();
    const oneLifeStats: UserStats = { ...defaultStats, lives: 1 };
    render(
      <LessonRunner
        lesson={multiChoiceLesson}
        stats={oneLifeStats}
        onLessonComplete={vi.fn()}
        onLoseLife={vi.fn()}
        onQuit={onQuit}
      />
    );
    await userEvent.click(screen.getByText('3'));
    await userEvent.click(screen.getByText('CHECK ANSWER'));
    await userEvent.click(screen.getByText('RETURN TO PATH'));
    expect(onQuit).toHaveBeenCalled();
  });
});
