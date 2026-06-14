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
 * A responsive grid of achievement badges. Unlocked badges glow fuchsia.
 * Locked badges show as "locked treasure" with a progress hint bar.
 */
export default function AchievementsView({ stats, completedLessons }: AchievementsViewProps) {
  const achievements = evaluateAchievements(stats, completedLessons);
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const total = achievements.length;

  return (
    <div className="animate-fade-in-up w-full px-4 py-6">
      {/* Top row: intro line + counter chip */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <p
          style={{
            color: 'var(--color-body-lifted)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Cada lección, racha y reto te acerca a un nuevo logro.
        </p>
        <div
          style={{
            flexShrink: 0,
            backgroundColor: 'var(--color-card-alt)',
            border: '1px solid var(--color-raised-edge-2)',
            borderRadius: '9999px',
            padding: '4px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              fontSize: '13px',
              color: 'var(--color-fuchsia-accent)',
            }}
          >
            {unlockedCount}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: 'var(--color-muted)',
            }}
          >
            {' / '}{total}
          </span>
        </div>
      </div>

      {/* Badge grid: 2 cols mobile, 3 cols sm+ */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3"
        style={{ gap: '14px' }}
      >
        {achievements.map(achievement => {
          const { id, title, description, icon, kind, threshold, unlocked } = achievement;

          // Current value toward this badge's threshold
          let current: number;
          if (kind === 'xp') {
            current = stats.xp;
          } else if (kind === 'streak') {
            current = stats.streak;
          } else {
            current = completedLessons.length;
          }

          const ratio = Math.min(1, current / threshold);
          const pct = Math.min(100, ratio * 100);
          const nearlyDone = ratio >= 0.9;

          // Progress bar fill color
          let fillColor: string;
          if (nearlyDone) {
            fillColor = 'var(--color-flame-orange)';
          } else if (kind === 'lessons') {
            fillColor = 'var(--color-electric-blue)';
          } else if (kind === 'xp') {
            fillColor = 'var(--color-flame-orange)';
          } else {
            // streak
            fillColor = 'var(--color-fuchsia-accent)';
          }

          // Progress caption
          let captionText: string;
          if (kind === 'lessons') {
            captionText = `${current} / ${threshold} lecciones`;
          } else if (kind === 'xp') {
            captionText = `${current} / ${threshold} XP`;
          } else {
            captionText = `${current} / ${threshold} días`;
          }
          if (nearlyDone) {
            captionText = `¡Casi! ${captionText}`;
          }

          const ariaLabel = `${title}: ${description}${unlocked ? ' (desbloqueado)' : ' (bloqueado)'}`;

          if (unlocked) {
            return (
              <div
                key={id}
                aria-label={ariaLabel}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '20px 14px',
                  borderRadius: '18px',
                  background: 'linear-gradient(160deg,#2a1326,#1c1030)',
                  border: '1.5px solid var(--color-fuchsia-accent)',
                  boxShadow:
                    '0 0 22px rgba(232,57,246,0.22), 0 6px 0 0 var(--color-hard-shadow)',
                  textAlign: 'center',
                  gap: '6px',
                }}
              >
                {/* Unlocked checkmark */}
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '10px',
                    fontSize: '14px',
                    lineHeight: '1',
                  }}
                  role="img"
                  aria-label="desbloqueado"
                >
                  ✅
                </span>

                {/* Badge emoji */}
                <span
                  style={{
                    fontSize: '38px',
                    lineHeight: '1',
                    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
                  }}
                  role="img"
                  aria-hidden="true"
                >
                  {icon}
                </span>

                {/* Title */}
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#ffffff',
                    lineHeight: '1.2',
                  }}
                >
                  {title}
                </span>

                {/* Description */}
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-body-lifted)',
                    lineHeight: '1.3',
                  }}
                >
                  {description}
                </span>
              </div>
            );
          }

          // Locked badge — "locked treasure" style
          return (
            <div
              key={id}
              aria-label={ariaLabel}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px 14px 16px',
                borderRadius: '18px',
                backgroundColor: 'var(--color-card-tile)',
                border: '1px solid var(--color-raised-edge-3)',
                boxShadow: '0 6px 0 0 var(--color-hard-shadow)',
                textAlign: 'center',
                gap: '6px',
              }}
            >
              {/* Lock chip */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-void)',
                  border: '1px solid var(--color-raised-edge-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  lineHeight: '1',
                }}
                role="img"
                aria-label="bloqueado"
              >
                🔒
              </div>

              {/* Badge emoji, dimmed but legible */}
              <span
                style={{
                  fontSize: '36px',
                  lineHeight: '1',
                  opacity: 0.55,
                }}
                role="img"
                aria-hidden="true"
              >
                {icon}
              </span>

              {/* Title */}
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--color-body-lifted-2)',
                  lineHeight: '1.2',
                }}
              >
                {title}
              </span>

              {/* Description */}
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--color-muted)',
                  lineHeight: '1.3',
                }}
              >
                {description}
              </span>

              {/* Progress hint */}
              <div
                style={{
                  width: '100%',
                  marginTop: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {/* Progress track */}
                <div
                  style={{
                    height: '6px',
                    backgroundColor: 'var(--color-void)',
                    border: '1px solid var(--color-raised-edge-3)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    role="progressbar"
                    aria-label={`${achievement.title}: ${captionText}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(pct)}
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: fillColor,
                      borderRadius: '999px',
                    }}
                  />
                </div>

                {/* Caption */}
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: nearlyDone ? fillColor : 'var(--color-muted)',
                    lineHeight: '1.2',
                  }}
                >
                  {captionText}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
