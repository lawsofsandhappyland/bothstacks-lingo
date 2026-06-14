import type { Achievement } from '../types';

/** The catalog of achievement badge definitions, evaluated against user stats. */
export const achievementDefs: Achievement[] = [
  { id: 'first-steps', title: 'First Steps', description: 'Complete your first lesson', icon: '🐣', kind: 'lessons', threshold: 1 },
  { id: 'pathfinder', title: 'Pathfinder', description: 'Complete 3 lessons', icon: '🗺️', kind: 'lessons', threshold: 3 },
  { id: 'graduate', title: 'Graduate', description: 'Complete all 8 lessons', icon: '🎓', kind: 'lessons', threshold: 8 },
  { id: 'getting-started', title: 'Getting Started', description: 'Earn 50 XP', icon: '⭐', kind: 'xp', threshold: 50 },
  { id: 'century', title: 'Century', description: 'Earn 100 XP', icon: '💯', kind: 'xp', threshold: 100 },
  { id: 'maxed-out', title: 'Maxed Out', description: 'Earn all 300 XP', icon: '💎', kind: 'xp', threshold: 300 },
  { id: 'on-fire', title: 'On Fire', description: 'Reach a 3-day streak', icon: '🔥', kind: 'streak', threshold: 3 },
  { id: 'week-warrior', title: 'Week Warrior', description: 'Reach a 7-day streak', icon: '📅', kind: 'streak', threshold: 7 },
  { id: 'unstoppable', title: 'Unstoppable', description: 'Reach a 14-day streak', icon: '🚀', kind: 'streak', threshold: 14 },
  { id: 'legend', title: 'Legend', description: 'Reach a 30-day streak', icon: '👑', kind: 'streak', threshold: 30 },
];
