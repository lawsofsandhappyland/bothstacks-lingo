import { useState } from 'react';
import type { UserStats } from '../types';
import type { ReviewLog } from '../lib/review';
import type { ActivityLog, RangeKey } from '../lib/analytics';
import {
  rangeSummary,
  trendPoints,
  activityHeatmap,
  masteryByTopic,
  weakestTopic,
  profileChips,
} from '../lib/analytics';
import { lessonsData } from '../lib/lessons';

interface ProgressViewProps {
  stats: UserStats;
  completedLessons: number[];
  reviewLog: ReviewLog;
  activityLog: ActivityLog;
}

const RANGE_OPTIONS: { key: RangeKey; label: string; caption: string }[] = [
  { key: '7D', label: '7D', caption: 'últimos 7 días' },
  { key: '30D', label: '30D', caption: 'últimos 30 días' },
  { key: 'ALL', label: 'TODO', caption: 'desde el inicio' },
];

/** Builds a compact SVG sparkline polyline from an array of values. */
function Sparkline({ points, width = 120, height = 36 }: { points: number[]; width?: number; height?: number }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const step = width / (points.length - 1);
  const coords = points.map((v, i) => {
    const x = i * step;
    const y = height - (v / max) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = coords[coords.length - 1].split(',');
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke="var(--color-flame-orange)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={parseFloat(last[0])}
        cy={parseFloat(last[1])}
        r={3}
        fill="var(--color-flame-orange)"
      />
    </svg>
  );
}

/**
 * Answer-first analytics dashboard for Progreso.
 */
export default function ProgressView({ stats, completedLessons, reviewLog, activityLog }: ProgressViewProps) {
  const [range, setRange] = useState<RangeKey>('30D');
  const [rangeKey, setRangeKey] = useState(0); // used to re-trigger animation

  const now = new Date();

  const rangeOption = RANGE_OPTIONS.find(r => r.key === range) ?? RANGE_OPTIONS[1];
  const summary = rangeSummary(activityLog, reviewLog, range, now);
  const trend = trendPoints(activityLog, range, now);
  const heatmap = activityHeatmap(activityLog, now, 12);
  const masteries = masteryByTopic(completedLessons, lessonsData, reviewLog, now);
  const weakest = weakestTopic(masteries);
  const chips = profileChips(stats, completedLessons, activityLog, reviewLog);

  const handleRange = (r: RangeKey) => {
    setRange(r);
    setRangeKey(k => k + 1);
  };

  const totalLessons = lessonsData.length;
  const lessonsDone = completedLessons.length;

  return (
    <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>

      {/* === Answer-first header card === */}
      <div className="arcade-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          {/* Left: headline */}
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <p
              data-testid="progreso-caption"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-muted)',
                marginBottom: 8,
              }}
            >
              {lessonsDone} de {totalLessons} lecciones · {rangeOption.caption}
            </p>

            {lessonsDone === 0 ? (
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: 'var(--color-ghost-white)',
                  lineHeight: 1.25,
                  textWrap: 'balance',
                  marginBottom: 8,
                }}
              >
                Empieza tu primera lección para ver tu progreso.
              </h2>
            ) : (
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: 'var(--color-ghost-white)',
                  lineHeight: 1.25,
                  textWrap: 'balance',
                  marginBottom: 8,
                }}
              >
                {weakest ? (
                  <>
                    Vas en buen camino —{' '}
                    <span style={{ color: 'var(--color-flame-orange)' }}>
                      {weakest.title.toLowerCase()} es tu punto débil.
                    </span>
                  </>
                ) : (
                  'Vas en buen camino — sigue practicando.'
                )}
              </h2>
            )}

            <p style={{ fontSize: 13, color: 'var(--color-body-lifted)', lineHeight: 1.5 }}>
              {summary.xp > 0
                ? `${summary.xp} XP ganados · ${summary.activeDays} días activos`
                : 'Completa una lección para empezar a acumular XP.'}
            </p>
          </div>

          {/* Right: range switcher */}
          <div
            role="radiogroup"
            aria-label="Rango de tiempo"
            style={{
              display: 'flex',
              gap: 4,
              background: 'var(--color-card-alt)',
              border: '1px solid var(--color-raised-edge)',
              borderRadius: 12,
              padding: 4,
              flexShrink: 0,
            }}
          >
            {RANGE_OPTIONS.map(opt => {
              const active = opt.key === range;
              return (
                <button
                  key={opt.key}
                  role="radio"
                  aria-checked={active}
                  onClick={() => handleRange(opt.key)}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: active ? '1px solid var(--color-raised-edge-2)' : '1px solid transparent',
                    background: active ? 'var(--color-card-surface)' : 'transparent',
                    color: active ? 'var(--color-ghost-white)' : 'var(--color-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* === Mastery by topic + trend card === */}
      <div
        className="arcade-card"
        style={{ padding: 24, display: 'flex', gap: 0, flexWrap: 'wrap' }}
      >
        {/* Left: mastery bars */}
        <div style={{ flex: '1 1 240px', minWidth: 0, paddingRight: 20 }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-muted)',
              marginBottom: 14,
            }}
          >
            Dominio por tema
          </p>

          {masteries.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-muted-2)' }}>
              Completa una lección para ver tu dominio.
            </p>
          ) : (
            <div key={rangeKey} className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {masteries.map(m => {
                const barColor =
                  m.mastery >= 70
                    ? 'var(--color-success-green)'
                    : m.mastery >= 45
                    ? 'var(--color-electric-blue)'
                    : 'var(--color-flame-orange)';
                return (
                  <div key={m.lessonId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--color-ghost-white)', width: 78, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.icon} {m.title}
                    </span>
                    <div
                      style={{ flex: 1, height: 7, background: 'var(--color-raised-edge)', borderRadius: 9999, overflow: 'hidden' }}
                    >
                      <div
                        role="progressbar"
                        aria-label={`Dominio de ${m.title}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={m.mastery}
                        style={{
                          width: `${m.mastery}%`,
                          height: '100%',
                          background: barColor,
                          borderRadius: 9999,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--color-muted)',
                        width: 30,
                        textAlign: 'right',
                        flexShrink: 0,
                      }}
                    >
                      {m.mastery}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            background: 'var(--color-raised-edge)',
            alignSelf: 'stretch',
            margin: '0 4px',
            flexShrink: 0,
          }}
        />

        {/* Right: sparkline */}
        <div
          style={{ flex: '0 0 160px', minWidth: 120, paddingLeft: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-muted)',
            }}
          >
            Tendencia
          </p>
          <div key={`trend-${rangeKey}`} className="animate-fade-up">
            <Sparkline points={trend} width={120} height={36} />
          </div>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--color-success-green)',
            }}
          >
            +{summary.xp} XP
          </p>
          <p style={{ fontSize: 11, color: 'var(--color-muted-2)' }}>
            {rangeOption.caption}
          </p>
        </div>
      </div>

      {/* === Habit heatmap card === */}
      <div className="arcade-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-muted)',
            }}
          >
            Ritmo · últimas 12 semanas
          </p>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--color-muted-2)' }}>menos</span>
            {([0, 1, 2, 3, 4] as const).map(lvl => (
              <div
                key={lvl}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background:
                    lvl === 0
                      ? 'var(--color-node-locked)'
                      : `color-mix(in srgb, var(--color-success-green) ${lvl * 22}%, var(--color-card-surface))`,
                }}
              />
            ))}
            <span style={{ fontSize: 10, color: 'var(--color-muted-2)' }}>más</span>
          </div>
        </div>

        {/* Grid: 7 rows (days of week), auto columns (weeks), oldest→newest */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: 'repeat(7, 12px)',
            gridAutoFlow: 'column',
            gap: 4,
            overflowX: 'auto',
          }}
        >
          {heatmap.map(cell => (
            <div
              key={cell.date}
              title={cell.date}
              style={{
                width: 12,
                height: 12,
                borderRadius: 4,
                background:
                  cell.level === 0
                    ? 'var(--color-node-locked)'
                    : `color-mix(in srgb, var(--color-success-green) ${cell.level * 22}%, var(--color-card-surface))`,
              }}
            />
          ))}
        </div>

        <p style={{ fontSize: 11, color: 'var(--color-muted-2)', marginTop: 12 }}>
          Ritmo, no rachas — los días de descanso se guardan, nunca se castigan.
        </p>
      </div>

      {/* === Week summary + profile === */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Left: metrics summary */}
        <div className="arcade-card" key={`summary-${rangeKey}`} style={{ flex: '1 1 220px', padding: 24 }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-muted)',
              marginBottom: 16,
            }}
          >
            Resumen · {rangeOption.caption}
          </p>

          <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(
              [
                { label: 'XP', value: summary.xp, delta: summary.deltas?.xp ?? null },
                { label: 'Sesiones', value: summary.sessions, delta: summary.deltas?.sessions ?? null },
                { label: 'Palabras repasadas', value: summary.wordsReviewed, delta: summary.deltas?.wordsReviewed ?? null },
                { label: 'Días activos', value: summary.activeDays, delta: null as number | null },
              ]
            ).map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--color-body-lifted)' }}>{row.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--color-ghost-white)' }}>
                    {row.value}
                  </span>
                  {row.delta !== null && (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        fontWeight: 700,
                        color: row.delta > 0 ? 'var(--color-success-green)' : 'var(--color-muted)',
                      }}
                    >
                      {row.delta > 0 ? `+${row.delta}` : `${row.delta}`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: profile chips */}
        <div className="arcade-card" style={{ flex: '1 1 200px', padding: 24 }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-muted)',
              marginBottom: 14,
            }}
          >
            Tu perfil
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {chips.map((chip, i) => (
              <div
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 9999,
                  background: 'var(--color-card-alt)',
                  border: '1px solid var(--color-raised-edge)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--color-ghost-white)',
                }}
              >
                <span>{chip.emoji}</span>
                <span>{chip.label}</span>
              </div>
            ))}
          </div>

          {stats.streak > 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-body-lifted)', lineHeight: 1.5 }}>
              Llevas {stats.streak} día(s) seguidos — la constancia es lo que fija el vocabulario.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
