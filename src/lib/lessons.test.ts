import { describe, it, expect } from 'vitest';
import { lessonsData } from './lessons';

describe('lessonsData', () => {
  it('has at least one lesson', () => {
    expect(lessonsData.length).toBeGreaterThanOrEqual(1);
  });

  it('has unique lesson IDs', () => {
    const ids = lessonsData.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has sequential lesson IDs starting from 1', () => {
    const ids = lessonsData.map(l => l.id).sort((a, b) => a - b);
    ids.forEach((id, i) => {
      expect(id).toBe(i + 1);
    });
  });

  it('every lesson has required string fields', () => {
    for (const lesson of lessonsData) {
      expect(typeof lesson.title).toBe('string');
      expect(lesson.title.length).toBeGreaterThan(0);
      expect(typeof lesson.subtitle).toBe('string');
      expect(lesson.subtitle.length).toBeGreaterThan(0);
      expect(typeof lesson.description).toBe('string');
      expect(lesson.description.length).toBeGreaterThan(0);
      expect(typeof lesson.icon).toBe('string');
      expect(lesson.icon.length).toBeGreaterThan(0);
    }
  });

  it('every lesson has a positive xpReward', () => {
    for (const lesson of lessonsData) {
      expect(lesson.xpReward).toBeGreaterThan(0);
      expect(Number.isInteger(lesson.xpReward)).toBe(true);
    }
  });

  it('every lesson has at least one exercise', () => {
    for (const lesson of lessonsData) {
      expect(lesson.exercises.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every exercise has a unique id', () => {
    const ids: string[] = [];
    for (const lesson of lessonsData) {
      for (const exercise of lesson.exercises) {
        ids.push(exercise.id);
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('exercise types', () => {
  it('multiple-choice exercises have options and correctAnswer', () => {
    for (const lesson of lessonsData) {
      for (const ex of lesson.exercises) {
        if (ex.type !== 'multiple-choice') continue;
        expect(Array.isArray(ex.options)).toBe(true);
        expect(ex.options!.length).toBeGreaterThanOrEqual(2);
        expect(typeof ex.correctAnswer).toBe('string');
        expect(ex.options!).toContain(ex.correctAnswer);
      }
    }
  });

  it('fill-blank exercises have options and correctAnswer', () => {
    for (const lesson of lessonsData) {
      for (const ex of lesson.exercises) {
        if (ex.type !== 'fill-blank') continue;
        expect(Array.isArray(ex.options)).toBe(true);
        expect(ex.options!.length).toBeGreaterThanOrEqual(2);
        expect(typeof ex.correctAnswer).toBe('string');
        expect(ex.options!).toContain(ex.correctAnswer);
      }
    }
  });

  it('word-bank exercises have wordBank and correctWordOrder', () => {
    for (const lesson of lessonsData) {
      for (const ex of lesson.exercises) {
        if (ex.type !== 'word-bank') continue;
        expect(Array.isArray(ex.wordBank)).toBe(true);
        expect(ex.wordBank!.length).toBeGreaterThanOrEqual(2);
        expect(Array.isArray(ex.correctWordOrder)).toBe(true);
        expect(ex.correctWordOrder!.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('matching exercises have leftPairs, rightPairs, and matchingMap', () => {
    for (const lesson of lessonsData) {
      for (const ex of lesson.exercises) {
        if (ex.type !== 'matching') continue;
        expect(Array.isArray(ex.leftPairs)).toBe(true);
        expect(ex.leftPairs!.length).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(ex.rightPairs)).toBe(true);
        expect(ex.rightPairs!.length).toBeGreaterThanOrEqual(1);
        expect(ex.matchingMap).toBeDefined();
        expect(typeof ex.matchingMap).toBe('object');

        // Every left item must have a mapping
        for (const left of ex.leftPairs!) {
          expect(ex.matchingMap![left]).toBeDefined();
        }

        // Every mapped value must be in rightPairs
        const mappedValues = Object.values(ex.matchingMap!);
        for (const value of mappedValues) {
          expect(ex.rightPairs).toContain(value);
        }
      }
    }
  });
});
