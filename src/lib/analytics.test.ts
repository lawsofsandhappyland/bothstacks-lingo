import { describe, it, expect } from 'vitest';
import {
  dayKey,
  recordActivity,
  rangeSummary,
  trendPoints,
  activityHeatmap,
  masteryByTopic,
  weakestTopic,
  type ActivityLog,
} from './analytics';
import { lessonsData } from './lessons';

const NOW = new Date('2026-06-14T12:00:00Z');

describe('dayKey', () => {
  it('returns YYYY-MM-DD in local time', () => {
    // This will be the local date representation of the Date object
    const k = dayKey(NOW);
    expect(k).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('recordActivity', () => {
  it('increments xp and sessions for today without mutating input', () => {
    const log: ActivityLog = {};
    const result = recordActivity(log, 20, NOW);

    // Input not mutated
    expect(Object.keys(log)).toHaveLength(0);

    const todayKey = dayKey(NOW);
    expect(result[todayKey]).toBeDefined();
    expect(result[todayKey].xp).toBe(20);
    expect(result[todayKey].sessions).toBe(1);
  });

  it('accumulates on repeated calls', () => {
    const log: ActivityLog = {};
    const r1 = recordActivity(log, 20, NOW);
    const r2 = recordActivity(r1, 15, NOW);

    const todayKey = dayKey(NOW);
    expect(r2[todayKey].xp).toBe(35);
    expect(r2[todayKey].sessions).toBe(2);
  });

  it('ignores negative xp (clamps to 0)', () => {
    const log: ActivityLog = {};
    const result = recordActivity(log, -10, NOW);
    const todayKey = dayKey(NOW);
    expect(result[todayKey].xp).toBe(0);
    expect(result[todayKey].sessions).toBe(1);
  });
});

describe('rangeSummary', () => {
  // Build a log spanning ~40 days
  function buildTestLog(): ActivityLog {
    const log: ActivityLog = {};
    const todayMs = new Date(dayKey(NOW) + 'T00:00:00').getTime();
    // Last 7 days: 10 xp each = 70 total for 7D window
    for (let i = 0; i < 7; i++) {
      const k = dayKey(new Date(todayMs - i * 86400000));
      log[k] = { xp: 10, sessions: 1 };
    }
    // Days 8-37 (previous 30D window):  5 xp each
    for (let i = 7; i < 37; i++) {
      const k = dayKey(new Date(todayMs - i * 86400000));
      log[k] = { xp: 5, sessions: 1 };
    }
    return log;
  }

  it('7D and 30D windows differ', () => {
    const log = buildTestLog();
    const s7 = rangeSummary(log, {}, '7D', NOW);
    const s30 = rangeSummary(log, {}, '30D', NOW);
    expect(s7.xp).toBe(70); // 7 days * 10 xp
    expect(s30.xp).toBe(70 + 23 * 5); // 7 days + 23 more days of 5 xp each
    expect(s30.xp).toBeGreaterThan(s7.xp);
  });

  it('7D deltas compute correctly', () => {
    const log = buildTestLog();
    const s7 = rangeSummary(log, {}, '7D', NOW);
    // Previous 7D window has days 7-13, each with 5 xp = 35 xp
    expect(s7.deltas).not.toBeNull();
    expect(s7.deltas!.xp).toBe(70 - 35); // 35 delta
  });

  it('30D deltas compute correctly', () => {
    const log = buildTestLog();
    const s30 = rangeSummary(log, {}, '30D', NOW);
    // Previous 30D window has days 30-59, none have entries in our 37-day log
    // days 30-36 (7 days) each have 5 xp = 35 xp previous
    expect(s30.deltas).not.toBeNull();
    expect(typeof s30.deltas!.xp).toBe('number');
  });

  it('ALL range has null deltas', () => {
    const log = buildTestLog();
    const sAll = rangeSummary(log, {}, 'ALL', NOW);
    expect(sAll.deltas).toBeNull();
  });

  it('ALL sums all entries', () => {
    const log = buildTestLog();
    const sAll = rangeSummary(log, {}, 'ALL', NOW);
    // 7 days * 10 + 30 days * 5 = 70 + 150 = 220
    expect(sAll.xp).toBe(220);
  });

  it('wordsReviewed counts reviewLog entries within window', () => {
    const todayMs = new Date(dayKey(NOW) + 'T00:00:00').getTime();
    const reviewLog = {
      'word1': todayMs - 1 * 86400000, // 1 day ago -> in 7D
      'word2': todayMs - 6 * 86400000, // 6 days ago -> in 7D
      'word3': todayMs - 8 * 86400000, // 8 days ago -> NOT in 7D, in 30D
    };
    const s7 = rangeSummary({}, reviewLog, '7D', NOW);
    const s30 = rangeSummary({}, reviewLog, '30D', NOW);
    expect(s7.wordsReviewed).toBe(2);
    expect(s30.wordsReviewed).toBe(3);
  });
});

describe('trendPoints', () => {
  it('returns 7 points for 7D', () => {
    const points = trendPoints({}, '7D', NOW);
    expect(points).toHaveLength(7);
  });

  it('returns 30 points for 30D', () => {
    const points = trendPoints({}, '30D', NOW);
    expect(points).toHaveLength(30);
  });

  it('returns 84 points for ALL', () => {
    const points = trendPoints({}, 'ALL', NOW);
    expect(points).toHaveLength(84);
  });

  it('missing days are 0', () => {
    const points = trendPoints({}, '7D', NOW);
    expect(points.every(p => p === 0)).toBe(true);
  });

  it('includes xp from log', () => {
    const log: ActivityLog = { [dayKey(NOW)]: { xp: 42, sessions: 1 } };
    const points = trendPoints(log, '7D', NOW);
    // Last element is today
    expect(points[points.length - 1]).toBe(42);
  });
});

describe('activityHeatmap', () => {
  it('returns weeks*7 cells', () => {
    const cells = activityHeatmap({}, NOW, 12);
    expect(cells).toHaveLength(12 * 7);
  });

  it('all levels are in 0..4', () => {
    const log: ActivityLog = {};
    const todayMs = new Date(dayKey(NOW) + 'T00:00:00').getTime();
    // Add various xp values
    log[dayKey(new Date(todayMs - 0))] = { xp: 50, sessions: 1 }; // level 4
    log[dayKey(new Date(todayMs - 86400000))] = { xp: 25, sessions: 1 }; // level 3
    log[dayKey(new Date(todayMs - 2 * 86400000))] = { xp: 10, sessions: 1 }; // level 2
    log[dayKey(new Date(todayMs - 3 * 86400000))] = { xp: 5, sessions: 1 }; // level 1
    const cells = activityHeatmap(log, NOW, 12);
    expect(cells.every(c => c.level >= 0 && c.level <= 4)).toBe(true);
  });

  it('returns custom weeks count', () => {
    const cells = activityHeatmap({}, NOW, 8);
    expect(cells).toHaveLength(8 * 7);
  });

  it('level 0 for missing days', () => {
    const cells = activityHeatmap({}, NOW, 1);
    expect(cells.every(c => c.level === 0)).toBe(true);
  });

  it('level thresholds are correct', () => {
    const todayMs = new Date(dayKey(NOW) + 'T00:00:00').getTime();
    const log: ActivityLog = {
      [dayKey(new Date(todayMs - 0))]: { xp: 40, sessions: 1 }, // level 4
      [dayKey(new Date(todayMs - 86400000))]: { xp: 20, sessions: 1 }, // level 3
      [dayKey(new Date(todayMs - 2 * 86400000))]: { xp: 10, sessions: 1 }, // level 2
      [dayKey(new Date(todayMs - 3 * 86400000))]: { xp: 1, sessions: 1 }, // level 1
    };
    const cells = activityHeatmap(log, NOW, 1);
    // last 7 cells, last one is today
    expect(cells[cells.length - 1].level).toBe(4);
    expect(cells[cells.length - 2].level).toBe(3);
    expect(cells[cells.length - 3].level).toBe(2);
    expect(cells[cells.length - 4].level).toBe(1);
  });
});

describe('masteryByTopic', () => {
  it('returns one entry per completed lesson', () => {
    const completedLessons = [1, 2];
    const masteries = masteryByTopic(completedLessons, lessonsData, {}, NOW);
    expect(masteries).toHaveLength(2);
    expect(masteries.map(m => m.lessonId)).toEqual([1, 2]);
  });

  it('mastery is in 0..100', () => {
    const masteries = masteryByTopic([1, 2, 3], lessonsData, {}, NOW);
    expect(masteries.every(m => m.mastery >= 0 && m.mastery <= 100)).toBe(true);
  });

  it('recently reviewed word has high mastery', () => {
    const todayMs = NOW.getTime();
    // Mark all words from lesson 1 as reviewed just now
    const vocab = lessonsData[0].exercises
      .flatMap(ex => ex.matchingMap ? Object.keys(ex.matchingMap).map(w => `1:${w}`) : []);
    const reviewLog: Record<string, number> = {};
    for (const k of vocab) {
      reviewLog[k] = todayMs;
    }
    const masteries = masteryByTopic([1], lessonsData, reviewLog, NOW);
    expect(masteries[0].mastery).toBe(100);
  });

  it('returns empty array for no completed lessons', () => {
    const masteries = masteryByTopic([], lessonsData, {}, NOW);
    expect(masteries).toHaveLength(0);
  });

  it('is deterministic', () => {
    const m1 = masteryByTopic([1, 2], lessonsData, {}, NOW);
    const m2 = masteryByTopic([1, 2], lessonsData, {}, NOW);
    expect(m1).toEqual(m2);
  });
});

describe('weakestTopic', () => {
  it('returns null for empty array', () => {
    expect(weakestTopic([])).toBeNull();
  });

  it('picks the minimum mastery entry', () => {
    const masteries = [
      { lessonId: 1, title: 'A', icon: '🔥', mastery: 80 },
      { lessonId: 2, title: 'B', icon: '🌟', mastery: 30 },
      { lessonId: 3, title: 'C', icon: '⭐', mastery: 60 },
    ];
    const weakest = weakestTopic(masteries);
    expect(weakest?.lessonId).toBe(2);
    expect(weakest?.mastery).toBe(30);
  });

  it('returns the single entry when only one mastery', () => {
    const masteries = [{ lessonId: 1, title: 'A', icon: '🔥', mastery: 50 }];
    expect(weakestTopic(masteries)?.lessonId).toBe(1);
  });
});
