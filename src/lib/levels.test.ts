import { describe, it, expect } from 'vitest';
import { getLevelInfo, rankTitle, XP_PER_LEVEL } from './levels';

describe('getLevelInfo', () => {
  it('xp 0 -> level 1, Aprendiz, xpIntoLevel 0, xpToNextLevel 100, pctToNext 0, isMaxRank false', () => {
    const info = getLevelInfo(0);
    expect(info.level).toBe(1);
    expect(info.title).toBe('Aprendiz');
    expect(info.xpIntoLevel).toBe(0);
    expect(info.xpToNextLevel).toBe(100);
    expect(info.pctToNext).toBe(0);
    expect(info.isMaxRank).toBe(false);
  });

  it('xp 99 -> level 1, xpIntoLevel 99, xpToNextLevel 1, pctToNext 99', () => {
    const info = getLevelInfo(99);
    expect(info.level).toBe(1);
    expect(info.xpIntoLevel).toBe(99);
    expect(info.xpToNextLevel).toBe(1);
    expect(info.pctToNext).toBe(99);
  });

  it('xp 100 -> level 2, xpIntoLevel 0, pctToNext 0', () => {
    const info = getLevelInfo(100);
    expect(info.level).toBe(2);
    expect(info.xpIntoLevel).toBe(0);
    expect(info.pctToNext).toBe(0);
  });

  it('xp 250 -> level 3, title Explorador', () => {
    const info = getLevelInfo(250);
    expect(info.level).toBe(3);
    expect(info.title).toBe('Explorador');
  });

  it('xp -50 -> clamps to level 1, title Aprendiz', () => {
    const info = getLevelInfo(-50);
    expect(info.level).toBe(1);
    expect(info.title).toBe('Aprendiz');
  });

  it('xp 2500 -> level 26, title Leyenda, isMaxRank true', () => {
    const info = getLevelInfo(2500);
    expect(info.level).toBe(26);
    expect(info.title).toBe('Leyenda');
    expect(info.isMaxRank).toBe(true);
  });
});

describe('rankTitle band edges', () => {
  it('rankTitle(2) === Aprendiz', () => {
    expect(rankTitle(2)).toBe('Aprendiz');
  });

  it('rankTitle(3) === Explorador', () => {
    expect(rankTitle(3)).toBe('Explorador');
  });

  it('rankTitle(5) === Aventurero', () => {
    expect(rankTitle(5)).toBe('Aventurero');
  });

  it('rankTitle(20) === Leyenda', () => {
    expect(rankTitle(20)).toBe('Leyenda');
  });
});

describe('XP_PER_LEVEL constant', () => {
  it('is 100', () => {
    expect(XP_PER_LEVEL).toBe(100);
  });
});
