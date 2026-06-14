import { describe, it, expect } from 'vitest';
import { DEFAULT_STATS, DAILY_XP_GOAL, computeLessonCompletion, dailyGoalProgress, loseLife, resetStats } from './progress';
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

describe('streak freeze mechanic', () => {
  const now = new Date(2026, 5, 14, 12, 0, 0);

  it('(p) gap with NO freezes: streak resets to 1, streakFreezes stays 0', () => {
    const oldDate = new Date(2026, 5, 1);
    const base: UserStats = { xp: 0, streak: 5, lives: 5, lastActiveDate: oldDate.toDateString(), streakFreezes: 0 };
    const result = computeLessonCompletion(base, [], 10, 20, now);
    expect(result.stats.streak).toBe(1);
    expect(result.stats.streakFreezes).toBe(0);
  });

  it('(q) one missed day WITH freezes: one freeze consumed, streak bridged to streak+1', () => {
    const lastActive = new Date(2026, 5, 12); // 1 missed day (Jun 13) before now (Jun 14)
    const base: UserStats = { xp: 0, streak: 5, lives: 5, lastActiveDate: lastActive.toDateString(), streakFreezes: 2 };
    const result = computeLessonCompletion(base, [], 11, 20, now);
    expect(result.stats.streak).toBe(6);
    expect(result.stats.streakFreezes).toBe(1);
    expect(result.stats.lastActiveDate).toBe(now.toDateString());
  });

  it('(r) earning: consecutive day from streak 6 -> 7 grants a freeze', () => {
    const yesterday = new Date(2026, 5, 13, 12, 0, 0);
    const base: UserStats = { xp: 0, streak: 6, lives: 5, lastActiveDate: yesterday.toDateString(), streakFreezes: 0 };
    const result = computeLessonCompletion(base, [], 12, 20, now);
    expect(result.stats.streak).toBe(7);
    expect(result.stats.streakFreezes).toBe(1);
  });

  it('(s) earn cap: streak 6 -> 7 with streakFreezes already 3 -> stays 3', () => {
    const yesterday = new Date(2026, 5, 13, 12, 0, 0);
    const base: UserStats = { xp: 0, streak: 6, lives: 5, lastActiveDate: yesterday.toDateString(), streakFreezes: 3 };
    const result = computeLessonCompletion(base, [], 13, 20, now);
    expect(result.stats.streak).toBe(7);
    expect(result.stats.streakFreezes).toBe(3);
  });

  it('(t) same-day repeat: streak and streakFreezes unchanged', () => {
    const base: UserStats = { xp: 0, streak: 4, lives: 5, lastActiveDate: now.toDateString(), streakFreezes: 2 };
    const result = computeLessonCompletion(base, [], 14, 20, now);
    expect(result.stats.streak).toBe(4);
    expect(result.stats.streakFreezes).toBe(2);
  });

  it('(u) freeze-bridge landing on a 7-day multiple does NOT re-grant the consumed freeze', () => {
    const lastActive = new Date(2026, 5, 12); // 1 missed day
    const base: UserStats = { xp: 0, streak: 6, lives: 5, lastActiveDate: lastActive.toDateString(), streakFreezes: 1 };
    const result = computeLessonCompletion(base, [], 15, 20, now);
    expect(result.stats.streak).toBe(7);
    expect(result.stats.streakFreezes).toBe(0);
  });

  it('(v) long gap with INSUFFICIENT freezes resets streak and keeps freezes', () => {
    const lastActive = new Date(2026, 5, 1); // 12 missed days, only 2 freezes
    const base: UserStats = { xp: 0, streak: 9, lives: 5, lastActiveDate: lastActive.toDateString(), streakFreezes: 2 };
    const result = computeLessonCompletion(base, [], 16, 20, now);
    expect(result.stats.streak).toBe(1);
    expect(result.stats.streakFreezes).toBe(2);
  });

  it('(w) two missed days consume two freezes and bridge the streak', () => {
    const lastActive = new Date(2026, 5, 11); // 2 missed days (Jun 12, Jun 13) before now (Jun 14)
    const base: UserStats = { xp: 0, streak: 4, lives: 5, lastActiveDate: lastActive.toDateString(), streakFreezes: 2 };
    const result = computeLessonCompletion(base, [], 17, 20, now);
    expect(result.stats.streak).toBe(5);
    expect(result.stats.streakFreezes).toBe(0);
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

describe('daily XP tracking in computeLessonCompletion', () => {
  const now = new Date(2026, 5, 14, 12, 0, 0);
  const todayStr = now.toDateString();

  it('(x1) first lesson today (dailyXpDate null): dailyXp === xpReward, dailyXpDate === todayStr', () => {
    const base: UserStats = { xp: 0, streak: 0, lives: 5, lastActiveDate: null, dailyXp: 0, dailyXpDate: null };
    const result = computeLessonCompletion(base, [], 20, 20, now);
    expect(result.stats.dailyXp).toBe(20);
    expect(result.stats.dailyXpDate).toBe(todayStr);
  });

  it('(x2) second lesson same day: dailyXp accumulates', () => {
    const base: UserStats = { xp: 20, streak: 1, lives: 5, lastActiveDate: todayStr, dailyXp: 20, dailyXpDate: todayStr };
    const result = computeLessonCompletion(base, [], 21, 20, now);
    expect(result.stats.dailyXp).toBe(40);
  });

  it('(x3) already-completed lesson same day: dailyXp unchanged (earnedXp 0)', () => {
    const base: UserStats = { xp: 20, streak: 1, lives: 5, lastActiveDate: todayStr, dailyXp: 20, dailyXpDate: todayStr };
    const result = computeLessonCompletion(base, [22], 22, 20, now);
    expect(result.stats.dailyXp).toBe(20);
  });

  it('(x4) new day: dailyXp resets to xpReward (previous day dailyXp is discarded)', () => {
    const yesterday = new Date(2026, 5, 13, 12, 0, 0).toDateString();
    const base: UserStats = { xp: 50, streak: 5, lives: 5, lastActiveDate: yesterday, dailyXp: 50, dailyXpDate: yesterday };
    const result = computeLessonCompletion(base, [], 23, 20, now);
    expect(result.stats.dailyXp).toBe(20);
    expect(result.stats.dailyXpDate).toBe(todayStr);
  });
});

describe('dailyGoalProgress', () => {
  const now = new Date(2026, 5, 14, 12, 0, 0);
  const todayStr = now.toDateString();

  it('returns earned XP for today', () => {
    const stats: UserStats = { xp: 0, streak: 0, lives: 5, lastActiveDate: null, dailyXp: 20, dailyXpDate: todayStr };
    const result = dailyGoalProgress(stats, now);
    expect(result.earned).toBe(20);
    expect(result.goal).toBe(DAILY_XP_GOAL);
    expect(result.met).toBe(false);
  });

  it('returns earned 0 when dailyXpDate is a previous day', () => {
    const yesterday = new Date(2026, 5, 13, 12, 0, 0).toDateString();
    const stats: UserStats = { xp: 0, streak: 0, lives: 5, lastActiveDate: null, dailyXp: 50, dailyXpDate: yesterday };
    const result = dailyGoalProgress(stats, now);
    expect(result.earned).toBe(0);
    expect(result.met).toBe(false);
  });

  it('met is true when earned >= DAILY_XP_GOAL', () => {
    const stats: UserStats = { xp: 0, streak: 0, lives: 5, lastActiveDate: null, dailyXp: 30, dailyXpDate: todayStr };
    const result = dailyGoalProgress(stats, now);
    expect(result.met).toBe(true);
  });
});
