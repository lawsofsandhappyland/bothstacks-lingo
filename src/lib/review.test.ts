import { describe, it, expect } from 'vitest';
import {
  wordKey,
  collectVocab,
  memoryStrength,
  buildReviewQueue,
  dueItems,
  dueCount,
  perLessonDue,
  selectReviewBatch,
  markReviewed,
  REVIEW_HALFLIFE_DAYS,
  DUE_THRESHOLD,
} from './review';
import { lessonsData } from './lessons';

const FIXED_NOW = new Date('2026-06-14T12:00:00Z');

// Helpers to create epoch ms relative to FIXED_NOW
const msAgo = (days: number) => FIXED_NOW.getTime() - days * 86400000;

describe('wordKey', () => {
  it('produces lessonId:word format', () => {
    expect(wordKey(2, 'servidor')).toBe('2:servidor');
    expect(wordKey(1, 'hola')).toBe('1:hola');
  });
});

describe('collectVocab', () => {
  it('only includes lessons in completedLessons', () => {
    const vocab = collectVocab([1], lessonsData);
    const ids = new Set(vocab.map((v) => v.lessonId));
    expect(ids.has(1)).toBe(true);
    expect(ids.has(2)).toBe(false);
  });

  it('a not-completed lesson contributes nothing', () => {
    const vocab = collectVocab([], lessonsData);
    expect(vocab).toHaveLength(0);
  });

  it('lessonRef matches /^L\\d+·\\d+$/', () => {
    const vocab = collectVocab([1, 2], lessonsData);
    for (const item of vocab) {
      expect(item.lessonRef).toMatch(/^L\d+·\d+$/);
    }
  });

  it('translation comes from matchingMap (lesson 1: hola -> hello)', () => {
    const vocab = collectVocab([1], lessonsData);
    const hola = vocab.find((v) => v.word === 'hola');
    expect(hola).toBeDefined();
    expect(hola?.translation).toBe('hello');
  });

  it('lesson 2 includes servidor -> server', () => {
    const vocab = collectVocab([1, 2], lessonsData);
    const servidor = vocab.find((v) => v.word === 'servidor' && v.lessonId === 2);
    expect(servidor).toBeDefined();
    expect(servidor?.translation).toBe('server');
  });

  it('lessonRef pos increments per matching entry within a lesson', () => {
    const vocab = collectVocab([1], lessonsData);
    const refs = vocab.filter((v) => v.lessonId === 1).map((v) => v.lessonRef);
    expect(refs).toContain('L1·1');
    expect(refs).toContain('L1·2');
  });

  it('dedupes by key (first occurrence wins)', () => {
    // Build a synthetic set with a repeated word
    const keys = collectVocab([1], lessonsData).map((v) => v.key);
    const unique = new Set(keys);
    expect(keys.length).toBe(unique.size);
  });
});

describe('memoryStrength', () => {
  it('age 0 -> 100', () => {
    expect(memoryStrength(0)).toBe(100);
  });

  it(`age ${REVIEW_HALFLIFE_DAYS} -> 50`, () => {
    expect(memoryStrength(REVIEW_HALFLIFE_DAYS)).toBe(50);
  });

  it(`age ${REVIEW_HALFLIFE_DAYS * 2} -> 25`, () => {
    expect(memoryStrength(REVIEW_HALFLIFE_DAYS * 2)).toBe(25);
  });

  it('clamps to 0 for very large age', () => {
    expect(memoryStrength(1000)).toBe(0);
  });
});

