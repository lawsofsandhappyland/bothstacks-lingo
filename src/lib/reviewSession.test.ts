import { describe, it, expect } from 'vitest';
import { buildReviewLesson, REVIEW_SESSION_ID } from './reviewSession';
import { collectVocab, buildReviewQueue } from './review';
import { lessonsData } from './lessons';
import type { ReviewItem, VocabItem } from './review';

// Build a realistic pool from the first two completed lessons
const completedLessons = [1, 2];
const vocabPool: VocabItem[] = collectVocab(completedLessons, lessonsData);
const queue: ReviewItem[] = buildReviewQueue(completedLessons, lessonsData, {});
// Take the first 4 items from the queue as a representative batch
const batch = queue.slice(0, 4);

describe('buildReviewLesson', () => {
  it('builds one exercise per item in order', () => {
    const lesson = buildReviewLesson(batch, vocabPool);
    expect(lesson.exercises).toHaveLength(batch.length);
    lesson.exercises.forEach((ex, idx) => {
      expect(ex.id).toBe(`rev-${idx}`);
    });
  });

  it('alternates direction: even index is ES→EN, odd index is EN→ES', () => {
    const lesson = buildReviewLesson(batch, vocabPool);
    lesson.exercises.forEach((ex, idx) => {
      if (idx % 2 === 0) {
        // ES → EN: questionText is Spanish word, correctAnswer is translation
        const item = batch[idx];
        expect(ex.questionText).toBe(item.word);
        expect(ex.correctAnswer).toBe(item.translation);
        expect(ex.instruction).toBe('¿Qué significa en inglés?');
      } else {
        // EN → ES: questionText is English translation, correctAnswer is Spanish word
        const item = batch[idx];
        expect(ex.questionText).toBe(item.translation);
        expect(ex.correctAnswer).toBe(item.word);
        expect(ex.instruction).toBe('¿Cómo se dice en español?');
      }
    });
  });

  it('every exercise options array includes its correctAnswer', () => {
    const lesson = buildReviewLesson(batch, vocabPool);
    for (const ex of lesson.exercises) {
      expect(ex.options).toContain(ex.correctAnswer);
    }
  });

  it('options have no duplicates', () => {
    const lesson = buildReviewLesson(batch, vocabPool);
    for (const ex of lesson.exercises) {
      const opts = ex.options ?? [];
      const unique = new Set(opts);
      expect(unique.size).toBe(opts.length);
    }
  });

  it('distractors come from the vocab pool and are not the correct answer', () => {
    const lesson = buildReviewLesson(batch, vocabPool);
    const allTranslations = new Set(vocabPool.map(v => v.translation));
    const allWords = new Set(vocabPool.map(v => v.word));

    lesson.exercises.forEach((ex, idx) => {
      const opts = ex.options ?? [];
      const distractors = opts.filter(o => o !== ex.correctAnswer);
      for (const d of distractors) {
        expect(d).not.toBe(ex.correctAnswer);
        if (idx % 2 === 0) {
          // ES→EN distractors should be translations
          expect(allTranslations.has(d)).toBe(true);
        } else {
          // EN→ES distractors should be Spanish words
          expect(allWords.has(d)).toBe(true);
        }
      }
    });
  });

  it('is deterministic: two calls with same inputs produce identical lessons', () => {
    const lesson1 = buildReviewLesson(batch, vocabPool);
    const lesson2 = buildReviewLesson(batch, vocabPool);
    expect(JSON.stringify(lesson1)).toBe(JSON.stringify(lesson2));
  });

  it('has xpReward === 10 and id === REVIEW_SESSION_ID', () => {
    const lesson = buildReviewLesson(batch, vocabPool);
    expect(lesson.xpReward).toBe(10);
    expect(lesson.id).toBe(REVIEW_SESSION_ID);
    expect(REVIEW_SESSION_ID).toBe(-1);
  });

  it('handles a small pool gracefully (no crash, options length <= 3)', () => {
    // Use a pool of just 2 items to force distractor scarcity
    const tinyPool = vocabPool.slice(0, 2);
    const singleItemBatch = batch.slice(0, 1);
    expect(() => buildReviewLesson(singleItemBatch, tinyPool)).not.toThrow();
    const lesson = buildReviewLesson(singleItemBatch, tinyPool);
    const opts = lesson.exercises[0].options ?? [];
    expect(opts.length).toBeLessThanOrEqual(3);
    expect(opts.length).toBeGreaterThanOrEqual(1);
  });

  it('options are at most 3 per exercise', () => {
    const lesson = buildReviewLesson(batch, vocabPool);
    for (const ex of lesson.exercises) {
      expect((ex.options ?? []).length).toBeLessThanOrEqual(3);
    }
  });
});
