import { describe, it, expect } from 'vitest';
import { evaluateAchievements, countUnlocked } from './achievements';
import { achievementDefs } from './achievementDefs';
import type { UserStats } from '../types';

const zeroedStats: UserStats = { xp: 0, streak: 0, lives: 5, lastActiveDate: null };
const hugeStats: UserStats = { xp: 1000000, streak: 1000000, lives: 5, lastActiveDate: null };
const hugeLessons = Array.from({ length: 1000 }, (_, i) => i + 1);

describe('evaluateAchievements', () => {
  it('returns one status per def', () => {
    const result = evaluateAchievements(zeroedStats, []);
    expect(result.length).toBe(achievementDefs.length);
  });

  it('locks all defs with threshold > 0 when stats are zeroed', () => {
    const result = evaluateAchievements(zeroedStats, []);
    for (const status of result) {
      const def = achievementDefs.find(d => d.id === status.id)!;
      if (def.threshold > 0) {
        expect(status.unlocked).toBe(false);
      }
    }
  });

  it('countUnlocked with zeroed stats equals number of defs with threshold === 0', () => {
    const zeroThresholdCount = achievementDefs.filter(d => d.threshold === 0).length;
    expect(countUnlocked(zeroedStats, [])).toBe(zeroThresholdCount);
  });

  it('unlocks all defs with huge stats and many completed lessons', () => {
    expect(countUnlocked(hugeStats, hugeLessons)).toBe(achievementDefs.length);
  });
});

describe('boundary conditions per kind', () => {
  const kinds = ['xp', 'streak', 'lessons'] as const;

  for (const kind of kinds) {
    const def = achievementDefs.find(d => d.kind === kind);

    if (!def) {
      it.skip(`no def of kind '${kind}' exists, skipping boundary test`, () => {});
      continue;
    }

    it(`unlocks a '${kind}' def exactly at threshold`, () => {
      const stats: UserStats =
        kind === 'xp'
          ? { xp: def.threshold, streak: 0, lives: 5, lastActiveDate: null }
          : kind === 'streak'
          ? { xp: 0, streak: def.threshold, lives: 5, lastActiveDate: null }
          : { xp: 0, streak: 0, lives: 5, lastActiveDate: null };

      const lessons = kind === 'lessons' ? Array.from({ length: def.threshold }, (_, i) => i + 1) : [];

      const result = evaluateAchievements(stats, lessons);
      const status = result.find(a => a.id === def.id)!;
      expect(status.unlocked).toBe(true);
    });

    it(`locks a '${kind}' def at threshold - 1`, () => {
      if (def.threshold === 0) {
        // Cannot go below 0; the def is always unlocked at threshold
        return;
      }

      const stats: UserStats =
        kind === 'xp'
          ? { xp: def.threshold - 1, streak: 0, lives: 5, lastActiveDate: null }
          : kind === 'streak'
          ? { xp: 0, streak: def.threshold - 1, lives: 5, lastActiveDate: null }
          : { xp: 0, streak: 0, lives: 5, lastActiveDate: null };

      const lessons =
        kind === 'lessons' ? Array.from({ length: def.threshold - 1 }, (_, i) => i + 1) : [];

      const result = evaluateAchievements(stats, lessons);
      const status = result.find(a => a.id === def.id)!;
      expect(status.unlocked).toBe(false);
    });
  }
});
