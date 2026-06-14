import type { UserStats } from '../types';
import { lessonsData } from '../lib/lessons';
import { countUnlocked } from '../lib/achievements';
import { achievementDefs } from '../lib/achievementDefs';
import { dailyGoalProgress } from '../lib/progress';

interface ProgressViewProps {
  stats: UserStats;
  completedLessons: number[];
}

/**
 * Retro dark stats dashboard showing lesson, achievement, and daily goal progress.
 */
export default function ProgressView({ stats, completedLessons }: ProgressViewProps) {
  const totalLessons = lessonsData.length;
  const lessonsDone = completedLessons.length;
  const achievementsTotal = achievementDefs.length;
  const achievementsUnlocked = countUnlocked(stats, completedLessons);
  const daily = dailyGoalProgress(stats);

  const lessonsPct = Math.min(100, Math.round((lessonsDone / totalLessons) * 100));
  const achievementsPct = Math.min(100, Math.round((achievementsUnlocked / achievementsTotal) * 100));
  const dailyPct = Math.min(100, Math.round((daily.earned / daily.goal) * 100));

  return (
    <div className="animate-fade-in-up w-full max-w-lg px-4 py-8 mx-auto">
      <div className="retro-card bg-deep-violet text-ghost-white flex flex-col gap-6">
        <h2 className="text-2xl font-black text-flame-orange tracking-tight">PROGRESO</h2>

        <hr className="border-void border-2" />

        {/* 3-column stat grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-void p-3 rounded-xl border-2 border-void">
            <span className="text-xl block">🎯</span>
            <span className="ui-label text-xs text-slate-grey">XP</span>
            <span className="font-mono font-black text-lg block text-flame-orange">{stats.xp}</span>
          </div>
          <div className="bg-void p-3 rounded-xl border-2 border-void">
            <span className="text-xl block">🔥</span>
            <span className="ui-label text-xs text-slate-grey">Streak</span>
            <span className="font-mono font-black text-lg block text-fuchsia-accent">{stats.streak}</span>
            <span className="text-xs text-slate-grey">{stats.streakFreezes ?? 0} freezes ❄️</span>
          </div>
          <div className="bg-void p-3 rounded-xl border-2 border-void">
            <span className="text-xl block">❤️</span>
            <span className="ui-label text-xs text-slate-grey">Lives</span>
            <span className="font-mono font-black text-lg block text-electric-blue">{stats.lives}/5</span>
          </div>
        </div>

        <hr className="border-void border-2" />

        {/* Progress bars */}
        <div className="flex flex-col gap-4">
          {/* Lessons */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="ui-label text-electric-blue text-xs">Lessons</span>
              <span className="font-mono text-xs text-ghost-white">{lessonsDone}/{totalLessons}</span>
            </div>
            <div className="w-full bg-void rounded-full h-3 overflow-hidden">
              <div
                role="progressbar"
                aria-label="Lessons progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={lessonsPct}
                className="bg-electric-blue h-3 rounded-full transition-all"
                style={{ width: lessonsPct + '%' }}
              />
            </div>
          </div>

          {/* Achievements */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="ui-label text-fuchsia-accent text-xs">Achievements</span>
              <span className="font-mono text-xs text-ghost-white">{achievementsUnlocked}/{achievementsTotal}</span>
            </div>
            <div className="w-full bg-void rounded-full h-3 overflow-hidden">
              <div
                role="progressbar"
                aria-label="Achievements progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={achievementsPct}
                className="bg-fuchsia-accent h-3 rounded-full transition-all"
                style={{ width: achievementsPct + '%' }}
              />
            </div>
          </div>

          {/* Daily Goal */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="ui-label text-flame-orange text-xs">Daily Goal</span>
              <span className="font-mono text-xs text-ghost-white">{daily.earned}/{daily.goal} XP</span>
            </div>
            <div className="w-full bg-void rounded-full h-3 overflow-hidden">
              <div
                role="progressbar"
                aria-label="Daily goal progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={dailyPct}
                className="bg-flame-orange h-3 rounded-full transition-all"
                style={{ width: dailyPct + '%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
