import { useState, useEffect } from 'react';
import type { UserStats } from '../types';
import { msUntilNextLife } from '../lib/progress';

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours >= 1) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export default function HeartsCountdown({ stats }: { stats: UserStats }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [stats.livesUpdatedAt, stats.lives]);

  const remaining = msUntilNextLife(stats, now);
  if (remaining === null) { return null; }

  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--color-muted)',
        whiteSpace: 'nowrap',
      }}
    >
      próxima ❤️ en {formatRemaining(remaining)}
    </span>
  );
}