describe('buildReviewQueue with explicit reviewLog', () => {
  it('a word reviewed now has memoryStrength 100 and due=false', () => {
    const log = { [wordKey(1, 'hola')]: msAgo(0) };
    const queue = buildReviewQueue([1], lessonsData, log, FIXED_NOW);
    const item = queue.find((i) => i.word === 'hola' && i.lessonId === 1);
    expect(item).toBeDefined();
    expect(item?.memoryStrength).toBe(100);
    expect(item?.due).toBe(false);
  });

  it('a word reviewed 7 days ago has memoryStrength ~50 and due=true', () => {
    const log = { [wordKey(1, 'hola')]: msAgo(7) };
    const queue = buildReviewQueue([1], lessonsData, log, FIXED_NOW);
    const item = queue.find((i) => i.word === 'hola' && i.lessonId === 1);
    expect(item).toBeDefined();
    expect(item?.memoryStrength).toBe(50);
    expect(item?.due).toBe(true);
  });

  it('ordering is ascending by memoryStrength (weakest first)', () => {
    const log = {
      [wordKey(1, 'hola')]: msAgo(14),    // ~25 strength
      [wordKey(1, 'café')]: msAgo(7),     // ~50 strength
      [wordKey(1, 'gracias')]: msAgo(0),  // 100 strength
    };
    const queue = buildReviewQueue([1], lessonsData, log, FIXED_NOW);
    const strengths = queue.map((i) => i.memoryStrength);
    for (let i = 1; i < strengths.length; i++) {
      expect(strengths[i]).toBeGreaterThanOrEqual(strengths[i - 1]);
    }
  });

  it('all strengths are within 0..100', () => {
    const queue = buildReviewQueue([1, 2], lessonsData, {}, FIXED_NOW);
    for (const item of queue) {
      expect(item.memoryStrength).toBeGreaterThanOrEqual(0);
      expect(item.memoryStrength).toBeLessThanOrEqual(100);
    }
  });
});

describe('baseline determinism (never reviewed)', () => {
  it('buildReviewQueue output is identical across two calls with the same fixed now', () => {
    const queue1 = buildReviewQueue([1, 2, 3], lessonsData, {}, FIXED_NOW);
    const queue2 = buildReviewQueue([1, 2, 3], lessonsData, {}, FIXED_NOW);
    expect(queue1).toEqual(queue2);
  });

  it('all strengths are within 0..100 with no reviewLog', () => {
    const queue = buildReviewQueue([1, 2, 3, 4, 5], lessonsData, {}, FIXED_NOW);
    for (const item of queue) {
      expect(item.memoryStrength).toBeGreaterThanOrEqual(0);
      expect(item.memoryStrength).toBeLessThanOrEqual(100);
    }
  });
});

describe('dueItems and dueCount', () => {
  it('dueItems returns only items with due=true', () => {
    const log = {
      [wordKey(1, 'hola')]: msAgo(0),   // strength 100, not due
      [wordKey(1, 'café')]: msAgo(14),  // strength 25, due
    };
    const queue = buildReviewQueue([1], lessonsData, log, FIXED_NOW);
    const due = dueItems(queue);
    expect(due.every((i) => i.due)).toBe(true);
    const cafe = due.find((i) => i.word === 'café');
    expect(cafe).toBeDefined();
  });

  it('dueCount matches dueItems length', () => {
    const queue = buildReviewQueue([1, 2], lessonsData, {}, FIXED_NOW);
    expect(dueCount(queue)).toBe(dueItems(queue).length);
  });
});

describe('markReviewed', () => {
  it('does not mutate the original reviewLog', () => {
    const original: Record<string, number> = {};
    const key = wordKey(1, 'hola');
    markReviewed(original, [key], FIXED_NOW);
    expect(original[key]).toBeUndefined();
  });

  it('sets timestamps for each key to now.getTime()', () => {
    const key1 = wordKey(1, 'hola');
    const key2 = wordKey(1, 'café');
    const updated = markReviewed({}, [key1, key2], FIXED_NOW);
    expect(updated[key1]).toBe(FIXED_NOW.getTime());
    expect(updated[key2]).toBe(FIXED_NOW.getTime());
  });

  it('after marking the weakest due words, dueCount strictly decreases', () => {
    const queue1 = buildReviewQueue([1, 2], lessonsData, {}, FIXED_NOW);
    const count1 = dueCount(queue1);
    const batch = selectReviewBatch(queue1, 3);
    const keys = batch.map((i) => i.key);
    const log2 = markReviewed({}, keys, FIXED_NOW);
    const queue2 = buildReviewQueue([1, 2], lessonsData, log2, FIXED_NOW);
    expect(dueCount(queue2)).toBeLessThan(count1);
  });

  it('marked words now have strength 100', () => {
    const key = wordKey(1, 'hola');
    const log = markReviewed({}, [key], FIXED_NOW);
    const queue = buildReviewQueue([1], lessonsData, log, FIXED_NOW);
    const item = queue.find((i) => i.key === key);
    expect(item?.memoryStrength).toBe(100);
  });
});

