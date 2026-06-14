import type { Lesson } from '../types';
import type { ReviewLog } from './review';
import type { UserStats } from '../types';
import { collectVocab, memoryStrength } from './review';

export type ActivityLog = Record<string, { xp: number; sessions: number }>; // dayKey -> totals
export type RangeKey = '7D' | '30D' | 'ALL';

/** Returns a local YYYY-MM-DD string for the given date. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns a new ActivityLog with today's entry updated; does not mutate input. */
export function recordActivity(log: ActivityLog, xpEarned: number, now: Date = new Date()): ActivityLog {
  const key = dayKey(now);
  const existing = log[key] ?? { xp: 0, sessions: 0 };
  return {
    ...log,
    [key]: {
      xp: existing.xp + Math.max(0, xpEarned),
      sessions: existing.sessions + 1,
    },
  };
}

/** Returns the number of days for the given range, or null for ALL. */
export function rangeDays(range: RangeKey): number | null {
  if (range === '7D') return 7;
  if (range === '30D') return 30;
  return null;
}

/** Computes aggregate stats for the given range window. */
export function rangeSummary(
  log: ActivityLog,
  reviewLog: ReviewLog,
  range: RangeKey,
  now: Date = new Date()
): {
  xp: number;
  sessions: number;
  activeDays: number;
  wordsReviewed: number;
  deltas: { xp: number; sessions: number; wordsReviewed: number } | null;
} {
  const n = rangeDays(range);
  const todayKey = dayKey(now);
  const todayMs = new Date(todayKey + 'T00:00:00').getTime();

  if (n === null) {
    // ALL: sum everything
    let xp = 0;
    let sessions = 0;
    let activeDays = 0;
    for (const entry of Object.values(log)) {
      xp += entry.xp;
      sessions += entry.sessions;
      activeDays += 1;
    }
    const wordsReviewed = Object.keys(reviewLog).length;
    return { xp, sessions, activeDays, wordsReviewed, deltas: null };
  }

  // Build a set of day keys for current and previous windows
  const currentKeys = new Set<string>();
  const prevKeys = new Set<string>();
  for (let i = 0; i < n; i++) {
    const dMs = todayMs - i * 86400000;
    currentKeys.add(dayKey(new Date(dMs)));
    const dPrevMs = todayMs - (n + i) * 86400000;
    prevKeys.add(dayKey(new Date(dPrevMs)));
  }

  // Current window
  let xp = 0;
  let sessions = 0;
  let activeDays = 0;
  for (const [k, entry] of Object.entries(log)) {
    if (currentKeys.has(k)) {
      xp += entry.xp;
      sessions += entry.sessions;
      activeDays += 1;
    }
  }

  // Current window: words reviewed = review log entries whose timestamp falls in the window
  const windowStart = todayMs - (n - 1) * 86400000;
  const windowEnd = todayMs + 86400000; // exclusive end (tomorrow 00:00)
  let wordsReviewed = 0;
  for (const ts of Object.values(reviewLog)) {
    if (ts >= windowStart && ts < windowEnd) {
      wordsReviewed += 1;
    }
  }

  // Previous window
  let prevXp = 0;
  let prevSessions = 0;
  for (const [k, entry] of Object.entries(log)) {
    if (prevKeys.has(k)) {
      prevXp += entry.xp;
      prevSessions += entry.sessions;
    }
  }
  const prevWindowStart = todayMs - (2 * n - 1) * 86400000;
  const prevWindowEnd = todayMs - (n - 1) * 86400000;
  let prevWordsReviewed = 0;
  for (const ts of Object.values(reviewLog)) {
    if (ts >= prevWindowStart && ts < prevWindowEnd) {
      prevWordsReviewed += 1;
    }
  }

  return {
    xp,
    sessions,
    activeDays,
    wordsReviewed,
    deltas: {
      xp: xp - prevXp,
      sessions: sessions - prevSessions,
      wordsReviewed: wordsReviewed - prevWordsReviewed,
    },
  };
}

