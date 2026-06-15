import type { Exercise, Lesson } from '../types';
import type { ReviewItem } from './review';

/** Distinct session id for practice; REVIEW_SESSION_ID is -1. */
export const PRACTICE_SESSION_ID = -2;

/** XP awarded for completing a practice session. */
export const PRACTICE_XP = 15;

/** A single vocabulary target selected for a practice session. */
export interface PracticeTarget {
  key: string;
  word: string;
  translation: string;
}

/**
 * Selects the weakest vocabulary targets from the spaced-repetition queue.
 * The queue is already sorted weakest-first. Returns up to `count` distinct
 * targets mapped to PracticeTarget. Works with any vocab; due-ness is not
 * required so practice is always available when the learner has vocabulary.
 */
export function selectPracticeTargets(queue: ReviewItem[], count = 6): PracticeTarget[] {
  if (queue.length === 0) return [];
  const seen = new Set<string>();
  const result: PracticeTarget[] = [];
  for (const item of queue) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    result.push({ key: item.key, word: item.word, translation: item.translation });
    if (result.length >= count) break;
  }
  return result;
}

/**
 * Builds the POST body sent to /api/practice. Contains the target words and
 * the learner's current level so the server can scale difficulty.
 */
export function buildPracticeRequest(
  targets: PracticeTarget[],
  level: number
): { words: { word: string; translation: string }[]; level: number } {
  return {
    words: targets.map(t => ({ word: t.word, translation: t.translation })),
    level,
  };
}

/**
 * Defensively coerces an untrusted AI payload into a valid Exercise array.
 * Expected raw shape: `{ exercises: Array<{ type, instruction, questionText, options, correctAnswer }> }`.
 * Any candidate that fails validation is silently dropped. The returned array
 * is capped at 8 exercises. correctAnswer is guaranteed to be verbatim-equal
 * to a member of the returned options array, which is required by LessonRunner.
 */
export function sanitizePracticeExercises(raw: unknown): Exercise[] {
  if (typeof raw !== 'object' || raw === null) return [];
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj['exercises'])) return [];

  const candidates = obj['exercises'] as unknown[];
  const result: Exercise[] = [];

  for (const candidate of candidates) {
    if (result.length >= 8) break;
    if (typeof candidate !== 'object' || candidate === null) continue;
    const c = candidate as Record<string, unknown>;

    const type = c['type'];
    if (type !== 'multiple-choice' && type !== 'fill-blank') continue;

    const rawInstruction = c['instruction'];
    if (typeof rawInstruction !== 'string') continue;
    const instruction = rawInstruction.trim();
    if (instruction.length === 0) continue;

    const rawQuestionText = c['questionText'];
    if (typeof rawQuestionText !== 'string') continue;
    const questionText = rawQuestionText.trim();
    if (questionText.length === 0) continue;

    if (!Array.isArray(c['options'])) continue;
    const rawOptions = c['options'] as unknown[];
    // Map to strings, trim, remove empties, dedupe, keep first 4
    const seen = new Set<string>();
    const dedupedOptions: string[] = [];
    for (const opt of rawOptions) {
      const s = String(opt).trim();
      if (s.length === 0) continue;
      if (seen.has(s)) continue;
      seen.add(s);
      dedupedOptions.push(s);
      if (dedupedOptions.length >= 4) break;
    }
    if (dedupedOptions.length < 2) continue;

    const rawCorrectAnswer = c['correctAnswer'];
    if (typeof rawCorrectAnswer !== 'string') continue;
    const correctAnswer = rawCorrectAnswer.trim();
    if (correctAnswer.length === 0) continue;
    if (!dedupedOptions.includes(correctAnswer)) continue;

    result.push({
      id: `prac-${result.length}`,
      type: type as 'multiple-choice' | 'fill-blank',
      instruction,
      questionText,
      options: dedupedOptions,
      correctAnswer,
    });
  }

  return result;
}

/** Normalizes text for coverage matching: lowercase, strip accents and punctuation, collapse spaces. */
function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns the keys of the targets whose Spanish word actually appears in the
 * generated exercises (whole word, accent and case insensitive across each
 * exercise's questionText, instruction, options and correctAnswer). Only these
 * keys should be marked reviewed on completion, so a partial or drifted AI batch
 * cannot refresh weak words the learner never actually practiced.
 */
export function coveredTargetKeys(targets: PracticeTarget[], exercises: Exercise[]): string[] {
  const haystack =
    ' ' +
    exercises
      .map(e => [e.questionText, e.instruction, e.correctAnswer ?? '', ...(e.options ?? [])].join(' '))
      .map(normalizeForMatch)
      .join(' ') +
    ' ';
  const result: string[] = [];
  for (const target of targets) {
    const needle = normalizeForMatch(target.word);
    if (needle.length === 0) continue;
    if (haystack.includes(' ' + needle + ' ')) result.push(target.key);
  }
  return result;
}

/**
 * Wraps a set of AI-generated exercises into a synthetic Lesson that can be
 * passed directly to LessonRunner, matching the shape produced by buildReviewLesson.
 */
export function buildPracticeLesson(exercises: Exercise[]): Lesson {
  return {
    id: PRACTICE_SESSION_ID,
    title: 'Práctica',
    subtitle: 'Generada para ti',
    description: 'Ejercicios creados al instante para tus palabras más débiles.',
    icon: '✨',
    xpReward: PRACTICE_XP,
    exercises,
  };
}
