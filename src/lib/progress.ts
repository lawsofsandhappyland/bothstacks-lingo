import type { UserStats } from '../types';

export const DAILY_XP_GOAL = 30;
export const MAX_LIVES = 5;
export const LIFE_REGEN_MS = 4 * 60 * 60 * 1000;

export const DEFAULT_STATS: UserStats = {
  xp: 0,
  streak: 0,
  lives: 5,
  lastActiveDate: null,
  streakFreezes: 0,
  dailyXp: 0,
  dailyXpDate: null,
  livesUpdatedAt: null
};

export function resetStats(): UserStats {
  return { ...DEFAULT_STATS };
}

export function loseLife(stats: UserStats, now: Date = new Date()): UserStats {
  const newLives = Math.max(0, stats.lives - 1);
  const livesUpdatedAt = stats.livesUpdatedAt ?? now.getTime();
  return { ...stats, lives: newLives, livesUpdatedAt };
}

export function regenerateLives(stats: UserStats, now: Date = new Date()): UserStats {
  if (stats.lives >= MAX_LIVES) { return stats.livesUpdatedAt == null ? stats : { ...stats, livesUpdatedAt: null }; }
  // Legacy/missing anchor with non-full lives: start the regen clock now so a
  // pre-feature (or 0-life) account is never stuck without regenerating.
  if (stats.livesUpdatedAt == null) { return { ...stats, livesUpdatedAt: now.getTime() }; }
  const elapsed = now.getTime() - stats.livesUpdatedAt;
  if (elapsed < LIFE_REGEN_MS) { return stats; }
  const regen = Math.floor(elapsed / LIFE_REGEN_MS);
  const newLives = Math.min(MAX_LIVES, stats.lives + regen);
  const newAnchor = newLives >= MAX_LIVES ? null : stats.livesUpdatedAt + regen * LIFE_REGEN_MS;
  return { ...stats, lives: newLives, livesUpdatedAt: newAnchor };
}

export function computeLessonCompletion(
  stats: UserStats,
  completedLessons: number[],
  lessonId: number,
  xpReward: number,
  now: Date = new Date()
): { stats: UserStats; completedLessons: number[] } {
  const todayStr = now.toDateString();
  const wasAlreadyCompleted = completedLessons.includes(lessonId);
  const newCompleted = wasAlreadyCompleted ? [...completedLessons] : [...completedLessons, lessonId];
  let newStreak = stats.streak;
  let newFreezes = stats.streakFreezes ?? 0;
  // Streak + freeze accounting. A freeze covers exactly one missed day, so a gap
  // is only bridged when the user holds at least one freeze per missed day.
  // Only a genuine consecutive day earns a new freeze (a bridge must not re-grant).
  let earnedConsecutiveDay = false;
  if (stats.lastActiveDate === null) {
    newStreak = 1;
  } else {
    const last = new Date(stats.lastActiveDate);
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startLast = new Date(last.getFullYear(), last.getMonth(), last.getDate()).getTime();
    const diffDays = Math.round((startToday - startLast) / 86400000);
    if (diffDays <= 0) {
      // same day (or clock skew): streak unchanged
    } else if (diffDays === 1) {
      newStreak = stats.streak + 1;
      earnedConsecutiveDay = true;
    } else {
      const missedDays = diffDays - 1;
      if (missedDays <= newFreezes) {
        newFreezes -= missedDays;
        newStreak = stats.streak + 1;
      } else {
        newStreak = 1;
      }
    }
  }
  if (earnedConsecutiveDay && newStreak % 7 === 0) { newFreezes = Math.min(3, newFreezes + 1); }
  const earnedXp = wasAlreadyCompleted ? 0 : xpReward;
  const newDailyXp = stats.dailyXpDate === todayStr ? (stats.dailyXp ?? 0) + earnedXp : earnedXp;
  const updatedStats: UserStats = { ...stats, xp: wasAlreadyCompleted ? stats.xp : stats.xp + xpReward, streak: newStreak, lives: stats.lives, lastActiveDate: todayStr, streakFreezes: newFreezes, dailyXp: newDailyXp, dailyXpDate: todayStr };
  return { stats: updatedStats, completedLessons: newCompleted };
}

export function dailyGoalProgress(stats: UserStats, now: Date = new Date()): { earned: number; goal: number; met: boolean } {
  const today = now.toDateString();
  const earned = stats.dailyXpDate === today ? (stats.dailyXp ?? 0) : 0;
  return { earned, goal: DAILY_XP_GOAL, met: earned >= DAILY_XP_GOAL };
}
