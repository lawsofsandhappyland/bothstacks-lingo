import { describe, it, expect } from 'vitest';
import {
  selectPracticeTargets,
  sanitizePracticeExercises,
  buildPracticeRequest,
  buildPracticeLesson,
  coveredTargetKeys,
  PRACTICE_SESSION_ID,
  PRACTICE_XP,
} from './practice';
import type { ReviewItem } from './review';
import type { Exercise } from '../types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<ReviewItem> & { key: string; word: string; translation: string }): ReviewItem {
  return {
    lessonId: 1,
    lessonRef: 'L1·1',
    memoryStrength: 50,
    lastPracticedDaysAgo: 3,
    due: true,
    ...overrides,
  };
}

const itemA = makeItem({ key: '1:hola', word: 'hola', translation: 'hello', memoryStrength: 10 });
const itemB = makeItem({ key: '1:cafe', word: 'café', translation: 'coffee', memoryStrength: 20 });
const itemC = makeItem({ key: '1:gato', word: 'gato', translation: 'cat', memoryStrength: 30 });
const itemD = makeItem({ key: '1:perro', word: 'perro', translation: 'dog', memoryStrength: 40 });
const itemE = makeItem({ key: '1:agua', word: 'agua', translation: 'water', memoryStrength: 50 });
const itemF = makeItem({ key: '1:libro', word: 'libro', translation: 'book', memoryStrength: 60 });
const itemG = makeItem({ key: '1:mesa', word: 'mesa', translation: 'table', memoryStrength: 70 });

const fullQueue: ReviewItem[] = [itemA, itemB, itemC, itemD, itemE, itemF, itemG];

// ---------------------------------------------------------------------------
// selectPracticeTargets
// ---------------------------------------------------------------------------

