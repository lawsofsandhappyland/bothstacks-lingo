import type { Lesson, Exercise } from '../types';
import type { ReviewItem, VocabItem } from './review';

export const REVIEW_SESSION_ID = -1;

/** Deterministic DJB2-style hash returning a non-negative integer. */
function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Deterministically shuffles an array using a seed string.
 * Uses a Fisher-Yates shuffle driven by a LCG seeded with a hash of the seed string.
 */
function deterministicShuffle<T>(items: T[], seed: string): T[] {
  const shuffled = [...items];
  let s = hash(seed);
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Picks up to `count` distinct distractor strings from `pool`, excluding
 * the `exclude` value and any duplicates. Selection is deterministic via `seed`.
 */
function pickDistractors(pool: string[], exclude: string, count: number, seed: string): string[] {
  const candidates = [...new Set(pool.filter(p => p !== exclude))];
  const shuffled = deterministicShuffle(candidates, seed);
  return shuffled.slice(0, count);
}

/**
 * Builds a synthetic Lesson for a cross-lesson review session from a batch of
 * ReviewItems (already sorted most-overdue first) and a vocab pool for distractors.
 * Exercises alternate direction: even index = ES→EN, odd index = EN→ES.
 */
export function buildReviewLesson(items: ReviewItem[], vocabPool: VocabItem[]): Lesson {
  const exercises: Exercise[] = items.map((item, index) => {
    const isEvenIndex = index % 2 === 0;
    const seed = `${item.key}:${index}`;

    let instruction: string;
    let questionText: string;
    let correctAnswer: string;
    let distractorPool: string[];

    if (isEvenIndex) {
      // ES → EN
      instruction = '¿Qué significa en inglés?';
      questionText = item.word;
      correctAnswer = item.translation;
      distractorPool = vocabPool.map(v => v.translation);
    } else {
      // EN → ES
      instruction = '¿Cómo se dice en español?';
      questionText = item.translation;
      correctAnswer = item.word;
      distractorPool = vocabPool.map(v => v.word);
    }

    const distractors = pickDistractors(distractorPool, correctAnswer, 2, seed);
    const options = deterministicShuffle([correctAnswer, ...distractors], seed + ':opts');

    const exercise: Exercise = {
      id: `rev-${index}`,
      type: 'multiple-choice',
      instruction,
      questionText,
      options,
      correctAnswer,
    };

    return exercise;
  });

  return {
    id: REVIEW_SESSION_ID,
    title: 'Repaso',
    subtitle: 'Memoria fresca',
    description: 'Un repaso rápido de las palabras que se están enfriando.',
    icon: '🧠',
    xpReward: 10,
    exercises,
  };
}
