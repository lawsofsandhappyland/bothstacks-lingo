export const XP_PER_LEVEL = 100;

export interface LevelInfo {
  level: number;
  title: string;
  xpIntoLevel: number;
  xpToNextLevel: number;
  pctToNext: number;
  isMaxRank: boolean;
}

const RANKS: { minLevel: number; title: string }[] = [
  { minLevel: 1,  title: 'Aprendiz' },
  { minLevel: 3,  title: 'Explorador' },
  { minLevel: 5,  title: 'Aventurero' },
  { minLevel: 8,  title: 'Conversador' },
  { minLevel: 12, title: 'Políglota' },
  { minLevel: 16, title: 'Maestro' },
  { minLevel: 20, title: 'Leyenda' },
];

export function rankTitle(level: number): string {
  let result = RANKS[0].title;
  for (const rank of RANKS) {
    if (level >= rank.minLevel) {
      result = rank.title;
    }
  }
  return result;
}

export function getLevelInfo(xp: number): LevelInfo {
  const safe = Math.max(0, Math.floor(xp));
  const level = Math.floor(safe / XP_PER_LEVEL) + 1;
  const xpIntoLevel = safe % XP_PER_LEVEL;
  const xpToNextLevel = XP_PER_LEVEL - xpIntoLevel;
  const pctToNext = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100);
  const title = rankTitle(level);
  const isMaxRank = title === RANKS[RANKS.length - 1].title;
  return { level, title, xpIntoLevel, xpToNextLevel, pctToNext, isMaxRank };
}