/** Returns daily XP points for the range window, oldest to newest (missing days = 0). */
export function trendPoints(log: ActivityLog, range: RangeKey, now: Date = new Date()): number[] {
  const n = rangeDays(range) ?? 84;
  const todayKey = dayKey(now);
  const todayMs = new Date(todayKey + 'T00:00:00').getTime();

  const points: number[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const dMs = todayMs - i * 86400000;
    const k = dayKey(new Date(dMs));
    points.push(log[k]?.xp ?? 0);
  }
  return points;
}

/** Returns heatmap cells (weeks*7) ordered oldest to newest, suitable for CSS grid column flow. */
export function activityHeatmap(
  log: ActivityLog,
  now: Date = new Date(),
  weeks = 12
): Array<{ date: string; level: 0 | 1 | 2 | 3 | 4 }> {
  const totalDays = weeks * 7;
  const todayKey = dayKey(now);
  const todayMs = new Date(todayKey + 'T00:00:00').getTime();

  const cells: Array<{ date: string; level: 0 | 1 | 2 | 3 | 4 }> = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const dMs = todayMs - i * 86400000;
    const k = dayKey(new Date(dMs));
    const xp = log[k]?.xp ?? 0;
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (xp >= 40) level = 4;
    else if (xp >= 20) level = 3;
    else if (xp >= 10) level = 2;
    else if (xp >= 1) level = 1;
    cells.push({ date: k, level });
  }
  return cells;
}

/** Per-lesson mastery summary derived from memory strength. */
export interface LessonMastery {
  lessonId: number;
  title: string;
  icon: string;
  mastery: number; // 0-100 rounded
}

/** Returns one mastery entry per completed lesson, in lessons order. */
export function masteryByTopic(
  completedLessons: number[],
  lessons: Lesson[],
  reviewLog: ReviewLog,
  now: Date = new Date()
): LessonMastery[] {
  const result: LessonMastery[] = [];

  for (const lesson of lessons) {
    if (!completedLessons.includes(lesson.id)) continue;

    const vocab = collectVocab([lesson.id], lessons);
    if (vocab.length === 0) continue;

    let totalStrength = 0;
    for (const item of vocab) {
      const ts = reviewLog[item.key];
      let ageDays: number;
      if (typeof ts === 'number') {
        ageDays = Math.max(0, (now.getTime() - ts) / 86400000);
      } else {
        // Never reviewed: synthesise a baseline using same staleness formula as review.ts
        const maxCompleted = completedLessons.length > 0 ? Math.max(...completedLessons) : 0;
        const staleness = maxCompleted - item.lessonId;
        // Deterministic DJB2-style hash (mirrors review.ts effectiveAgeDays)
        let h = 5381;
        for (let i = 0; i < item.key.length; i++) {
          h = ((h * 33) ^ item.key.charCodeAt(i)) >>> 0;
        }
        const variance = h % 7;
        ageDays = 2 + staleness * 2 + variance;
      }
      totalStrength += memoryStrength(ageDays);
    }

    const mastery = Math.round(totalStrength / vocab.length);
    result.push({ lessonId: lesson.id, title: lesson.title, icon: lesson.icon, mastery });
  }

  return result;
}

/** Returns the lesson with the lowest mastery, or null if none. */
export function weakestTopic(masteries: LessonMastery[]): LessonMastery | null {
  if (masteries.length === 0) return null;
  return masteries.reduce((min, m) => m.mastery < min.mastery ? m : min);
}

export interface ProfileChip {
  emoji: string;
  label: string;
}

/** Returns an array of profile chips derived only from real signals. */
export function profileChips(
  stats: UserStats,
  completedLessons: number[],
  log: ActivityLog,
  reviewLog: ReviewLog
): ProfileChip[] {
  const chips: ProfileChip[] = [];

  const totalSessions = Object.values(log).reduce((sum, e) => sum + e.sessions, 0);
  chips.push({ emoji: '📊', label: `${totalSessions} sesiones` });

  if (stats.streak >= 7) {
    chips.push({ emoji: '🔥', label: 'En racha' });
  } else if (stats.streak >= 3) {
    chips.push({ emoji: '🎯', label: 'Constante' });
  }

  if (completedLessons.length >= 3) {
    chips.push({ emoji: '🗺️', label: 'Explorador' });
  }

  if (Object.keys(reviewLog).length >= 5) {
    chips.push({ emoji: '🧠', label: 'Repasador' });
  }

  return chips.slice(0, 4);
}
