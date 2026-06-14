import { describe, it, expect } from 'vitest';
import { DEFAULT_STATS, computeLessonCompletion, loseLife, resetStats } from './progress';
import type { UserStats } from '../types';

describe('computeLessonCompletion', () => {
  const now = new Date(2026, 5, 14, 12, 0, 0);
  const yesterday = new Date(2026, 5, 13, 12, 0, 0);

  it('(a) first lesson, lastActiveDate null -> streak 1, xp increases, lessonId added, lastActiveDate set', () => {
    const base: UserStats = { xp: 10, streak: 0, lives: 5, lastActiveDate: null };
    const result = computeLessonCompletion(base, [], 1, 20, now);
    expect(result.stats.streak).toBe(1);
    expect(result.stats.xp).toBe(30);
    expect(result.completedLessons).toContain(1);
    expect(result.stats.lastActiveDate).toBe(now.toDateString());
  });

  it('(b) same-day repeat: lastActiveDate === now.toDateString() -> streak unchanged', () => {
    const base: UserStats = { xp: 10, streak: 3, lives: 5, lastActiveDate: now.toDateString() };
    const result = computeLessonCompletion(base, [], 2, 20, now);
    expect(result.stats.streak).toBe(3);
  });

  it('(c) consecutive day: lastActiveDate === yesterday -> streak incremented', () => {
    const base: UserStats = { xp: 0, streak: 4, lives: 5, lastActiveDate: yesterday.toDateString() };
    const result = computeLessonCompletion(base, [], 3, 20, now);
    expect(result.stats.streak).toBe(5);
  });

  it('(d) gap of 2+ days: lastActiveDate old -> streak resets to 1', () => {
    const oldDate = new Date(2026, 5, 1);
    const base: UserStats = { xp: 0, streak: 10, lives: 5, lastActiveDate: oldDate.toDateString() };
    const result = computeLessonCompletion(base, [], 4, 20, now);
    expect(result.stats.streak).toBe(1);
  });

  it('(e) already-completed lesson -> xp NOT increased, no duplicate in completedLessons, lastActiveDate updates', () => {
    const base: UserStats = { xp: 50, streak: 2, lives: 5, lastActiveDate: yesterday.toDateString() };
    const result = computeLessonCompletion(base, [5], 5, 20, now);
    expect(result.stats.xp).toBe(50);
    expect(result.completedLessons.filter(id => id === 5).length).toBe(1);
    expect(result.stats.lastActiveDate).toBe(now.toDateString());
  });

  it('(f) lives unchanged by lesson completion', () => {
    const base: UserStats = { xp: 0, streak: 0, lives: 3, lastActiveDate: null };
    const result = computeLessonCompletion(base, [], 6, 20, now);
    expect(result.stats.lives).toBe(3);
  });
});

describe('loseLife', () => {
  it('(g) decrements lives by 1', () => {
    const base: UserStats = { xp: 0, streak: 0, lives: 5, lastActiveDate: null };
    expect(loseLife(base).lives).toBe(4);
  });

  it('(h) floors at 0 when lives is 0', () => {
    const base: UserStats = { xp: 0, streak: 0, lives: 0, lastActiveDate: null };
    expect(loseLife(base).lives).toBe(0);
  });

  it('(i) leaves xp, streak, lastActiveDate unchanged', () => {
    const base: UserStats = { xp: 100, streak: 7, lives: 3, lastActiveDate: 'Mon Jun 14 2026' };
    const result = loseLife(base);
    expect(result.xp).toBe(100);
    expect(result.streak).toBe(7);
    expect(result.lastActiveDate).toBe('Mon Jun 14 2026');
  });
});

describe('resetStats', () => {
  it('(j) deep-equals DEFAULT_STATS values', () => {
    const result = resetStats();
    expect(result.xp).toBe(DEFAULT_STATS.xp);
    expect(result.streak).toBe(DEFAULT_STATS.streak);
    expect(result.lives).toBe(DEFAULT_STATS.lives);
    expect(result.lastActiveDate).toBe(DEFAULT_STATS.lastActiveDate);
  });

  it('(k) returns a fresh object, not DEFAULT_STATS reference', () => {
    expect(resetStats()).not.toBe(DEFAULT_STATS);
  });
});