describe('selectPracticeTargets', () => {
  it('returns the first count items mapped to PracticeTarget preserving order', () => {
    const targets = selectPracticeTargets(fullQueue, 3);
    expect(targets).toHaveLength(3);
    expect(targets[0]).toEqual({ key: '1:hola', word: 'hola', translation: 'hello' });
    expect(targets[1]).toEqual({ key: '1:cafe', word: 'café', translation: 'coffee' });
    expect(targets[2]).toEqual({ key: '1:gato', word: 'gato', translation: 'cat' });
  });

  it('returns all items when queue has fewer than count', () => {
    const tiny = [itemA, itemB];
    const targets = selectPracticeTargets(tiny, 6);
    expect(targets).toHaveLength(2);
  });

  it('returns [] for an empty queue', () => {
    expect(selectPracticeTargets([], 6)).toEqual([]);
  });

  it('result entries have only key, word, translation', () => {
    const targets = selectPracticeTargets(fullQueue, 2);
    for (const t of targets) {
      expect(Object.keys(t).sort()).toEqual(['key', 'translation', 'word']);
    }
  });

  it('deduplicates by key', () => {
    const queueWithDupe: ReviewItem[] = [itemA, itemA, itemB];
    const targets = selectPracticeTargets(queueWithDupe, 6);
    const keys = targets.map(t => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(targets).toHaveLength(2);
  });

  it('respects default count of 6', () => {
    const targets = selectPracticeTargets(fullQueue);
    expect(targets).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// sanitizePracticeExercises
// ---------------------------------------------------------------------------

const validMultipleChoice = {
  type: 'multiple-choice',
  instruction: '¿Cómo se dice?',
  questionText: 'hello',
  options: ['hola', 'gato', 'café'],
  correctAnswer: 'hola',
};

const validFillBlank = {
  type: 'fill-blank',
  instruction: 'Completa la frase.',
  questionText: 'Quiero un _____ con leche.',
  options: ['café', 'libro', 'mesa'],
  correctAnswer: 'café',
};

describe('sanitizePracticeExercises', () => {
  it('happy path: keeps valid multiple-choice and fill-blank, assigns prac-0, prac-1', () => {
    const raw = { exercises: [validMultipleChoice, validFillBlank] };
    const result = sanitizePracticeExercises(raw);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('prac-0');
    expect(result[0].type).toBe('multiple-choice');
    expect(result[1].id).toBe('prac-1');
    expect(result[1].type).toBe('fill-blank');
  });

  it('drops items with wrong type', () => {
    const raw = {
      exercises: [
        { ...validMultipleChoice, type: 'matching' },
        validFillBlank,
      ],
    };
    const result = sanitizePracticeExercises(raw);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('fill-blank');
  });

  it('drops when correctAnswer is not among options', () => {
    const raw = {
      exercises: [{ ...validMultipleChoice, correctAnswer: 'perro' }],
    };
    expect(sanitizePracticeExercises(raw)).toHaveLength(0);
  });

  it('drops when fewer than 2 distinct options remain', () => {
    const raw = {
      exercises: [{ ...validMultipleChoice, options: ['hola'] }],
    };
    expect(sanitizePracticeExercises(raw)).toHaveLength(0);
  });

  it('trims whitespace on options, correctAnswer, instruction, questionText', () => {
    const raw = {
      exercises: [
        {
          type: 'multiple-choice',
          instruction: '  ¿Cómo se dice?  ',
          questionText: '  hello  ',
          options: ['  hola  ', '  gato  ', '  café  '],
          correctAnswer: '  hola  ',
        },
      ],
    };
    const result = sanitizePracticeExercises(raw);
    expect(result).toHaveLength(1);
    expect(result[0].instruction).toBe('¿Cómo se dice?');
    expect(result[0].questionText).toBe('hello');
    expect(result[0].options).toEqual(['hola', 'gato', 'café']);
    expect(result[0].correctAnswer).toBe('hola');
  });

  it('deduplicates duplicate options', () => {
    const raw = {
      exercises: [
        {
          ...validMultipleChoice,
          options: ['hola', 'hola', 'gato', 'café'],
          correctAnswer: 'hola',
        },
      ],
    };
    const result = sanitizePracticeExercises(raw);
    expect(result).toHaveLength(1);
    const opts = result[0].options ?? [];
    expect(new Set(opts).size).toBe(opts.length);
  });

  it('when more than 4 distinct options given keeps only first 4', () => {
    const raw = {
      exercises: [
        {
          type: 'multiple-choice',
          instruction: 'Test',
          questionText: 'hello',
          options: ['hola', 'gato', 'café', 'mesa', 'agua'],
          correctAnswer: 'hola',
        },
      ],
    };
    const result = sanitizePracticeExercises(raw);
    expect(result).toHaveLength(1);
    expect(result[0].options).toHaveLength(4);
    expect(result[0].options).toEqual(['hola', 'gato', 'café', 'mesa']);
  });

  it('drops exercise when correctAnswer is not among first 4 kept options', () => {
    const raw = {
      exercises: [
        {
          type: 'multiple-choice',
          instruction: 'Test',
          questionText: 'water',
          options: ['hola', 'gato', 'café', 'mesa', 'agua'],
          correctAnswer: 'agua',
        },
      ],
    };
    expect(sanitizePracticeExercises(raw)).toHaveLength(0);
  });

  it('keeps exercise when correctAnswer IS among first 4 kept options (5-option case)', () => {
    const raw = {
      exercises: [
        {
          type: 'multiple-choice',
          instruction: 'Test',
          questionText: 'water',
          options: ['hola', 'gato', 'café', 'agua', 'mesa'],
          correctAnswer: 'agua',
        },
      ],
    };
    const result = sanitizePracticeExercises(raw);
    expect(result).toHaveLength(1);
    expect(result[0].options).toEqual(['hola', 'gato', 'café', 'agua']);
    expect(result[0].correctAnswer).toBe('agua');
  });

  it('caps total exercises at 8', () => {
    const many = Array.from({ length: 12 }, () => ({ ...validMultipleChoice }));
    const result = sanitizePracticeExercises({ exercises: many });
    expect(result).toHaveLength(8);
  });

  it('ids are stable 0-based indices in the output array', () => {
    const raw = {
      exercises: [
        { ...validMultipleChoice, type: 'matching' }, // dropped
        validMultipleChoice,
        validFillBlank,
      ],
    };
    const result = sanitizePracticeExercises(raw);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('prac-0');
    expect(result[1].id).toBe('prac-1');
  });

  it('returns [] for non-object input', () => {
    expect(sanitizePracticeExercises(null)).toEqual([]);
    expect(sanitizePracticeExercises(42)).toEqual([]);
    expect(sanitizePracticeExercises('string')).toEqual([]);
  });

  it('returns [] for missing exercises array', () => {
    expect(sanitizePracticeExercises({})).toEqual([]);
    expect(sanitizePracticeExercises({ exercises: null })).toEqual([]);
  });

  it('returns [] for { exercises: "nope" }', () => {
    expect(sanitizePracticeExercises({ exercises: 'nope' })).toEqual([]);
  });

  it('correctAnswer in result is verbatim-equal to a member of options', () => {
    const raw = { exercises: [validMultipleChoice, validFillBlank] };
    const result = sanitizePracticeExercises(raw);
    for (const ex of result) {
      expect(ex.options).toContain(ex.correctAnswer);
    }
  });
});

// ---------------------------------------------------------------------------
// buildPracticeRequest
// ---------------------------------------------------------------------------

describe('buildPracticeRequest', () => {
  it('shapes { words, level } correctly', () => {
    const targets = selectPracticeTargets(fullQueue, 3);
    const req = buildPracticeRequest(targets, 5);
    expect(req).toEqual({
      words: [
        { word: 'hola', translation: 'hello' },
        { word: 'café', translation: 'coffee' },
        { word: 'gato', translation: 'cat' },
      ],
      level: 5,
    });
  });

  it('returns empty words array for empty targets', () => {
    expect(buildPracticeRequest([], 1)).toEqual({ words: [], level: 1 });
  });
});

// ---------------------------------------------------------------------------
// buildPracticeLesson
// ---------------------------------------------------------------------------

describe('buildPracticeLesson', () => {
  it('id === PRACTICE_SESSION_ID', () => {
    const lesson = buildPracticeLesson([]);
    expect(lesson.id).toBe(PRACTICE_SESSION_ID);
    expect(PRACTICE_SESSION_ID).toBe(-2);
  });

  it('xpReward === PRACTICE_XP', () => {
    const lesson = buildPracticeLesson([]);
    expect(lesson.xpReward).toBe(PRACTICE_XP);
    expect(PRACTICE_XP).toBe(15);
  });

  it('title is Práctica', () => {
    const lesson = buildPracticeLesson([]);
    expect(lesson.title).toBe('Práctica');
  });

  it('passes exercises through unchanged', () => {
    const raw = { exercises: [validMultipleChoice] };
    const exercises = sanitizePracticeExercises(raw);
    const lesson = buildPracticeLesson(exercises);
    expect(lesson.exercises).toBe(exercises);
  });
});

// ---------------------------------------------------------------------------
// coveredTargetKeys
// ---------------------------------------------------------------------------

function makeExercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: 'prac-0',
    type: 'multiple-choice',
    instruction: 'Elige',
    questionText: '',
    options: [],
    correctAnswer: '',
    ...overrides,
  };
}

describe('coveredTargetKeys', () => {
  const targets = [
    { key: '1:hola', word: 'hola', translation: 'hello' },
    { key: '1:cafe', word: 'café', translation: 'coffee' },
    { key: '1:gato', word: 'gato', translation: 'cat' },
  ];

  it('returns only the keys whose word appears in the exercises', () => {
    const exercises = [
      makeExercise({ questionText: 'hello', options: ['hola', 'perro', 'mesa'], correctAnswer: 'hola' }),
    ];
    expect(coveredTargetKeys(targets, exercises)).toEqual(['1:hola']);
  });

  it('matches accent and case insensitively', () => {
    const exercises = [
      makeExercise({ questionText: 'Quiero un CAFE.', options: ['CAFE', 'libro'], correctAnswer: 'CAFE' }),
    ];
    expect(coveredTargetKeys(targets, exercises)).toEqual(['1:cafe']);
  });

  it('finds the word across questionText, instruction, options and correctAnswer', () => {
    const exercises = [
      makeExercise({ instruction: 'Traduce gato', questionText: 'cat', options: ['perro', 'mesa'], correctAnswer: 'perro' }),
    ];
    expect(coveredTargetKeys(targets, exercises)).toEqual(['1:gato']);
  });

  it('returns multiple keys when several targets are covered', () => {
    const exercises = [
      makeExercise({ questionText: 'hola', options: ['hola', 'gato'], correctAnswer: 'hola' }),
      makeExercise({ questionText: 'un café', options: ['café', 'libro'], correctAnswer: 'café' }),
    ];
    expect(coveredTargetKeys(targets, exercises).sort()).toEqual(['1:cafe', '1:gato', '1:hola']);
  });

  it('returns [] when no target word appears', () => {
    const exercises = [
      makeExercise({ questionText: 'perro', options: ['perro', 'mesa'], correctAnswer: 'perro' }),
    ];
    expect(coveredTargetKeys(targets, exercises)).toEqual([]);
  });

  it('does not match a word that only appears as a substring of another word', () => {
    const wordTargets = [{ key: '1:red', word: 'red', translation: 'network' }];
    const exercises = [
      makeExercise({ questionText: 'la pared es alta', options: ['pared', 'mesa'], correctAnswer: 'pared' }),
    ];
    expect(coveredTargetKeys(wordTargets, exercises)).toEqual([]);
  });

  it('returns [] for no exercises', () => {
    expect(coveredTargetKeys(targets, [])).toEqual([]);
  });
});
