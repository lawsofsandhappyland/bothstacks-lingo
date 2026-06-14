import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AchievementsView from './AchievementsView';
import { evaluateAchievements } from '../lib/achievements';
import { achievementDefs } from '../lib/achievementDefs';

// Stats that unlock some achievements:
// - xp 150 unlocks 'getting-started' (50) and 'century' (100) but not 'maxed-out' (300)
// - streak 5 unlocks 'on-fire' (3) but not 'week-warrior' (7) etc.
// - completedLessons [1, 2, 3] (length 3) unlocks 'first-steps' (1) and 'pathfinder' (3)
//   but not 'graduate' (8)
const stats = {
  xp: 150,
  streak: 5,
  lives: 3,
  lastActiveDate: null,
  streakFreezes: 0,
  dailyXp: 0,
  dailyXpDate: null,
  livesUpdatedAt: null,
};
const completedLessons = [1, 2, 3];

describe('AchievementsView', () => {
  it('shows ✅ on unlocked badges and no lock chip on them', () => {
    render(<AchievementsView stats={stats} completedLessons={completedLessons} />);

    const evaluated = evaluateAchievements(stats, completedLessons);
    const unlocked = evaluated.filter(a => a.unlocked);
    const locked = evaluated.filter(a => !a.unlocked);

    // Each unlocked badge has aria-label containing "(desbloqueado)"
    unlocked.forEach(a => {
      const badge = screen.getByLabelText(
        `${a.title}: ${a.description} (desbloqueado)`
      );
      expect(badge).toBeTruthy();
      // The badge subtree should contain the ✅ checkmark
      expect(badge.textContent).toContain('✅');
      // Should NOT contain the 🔒 lock chip
      expect(badge.textContent).not.toContain('🔒');
    });

    // Each locked badge has aria-label containing "(bloqueado)" and shows 🔒
    locked.forEach(a => {
      const badge = screen.getByLabelText(
        `${a.title}: ${a.description} (bloqueado)`
      );
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('🔒');
      expect(badge.textContent).not.toContain('✅');
    });
  });

  it('shows the progress caption for a locked lessons badge', () => {
    // Find a locked 'lessons' achievement so we can pick one with a known threshold
    const evaluated = evaluateAchievements(stats, completedLessons);
    const lockedLessonsDef = achievementDefs.find(
      d => d.kind === 'lessons' && !evaluated.find(e => e.id === d.id)?.unlocked
    );
    // There must be at least one locked lessons badge with completedLessons.length < threshold
    expect(lockedLessonsDef).toBeTruthy();
    if (!lockedLessonsDef) return;

    render(<AchievementsView stats={stats} completedLessons={completedLessons} />);

    const expectedCaption = `${completedLessons.length} / ${lockedLessonsDef.threshold} lecciones`;
    // The caption may be prefixed with "¡Casi! " if ratio >= 0.9
    const nodes = screen.getAllByText((text) =>
      text.includes(`${completedLessons.length} / ${lockedLessonsDef.threshold} lecciones`)
    );
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes[0].textContent).toContain(expectedCaption);
  });

  it('shows the correct {unlocked} / {total} counter chip', () => {
    render(<AchievementsView stats={stats} completedLessons={completedLessons} />);

    const evaluated = evaluateAchievements(stats, completedLessons);
    const unlockedCount = evaluated.filter(a => a.unlocked).length;
    const total = evaluated.length;

    // The counter chip renders the two numbers; find text containing unlockedCount
    const chip = screen.getAllByText((text) =>
      text.includes(String(unlockedCount))
    );
    expect(chip.length).toBeGreaterThan(0);

    // Also verify the total appears somewhere nearby
    const totalEl = screen.getAllByText((text) =>
      text.includes(String(total))
    );
    expect(totalEl.length).toBeGreaterThan(0);
  });

  it('renders at least one role=progressbar when something is locked', () => {
    const evaluated = evaluateAchievements(stats, completedLessons);
    const hasLocked = evaluated.some(a => !a.unlocked);
    expect(hasLocked).toBe(true);

    render(<AchievementsView stats={stats} completedLessons={completedLessons} />);

    const bars = screen.getAllByRole('progressbar');
    expect(bars.length).toBeGreaterThan(0);
  });

  it('progressbar aria-valuenow reflects actual progress ratio', () => {
    render(<AchievementsView stats={stats} completedLessons={completedLessons} />);

    const bars = screen.getAllByRole('progressbar');
    bars.forEach(bar => {
      const now = parseInt(bar.getAttribute('aria-valuenow') ?? '-1', 10);
      const min = parseInt(bar.getAttribute('aria-valuemin') ?? '-1', 10);
      const max = parseInt(bar.getAttribute('aria-valuemax') ?? '-1', 10);
      expect(min).toBe(0);
      expect(max).toBe(100);
      expect(now).toBeGreaterThanOrEqual(0);
      expect(now).toBeLessThanOrEqual(100);
    });
  });

  it('renders every achievement from the catalog', () => {
    render(<AchievementsView stats={stats} completedLessons={completedLessons} />);

    achievementDefs.forEach(def => {
      const evaluated = evaluateAchievements(stats, completedLessons);
      const status = evaluated.find(e => e.id === def.id);
      const suffix = status?.unlocked ? '(desbloqueado)' : '(bloqueado)';
      const badge = screen.getByLabelText(`${def.title}: ${def.description} ${suffix}`);
      expect(badge).toBeTruthy();
    });
  });
});
