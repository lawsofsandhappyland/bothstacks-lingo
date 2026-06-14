import { useEffect, useState } from 'react';
import type { UserStats } from '../types';
import { dailyGoalProgress } from '../lib/progress';

interface DailyGoalProps {
  stats: UserStats;
}

export default function DailyGoal({ stats }: DailyGoalProps) {
  // Re-render on tab focus and periodically so the goal resets when the day
  // rolls over while the app stays open (dailyGoalProgress keys off the date).
  const [, setTick] = useState(0);
  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    const id = setInterval(refresh, 60000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(id);
    };
  }, []);

  const { earned, goal, met } = dailyGoalProgress(stats);
  const displayEarned = Math.min(earned, goal);
  const fillPct = `${Math.min(100, Math.round((earned / goal) * 100))}%`;

  return (
    <div className="w-full mt-2 px-1">
      <div className="flex items-center justify-between mb-1">
        <span className="ui-label text-[10px] text-slate-grey font-bold">Daily Goal</span>
        {met ? (
          <span className="ui-label text-[10px] text-green-400 font-bold">✅ {displayEarned}/{goal} XP</span>
        ) : (
          <span className="ui-label text-[10px] text-fuchsia-accent font-bold">{displayEarned}/{goal} XP</span>
        )}
      </div>
      <div
        role="progressbar"
        aria-label="Daily XP goal progress"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={displayEarned}
        className="w-full h-2 rounded-full bg-void border border-void overflow-hidden"
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: fillPct,
            background: met ? '#4ade80' : 'linear-gradient(90deg, var(--color-flame-orange, #ff6b2b), var(--color-fuchsia-accent, #e040fb))',
          }}
        />
      </div>
    </div>
  );
}
