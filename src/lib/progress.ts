import type { UserStats } from '../types';

export const DEFAULT_STATS: UserStats = {
  xp: 0,
  streak: 0,
  lives: 5,
  lastActiveDate: null
};

export function resetStats(): UserStats {
  return { ...DEFAULT_STATS };
}

export function loseLife(stats: UserStats): UserStats {
  return { ...stats, lives: Math.max(0, stats.lives - 1) };
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
  if (stats.lastActiveDate === null) { newStreak = 1; }
  else if (stats.lastActiveDate !== todayStr) {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    newStreak = stats.lastActiveDate === yesterdayStr ? stats.streak + 1 : 1;
  }
  const updatedStats: UserStats = { ...stats, xp: wasAlreadyCompleted ? stats.xp : stats.xp + xpReward, streak: newStreak, lives: stats.lives, lastActiveDate: todayStr };
  return { stats: updatedStats, completedLessons: newCompleted };
}