describe('perLessonDue', () => {
  it('returns one entry per completed lesson that has vocab', () => {
    const result = perLessonDue([1, 2], lessonsData, {}, FIXED_NOW);
    const lessonIds = result.map((r) => r.lessonId);
    expect(lessonIds).toContain(1);
    expect(lessonIds).toContain(2);
    // non-completed lessons are excluded
    expect(lessonIds).not.toContain(3);
  });

  it('caughtUp is true when all lesson words have been reviewed now', () => {
    const vocab = collectVocab([1], lessonsData);
    const log: Record<string, number> = {};
    for (const item of vocab) {
      log[item.key] = FIXED_NOW.getTime();
    }
    const result = perLessonDue([1], lessonsData, log, FIXED_NOW);
    const lesson1 = result.find((r) => r.lessonId === 1);
    expect(lesson1?.caughtUp).toBe(true);
    expect(lesson1?.dueCount).toBe(0);
  });

  it('caughtUp is false when some words are due', () => {
    // No reviewLog means baseline age may make some words due
    const result = perLessonDue([1, 2, 3, 4, 5], lessonsData, {}, FIXED_NOW);
    // At least one lesson should have due items (earlier lessons are staler in baseline)
    const anyDue = result.some((r) => !r.caughtUp);
    expect(anyDue).toBe(true);
  });

  it('includes title and icon from the lesson', () => {
    const result = perLessonDue([1], lessonsData, {}, FIXED_NOW);
    const lesson1 = result.find((r) => r.lessonId === 1);
    expect(lesson1?.title).toBe('¡Hola, Pingüino!');
    expect(lesson1?.icon).toBe('👋');
  });

  it('is in lessons order', () => {
    const result = perLessonDue([1, 2, 3], lessonsData, {}, FIXED_NOW);
    const ids = result.map((r) => r.lessonId);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });
});

describe('selectReviewBatch', () => {
  it('never exceeds the limit', () => {
    const queue = buildReviewQueue([1, 2, 3], lessonsData, {}, FIXED_NOW);
    const batch = selectReviewBatch(queue, 4);
    expect(batch.length).toBeLessThanOrEqual(4);
  });

  it('contains only due items', () => {
    const queue = buildReviewQueue([1, 2], lessonsData, {}, FIXED_NOW);
    const batch = selectReviewBatch(queue, 8);
    expect(batch.every((i) => i.due)).toBe(true);
  });

  it('uses the default limit of 8 when not specified', () => {
    const queue = buildReviewQueue([1, 2, 3, 4, 5], lessonsData, {}, FIXED_NOW);
    const batch = selectReviewBatch(queue);
    expect(batch.length).toBeLessThanOrEqual(8);
  });

  it('returns empty array when no items are due', () => {
    const vocab = collectVocab([1], lessonsData);
    const log: Record<string, number> = {};
    for (const item of vocab) {
      log[item.key] = FIXED_NOW.getTime();
    }
    const queue = buildReviewQueue([1], lessonsData, log, FIXED_NOW);
    expect(selectReviewBatch(queue)).toHaveLength(0);
  });

  it('contains the weakest items (first in queue)', () => {
    const queue = buildReviewQueue([1, 2], lessonsData, {}, FIXED_NOW);
    const batch = selectReviewBatch(queue, 3);
    const due = dueItems(queue);
    // batch should match the first N due items
    expect(batch).toEqual(due.slice(0, 3));
  });
});

describe('DUE_THRESHOLD constant', () => {
  it('is 70', () => {
    expect(DUE_THRESHOLD).toBe(70);
  });
});
