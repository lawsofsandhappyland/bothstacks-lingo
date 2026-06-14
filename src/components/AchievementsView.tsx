import type { UserStats } from '../types';
import { evaluateAchievements } from '../lib/achievements';

/**
 * Props for AchievementsView component.
 */
interface AchievementsViewProps {
  stats: UserStats;
  completedLessons: number[];
}

/**
 * A grid of achievement badges showing unlocked progress, with locked badges muted.
 * Badges are computed from the user's stats and completed lessons.
 */
export default function AchievementsView({ stats, completedLessons }: AchievementsViewProps) {
  const achievements = evaluateAchievements(stats, completedLessons);
  const unlocked = achievements.filter(a => a.unlocked).length;

  return (
    <div className="animate-fade-in-up w-full max-w-lg px-4 py-8 mx-auto">
      <div className="retro-card bg-deep-violet text-ghost-white flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-flame-orange tracking-tight">LOGROS</h2>
            <p className="ui-label text-slate-grey">Your earned badges</p>
          </div>
          <div className="bg-void px-4 py-2 rounded-xl border-2 border-void text-center">
            <span className="font-mono font-black text-lg text-fuchsia-accent">{unlocked}</span>
            <span className="font-mono text-slate-grey text-lg"> / {achievements.length}</span>
          </div>
        </div>

        <hr className="border-void border-2" />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {achievements.map(achievement => (
            <div
              key={achievement.id}
              className={
                achievement.unlocked
                  ? 'relative flex flex-col items-center gap-1 p-3 rounded-xl bg-void border-2 border-fuchsia-accent text-center'
                  : 'relative flex flex-col items-center gap-1 p-3 rounded-xl bg-void border-2 border-void text-center opacity-40 grayscale'
              }
              aria-label={`${achievement.title}: ${achievement.description}${achievement.unlocked ? ' (unlocked)' : ' (locked)'}`}
            >
              <span className="text-3xl select-none" role="img" aria-hidden="true">
                {achievement.icon}
              </span>
              {!achievement.unlocked && (
                <span className="absolute top-1 right-1 text-xs select-none" role="img" aria-label="locked">
                  🔒
                </span>
              )}
              <span className="ui-label text-xs text-ghost-white font-black leading-tight">
                {achievement.title}
              </span>
              <span className="text-[10px] text-slate-grey leading-tight">
                {achievement.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
