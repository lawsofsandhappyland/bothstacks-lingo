import type { Achievement, UserStats } from '../types';
import { achievementDefs } from './achievementDefs';

export interface AchievementStatus extends Achievement {
  unlocked: boolean;
}

function isUnlocked(def: Achievement, stats: UserStats, completedLessons: number[]): boolean {
  switch (def.kind) {
    case 'xp':
      return stats.xp >= def.threshold;
    case 'streak':
      return stats.streak >= def.threshold;
    case 'lessons':
      return completedLessons.length >= def.threshold;
    default:
      return false;
  }
}

export function evaluateAchievements(stats: UserStats, completedLessons: number[]): AchievementStatus[] {
  return achievementDefs.map(def => ({ ...def, unlocked: isUnlocked(def, stats, completedLessons) }));
}

export function countUnlocked(stats: UserStats, completedLessons: number[]): number {
  return evaluateAchievements(stats, completedLessons).filter(a => a.unlocked).length;
}
