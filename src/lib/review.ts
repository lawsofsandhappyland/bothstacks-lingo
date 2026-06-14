import type { Lesson } from '../types';

export type ReviewLog = Record<string, number>; // wordKey -> last-reviewed epoch ms

export const REVIEW_HALFLIFE_DAYS = 7;   // memory strength halves every 7 days
export const DUE_THRESHOLD = 70;         // strength below this (0-100) => due for review

export interface VocabItem {
  key: string;
  word: string;
  translation: string;
  lessonId: number;
  lessonRef: string;
}

export interface ReviewItem extends VocabItem {
  memoryStrength: number;
  lastPracticedDaysAgo: number;
  due: boolean;
}

export interface LessonDue {
  lessonId: number;
  title: string;
  icon: string;
  dueCount: number;
  caughtUp: boolean;
}

/** Returns a stable string key for a word in a given lesson. */
export function wordKey(lessonId: number, word: string): string {
  return `${lessonId}:${word}`;
}

/**
 * Collects all vocabulary items from completed lessons, sourcing words and
 * translations from `matchingMap` exercises. Items are deduplicated by key;
 * first occurrence wins.
 */
export function collectVocab(completedLessons: number[], lessons: Lesson[]): VocabItem[] {
  const seen = new Set<string>();
  const result: VocabItem[] = [];

  for (const lesson of lessons) {
    if (!completedLessons.includes(lesson.id)) continue;

    let pos = 0;
    for (const exercise of lesson.exercises) {
      if (!exercise.matchingMap) continue;
      for (const [word, translation] of Object.entries(exercise.matchingMap)) {
        const key = wordKey(lesson.id, word);
        if (seen.has(key)) continue;
        seen.add(key);
        pos += 1;
        const lessonRef = `L${lesson.id}·${pos}`;
        result.push({ key, word, translation, lessonId: lesson.id, lessonRef });
      }
    }
  }

  return result;
}

/** Deterministic DJB2-style hash returning a non-negative integer. */
function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Returns a memory strength value (0-100) for a word given how many days
 * ago it was last practiced, using an exponential decay with a half-life of
 * `REVIEW_HALFLIFE_DAYS`.
 */
export function memoryStrength(ageDays: number): number {
  return Math.max(0, Math.min(100, Math.round(100 * Math.pow(0.5, ageDays / REVIEW_HALFLIFE_DAYS))));
}

/** Computes effective age in days for a vocab item, using review log if present,
 *  otherwise synthesising a deterministic baseline from lesson staleness. */
function effectiveAgeDays(
  item: VocabItem,
  completedLessons: number[],
  reviewLog: ReviewLog,
  now: Date
): number {
  if (typeof reviewLog[item.key] === 'number') {
    return Math.max(0, (now.getTime() - reviewLog[item.key]) / 86400000);
  }
  if (completedLessons.length === 0) return 0;
  const maxCompleted = Math.max(...completedLessons);
  const staleness = maxCompleted - item.lessonId;
  const variance = hash(item.key) % 7;
  return 2 + staleness * 2 + variance;
}

/**
 * Builds the full spaced-repetition review queue for the completed lessons,
 * sorted ascending by memory strength (weakest first). Ties broken by
 * lastPracticedDaysAgo descending, then key ascending.
 */
export function buildReviewQueue(
  completedLessons: number[],
  lessons: Lesson[],
  reviewLog: ReviewLog,
  now: Date = new Date()
): ReviewItem[] {
  const vocab = collectVocab(completedLessons, lessons);

  const items: ReviewItem[] = vocab.map((item) => {
    const ageDays = effectiveAgeDays(item, completedLessons, reviewLog, now);
    const strength = memoryStrength(ageDays);
    const lastPracticedDaysAgo = Math.round(ageDays);
    const due = strength < DUE_THRESHOLD;
    return { ...item, memoryStrength: strength, lastPracticedDaysAgo, due };
  });

  items.sort((a, b) => {
    if (a.memoryStrength !== b.memoryStrength) return a.memoryStrength - b.memoryStrength;
    if (b.lastPracticedDaysAgo !== a.lastPracticedDaysAgo) return b.lastPracticedDaysAgo - a.lastPracticedDaysAgo;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });

  return items;
}

/** Returns only the items in the queue that are due for review. */
export function dueItems(queue: ReviewItem[]): ReviewItem[] {
  return queue.filter((i) => i.due);
}

/** Returns the count of items in the queue that are due for review. */
export function dueCount(queue: ReviewItem[]): number {
  return dueItems(queue).length;
}

/**
 * Returns one `LessonDue` summary per completed lesson (in lessons order).
 * Lessons with no matching vocabulary are omitted.
 */
export function perLessonDue(
  completedLessons: number[],
  lessons: Lesson[],
  reviewLog: ReviewLog,
  now: Date = new Date()
): LessonDue[] {
  const queue = buildReviewQueue(completedLessons, lessons, reviewLog, now);
  const result: LessonDue[] = [];

  for (const lesson of lessons) {
    if (!completedLessons.includes(lesson.id)) continue;
    const lessonItems = queue.filter((item) => item.lessonId === lesson.id);
    if (lessonItems.length === 0) continue;
    const count = lessonItems.filter((item) => item.due).length;
    result.push({
      lessonId: lesson.id,
      title: lesson.title,
      icon: lesson.icon,
      dueCount: count,
      caughtUp: count === 0,
    });
  }

  return result;
}

/**
 * Selects up to `limit` of the weakest due items from the queue for a single
 * review session. The queue is already sorted weakest-first.
 */
export function selectReviewBatch(queue: ReviewItem[], limit = 8): ReviewItem[] {
  return dueItems(queue).slice(0, limit);
}

/**
 * Returns a NEW ReviewLog with each key in `keys` stamped to `now.getTime()`.
 * The original `reviewLog` is never mutated.
 */
export function markReviewed(reviewLog: ReviewLog, keys: string[], now: Date = new Date()): ReviewLog {
  const updated = { ...reviewLog };
  const ts = now.getTime();
  for (const key of keys) {
    updated[key] = ts;
  }
  return updated;
}
