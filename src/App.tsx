import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ViewType, UserStats, Lesson } from './types';
import { DEFAULT_STATS, computeLessonCompletion, loseLife, resetStats, regenerateLives, dailyGoalProgress, DAILY_XP_GOAL } from './lib/progress';
import { lessonsData } from './lib/lessons';
import { soundEffects } from './lib/audio';
import { getAuthReady } from './lib/firebase';
import { loadUserDoc, saveUserDoc } from './lib/persistence';
import { buildReviewQueue, dueItems, perLessonDue, collectVocab, markReviewed, selectReviewBatch } from './lib/review';
import type { ReviewLog } from './lib/review';
import { recordActivity, dayKey } from './lib/analytics';
import type { ActivityLog } from './lib/analytics';
import { evaluateAchievements } from './lib/achievements';
import { buildReviewLesson, REVIEW_SESSION_ID } from './lib/reviewSession';
import { plural } from './lib/format';

import Onboarding from './components/Onboarding';
import OfflineBanner from './components/OfflineBanner';

// Lazy-loaded route views (code-split into separate chunks)
const PathView = lazy(() => import('./components/PathView'));
const LessonRunner = lazy(() => import('./components/LessonRunner'));
const TutorChat = lazy(() => import('./components/TutorChat'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const AchievementsView = lazy(() => import('./components/AchievementsView'));
const ProgressView = lazy(() => import('./components/ProgressView'));
const ReviewView = lazy(() => import('./components/ReviewView'));

const STORAGE_KEYS = {
  STATS: 'bothlingo_stats',
  COMPLETED: 'bothlingo_completed_lessons',
  MODEL: 'bothlingo_tutor_model',
  REVIEW_LOG: 'bothlingo_review_log',
  ACTIVITY_LOG: 'bothlingo_activity_log',
};

const LEGACY_API_KEY_STORAGE_KEY = 'bothlingo_gemini_key';

const DEFAULT_TUTOR_MODEL = 'gemini-2.5-flash';

function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) as T : fallback;
  } catch {
    return fallback;
  }
}

function readStoredText(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

/**
 * One-time backfill for accounts that predate the activity log: they already hold
 * XP and completed lessons but have no per-day history, which would make the
 * Progreso dashboard read as empty. Seed a single entry dated to the last active
 * day so existing progress is reflected. Returns the same object when no seed is
 * needed (so callers can detect whether a persist is warranted by reference).
 */
function seedLegacyActivity(log: ActivityLog, stats: UserStats, completed: number[]): ActivityLog {
  if (Object.keys(log).length > 0 || (stats.xp ?? 0) <= 0) return log;
  const when = stats.lastActiveDate ? new Date(stats.lastActiveDate) : new Date();
  return { [dayKey(when)]: { xp: stats.xp, sessions: Math.max(1, completed.length) } };
}

const VIEW_META: Record<Exclude<ViewType, 'lesson'>, { crumb: string; title: string }> = {
  path: { crumb: 'Tu camino', title: 'Camino de Lingo' },
  repaso: { crumb: 'Repaso espaciado', title: 'Repaso' },
  tutor: { crumb: 'Práctica en vivo', title: 'Tutor de voz' },
  achievements: { crumb: 'Colección', title: 'Logros' },
  progress: { crumb: 'Tu progreso', title: 'Progreso' },
  settings: { crumb: 'Cuenta', title: 'Ajustes' },
};

/**
 * Root application shell that bootstraps anonymous Firebase auth and loads user data from Firestore
 * with a localStorage fallback and one-time migration. Owns the global stats, streak, and
 * completed-lesson state, and switches between path, lesson, tutor, achievements, and settings
 * views with a first-run onboarding overlay.
 */
export default function App() {
  const [view, setView] = useState<ViewType>('path');
  const mainRef = useRef<HTMLElement>(null);
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [tutorModel, setTutorModel] = useState<string>(DEFAULT_TUTOR_MODEL);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewLog, setReviewLog] = useState<ReviewLog>({});
  const [activityLog, setActivityLog] = useState<ActivityLog>({});
  const [reviewSession, setReviewSession] = useState<{ lesson: Lesson; keys: string[] } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return !localStorage.getItem('bothlingo_onboarded');
    } catch {
      return false;
    }
  });

  // Bootstrap: auth → load from Firestore (or migrate from localStorage)
  useEffect(() => {
    localStorage.removeItem(LEGACY_API_KEY_STORAGE_KEY);

    getAuthReady().then(async (user) => {
      if (!user) {
        // Auth failed — fall back to localStorage
        const regenedStored = regenerateLives(readStoredJson(STORAGE_KEYS.STATS, DEFAULT_STATS), new Date());
        setStats(regenedStored);
        try { localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(regenedStored)); } catch { /* ignore */ }
        const storedCompleted = readStoredJson<number[]>(STORAGE_KEYS.COMPLETED, []);
        setCompletedLessons(storedCompleted);
        setTutorModel(readStoredText(STORAGE_KEYS.MODEL, DEFAULT_TUTOR_MODEL));
        setReviewLog(readStoredJson<ReviewLog>(STORAGE_KEYS.REVIEW_LOG, {}));
        const seededStored = seedLegacyActivity(readStoredJson<ActivityLog>(STORAGE_KEYS.ACTIVITY_LOG, {}), regenedStored, storedCompleted);
        setActivityLog(seededStored);
        try { localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(seededStored)); } catch { /* ignore */ }
        setLoading(false);
        return;
      }

      setUid(user.uid);
      const remote = await loadUserDoc(user.uid);

      if (remote) {
        const regened = regenerateLives(remote.stats, new Date());
        setStats(regened);
        setCompletedLessons(remote.completedLessons);
        setTutorModel(remote.tutorModel || DEFAULT_TUTOR_MODEL);
        setReviewLog(remote.reviewLog ?? {});
        const baseRemoteLog = remote.activityLog ?? {};
        const seededRemoteLog = seedLegacyActivity(baseRemoteLog, regened, remote.completedLessons);
        setActivityLog(seededRemoteLog);
        // Persist a regen change (or a legacy activity backfill) BEFORE unblocking
        // interaction so this bootstrap write cannot race with (and clobber) a
        // quick first user action.
        if (regened !== remote.stats || seededRemoteLog !== baseRemoteLog) {
          await saveUserDoc(user.uid, {
            stats: regened,
            completedLessons: remote.completedLessons,
            tutorModel: remote.tutorModel || DEFAULT_TUTOR_MODEL,
            reviewLog: remote.reviewLog ?? {},
            activityLog: seededRemoteLog,
          }).catch(() => {});
        }
        setLoading(false);
        return;
      }

      // No Firestore doc — migrate from localStorage
      const localStats = readStoredJson(STORAGE_KEYS.STATS, DEFAULT_STATS);
      const localCompleted = readStoredJson(STORAGE_KEYS.COMPLETED, []);
      const localModel = readStoredText(STORAGE_KEYS.MODEL, DEFAULT_TUTOR_MODEL);
      const localReviewLog = readStoredJson<ReviewLog>(STORAGE_KEYS.REVIEW_LOG, {});
      const localActivityLog = readStoredJson<ActivityLog>(STORAGE_KEYS.ACTIVITY_LOG, {});

      const regenedLocal = regenerateLives(localStats, new Date());
      const seededLocalLog = seedLegacyActivity(localActivityLog, regenedLocal, localCompleted);
      setStats(regenedLocal);
      setCompletedLessons(localCompleted);
      setTutorModel(localModel);
      setReviewLog(localReviewLog);
      setActivityLog(seededLocalLog);
      setLoading(false);

      // Seed Firestore with the regenerated local data (persists the regen anchor)
      await saveUserDoc(user.uid, {
        stats: regenedLocal,
        completedLessons: localCompleted,
        tutorModel: localModel,
        reviewLog: localReviewLog,
        activityLog: seededLocalLog,
      }).catch(() => {});

      // Clear localStorage after migration
      localStorage.removeItem(STORAGE_KEYS.STATS);
      localStorage.removeItem(STORAGE_KEYS.COMPLETED);
      localStorage.removeItem(STORAGE_KEYS.MODEL);
      localStorage.removeItem(STORAGE_KEYS.REVIEW_LOG);
      localStorage.removeItem(STORAGE_KEYS.ACTIVITY_LOG);
    });
  }, []);

  // Apply persisted Animaciones preference before the user opens Settings
  useEffect(() => {
    try {
      if (localStorage.getItem('bothlingo_pref_anim') === 'false') {
        document.documentElement.classList.add('bl-reduce-anim');
      }
    } catch { /* ignore */ }
  }, []);

  // Regen lives while the app is open (checks every 60 s)
  useEffect(() => {
    const id = setInterval(() => {
      setStats(prev => regenerateLives(prev, new Date()));
    }, 60000);
    return () => clearInterval(id);
  }, []);

  // Move focus to main content region on view change for keyboard/screen-reader users
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [view]);

  // Persist state to Firestore on change
  const syncToFirestore = (newStats: UserStats, newCompleted: number[], newModel: string, newReviewLog: ReviewLog, newActivityLog: ActivityLog) => {
    if (!uid) {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(newStats));
      localStorage.setItem(STORAGE_KEYS.COMPLETED, JSON.stringify(newCompleted));
      localStorage.setItem(STORAGE_KEYS.MODEL, newModel);
      localStorage.setItem(STORAGE_KEYS.REVIEW_LOG, JSON.stringify(newReviewLog));
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(newActivityLog));
      return;
    }
    saveUserDoc(uid, {
      stats: newStats,
      completedLessons: newCompleted,
      tutorModel: newModel,
      reviewLog: newReviewLog,
      activityLog: newActivityLog,
    }).catch((err) => console.error('Firestore save failed', err));
  };

  const handleLoseLife = () => {
    const updatedStats = loseLife(stats);
    setStats(updatedStats);
    syncToFirestore(updatedStats, completedLessons, tutorModel, reviewLog, activityLog);
  };

  const handleLessonComplete = (xpReward: number) => {
    if (activeLessonId === null) return;

    const result = computeLessonCompletion(stats, completedLessons, activeLessonId, xpReward);
    setStats(result.stats);
    setCompletedLessons(result.completedLessons);

    // Mark that lesson's words as reviewed (closes the loop — just practiced = memory fresh)
    const keys = collectVocab([activeLessonId], lessonsData).map(v => v.key);
    const newLog = markReviewed(reviewLog, keys);
    setReviewLog(newLog);

    const earned = result.stats.xp - stats.xp;
    const newActivity = recordActivity(activityLog, earned, new Date());
    setActivityLog(newActivity);

    syncToFirestore(result.stats, result.completedLessons, tutorModel, newLog, newActivity);

    setActiveLessonId(null);
    setView('path');
  };

  const handleResetStats = () => {
    localStorage.removeItem(STORAGE_KEYS.STATS);
    localStorage.removeItem(STORAGE_KEYS.COMPLETED);
    localStorage.removeItem(LEGACY_API_KEY_STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEYS.REVIEW_LOG);
    localStorage.removeItem(STORAGE_KEYS.ACTIVITY_LOG);

    const resetStatsValue = resetStats();
    const emptyLog: ReviewLog = {};
    const emptyActivity: ActivityLog = {};
    setStats(resetStatsValue);
    setCompletedLessons([]);
    setActiveLessonId(null);
    setReviewLog(emptyLog);
    setActivityLog(emptyActivity);
    setView('path');

    syncToFirestore(resetStatsValue, [], tutorModel, emptyLog, emptyActivity);
  };

  const handleSetTutorModel = (m: string) => {
    setTutorModel(m);
    syncToFirestore(stats, completedLessons, m, reviewLog, activityLog);
  };

  const completeOnboarding = () => {
    try {
      localStorage.setItem('bothlingo_onboarded', 'true');
    } catch { /* ignore */ }
    setShowOnboarding(false);
  };

  const activeLesson = lessonsData.find(l => l.id === activeLessonId);

  const handleNavClick = (targetView: ViewType) => {
    soundEffects.playTap();
    setView(targetView);
  };

  // Spaced-repetition computations
  const queue = buildReviewQueue(completedLessons, lessonsData, reviewLog);
  const due = dueItems(queue);
  const totalDue = due.length;
  const perLesson = perLessonDue(completedLessons, lessonsData, reviewLog);

  const noLives = stats.lives <= 0;
  const onStartReview = () => {
    if (noLives) return;
    soundEffects.playTap();

    const batch = selectReviewBatch(queue, 8);
    if (batch.length === 0) return;

    const pool = collectVocab(completedLessons, lessonsData);
    const lesson = buildReviewLesson(batch, pool);
    const keys = batch.map(i => i.key);
    setReviewSession({ lesson, keys });
    setActiveLessonId(null);
    setView('lesson');
  };

  const handleReviewComplete = (xpReward: number) => {
    const result = computeLessonCompletion(stats, completedLessons, REVIEW_SESSION_ID, xpReward);
    const cleaned = result.completedLessons.filter(id => lessonsData.some(l => l.id === id));
    setStats(result.stats);
    setCompletedLessons(cleaned);
    const newLog = markReviewed(reviewLog, reviewSession?.keys ?? []);
    setReviewLog(newLog);
    const earned = result.stats.xp - stats.xp;
    const newActivity = recordActivity(activityLog, earned, new Date());
    setActivityLog(newActivity);
    syncToFirestore(result.stats, cleaned, tutorModel, newLog, newActivity);
    setReviewSession(null);
    setView('repaso');
  };

  // Level computed from XP
  const level = Math.floor(stats.xp / 100) + 1;

  // Nearest locked achievement for the right rail
  const achievementStatuses = evaluateAchievements(stats, completedLessons);
  const lockedAchievements = achievementStatuses.filter(a => !a.unlocked);
  const nextAchievement = lockedAchievements.length > 0
    ? lockedAchievements.reduce((best, a) => {
        const bestRatio = stats.xp >= 0
          ? (() => {
              switch (best.kind) {
                case 'xp': return stats.xp / best.threshold;
                case 'streak': return stats.streak / best.threshold;
                case 'lessons': return completedLessons.length / best.threshold;
                default: return 0;
              }
            })()
          : 0;
        const aRatio = (() => {
          switch (a.kind) {
            case 'xp': return stats.xp / a.threshold;
            case 'streak': return stats.streak / a.threshold;
            case 'lessons': return completedLessons.length / a.threshold;
            default: return 0;
          }
        })();
        return aRatio > bestRatio ? a : best;
      })
    : null;

  const getAchievementCurrent = (kind: string): number => {
    switch (kind) {
      case 'xp': return stats.xp;
      case 'streak': return stats.streak;
      case 'lessons': return completedLessons.length;
      default: return 0;
    }
  };

  // Daily goal
  const goalProgress = dailyGoalProgress(stats);

  // Nav items definition
  const navItems: { label: string; emoji: string; targetView: ViewType }[] = [
    { label: 'Camino', emoji: '🗺️', targetView: 'path' },
    { label: 'Repaso', emoji: '🧠', targetView: 'repaso' },
    { label: 'Tutor', emoji: '🐧', targetView: 'tutor' },
    { label: 'Logros', emoji: '🏆', targetView: 'achievements' },
    { label: 'Progreso', emoji: '📊', targetView: 'progress' },
    { label: 'Ajustes', emoji: '⚙️', targetView: 'settings' },
  ];

  // Loading screen while auth initializes
  if (loading) {
    return (
      <div className="min-h-screen bg-void text-ghost-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 animate-float">
          <picture>
            <source srcSet="/mascot.webp" type="image/webp" />
            <img src="/mascot.png" alt="Loading mascot" width={100} height={100} className="drop-shadow-xl" />
          </picture>
          <p className="ui-label text-slate-grey text-sm tracking-widest">CARGANDO...</p>
        </div>
      </div>
    );
  }

  // Lesson view: full-screen, no shell chrome
  if (view === 'lesson') {
    return (
      <div className="min-h-screen bg-void text-ghost-white font-sans">
        <a href="#main-content" className="sr-only-focusable">Skip to content</a>
        <OfflineBanner />
        {showOnboarding && <Onboarding onComplete={completeOnboarding} />}
        <main ref={mainRef} id="main-content" tabIndex={-1} className="flex-grow flex items-center justify-center">
          <Suspense fallback={<div className="flex-grow flex items-center justify-center"><p className="ui-label text-slate-grey text-sm tracking-widest">CARGANDO...</p></div>}>
            {reviewSession ? (
              <LessonRunner
                lesson={reviewSession.lesson}
                stats={stats}
                onLessonComplete={handleReviewComplete}
                onLoseLife={handleLoseLife}
                onQuit={() => { soundEffects.playTap(); setReviewSession(null); setView('repaso'); }}
              />
            ) : activeLesson ? (
              <LessonRunner
                lesson={activeLesson}
                stats={stats}
                onLessonComplete={handleLessonComplete}
                onLoseLife={handleLoseLife}
                onQuit={() => { soundEffects.playTap(); setActiveLessonId(null); setView('path'); }}
              />
            ) : null}
          </Suspense>
        </main>
      </div>
    );
  }

  const viewMeta = VIEW_META[view as Exclude<ViewType, 'lesson'>] ?? VIEW_META['path'];

  return (
    <div className="min-h-screen text-ghost-white font-sans bl-bg" style={{ paddingBottom: 96 }}>
      <a href="#main-content" className="sr-only-focusable">Skip to content</a>
      <OfflineBanner />
      {showOnboarding && <Onboarding onComplete={completeOnboarding} />}

      {/* Top header — sticky, blurred */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(13,10,20,0.82)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-raised-edge)',
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '12px 24px',
          }}
        >
          {/* Left: brand (mobile only) + view crumb + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {/* Brand block — mobile only */}
            <div
              className="bl-header-brand"
              style={{ display: 'none', alignItems: 'center', gap: 6, marginRight: 8 }}
            >
              <picture>
                <source srcSet="/logomark.png" type="image/png" />
                <img src="/logomark.png" alt="BothLingo" width={24} height={24} />
              </picture>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: 14, color: 'var(--color-ghost-white)' }}>
                Both<span style={{ color: 'var(--color-flame-orange)' }}>Lingo</span>
              </span>
            </div>
            <div className="bl-header-titles">
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-muted)',
                  marginBottom: 2,
                }}
              >
                {viewMeta.crumb}
              </p>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: 'var(--color-ghost-white)',
                  lineHeight: 1.1,
                }}
              >
                {viewMeta.title}
              </h1>
            </div>
          </div>

          {/* Right: stat chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div
              title="Daily Streak"
              style={{
                padding: '7px 13px',
                borderRadius: 9999,
                background: '#160C26',
                border: '1px solid #2A1840',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>🔥</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13, color: 'var(--color-fuchsia-accent)' }}>
                {stats.streak}
              </span>
            </div>
            <div
              title="Streak Freezes"
              style={{
                padding: '7px 13px',
                borderRadius: 9999,
                background: '#160C26',
                border: '1px solid #2A1840',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>❄️</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13, color: 'var(--color-electric-blue)' }}>
                {stats.streakFreezes ?? 0}
              </span>
            </div>
            <div
              title="XP Gained"
              style={{
                padding: '7px 13px',
                borderRadius: 9999,
                background: '#160C26',
                border: '1px solid #2A1840',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>🎯</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13, color: 'var(--color-flame-orange)' }}>
                {stats.xp} XP
              </span>
            </div>
            <div
              title="Hearts Remaining"
              style={{
                padding: '7px 13px',
                borderRadius: 9999,
                background: '#160C26',
                border: '1px solid #2A1840',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>❤️</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13, color: 'var(--color-ghost-white)' }}>
                {stats.lives}
              </span>
            </div>
            {/* Settings gear — mobile only (Ajustes is a sidebar item on desktop) */}
            <button
              className="bl-header-gear"
              aria-label="Ajustes"
              onClick={() => handleNavClick('settings')}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: 9999,
                background: '#160C26',
                border: '1px solid #2A1840',
                cursor: 'pointer',
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* Three-zone shell */}
      <div className="bl-shell">
        {/* Sidebar / bottom nav */}
        <aside className="bl-sidebar">
          {/* Brand block — desktop only */}
          <div className="bl-brand-block">
            <picture>
              <source srcSet="/logomark.png" type="image/png" />
              <img src="/logomark.png" alt="BothLingo logomark" width={34} height={34} />
            </picture>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: 21, color: 'var(--color-ghost-white)', lineHeight: 1 }}>
              Both<span style={{ color: 'var(--color-flame-orange)' }}>Lingo</span>
            </span>
          </div>

          {/* Navigation */}
          <nav className="bl-nav" aria-label="Main navigation">
            {navItems.map(({ label, emoji, targetView }) => (
              <button
                key={targetView}
                onClick={() => handleNavClick(targetView)}
                className={`bl-navbtn${view === targetView ? ' active' : ''}${targetView === 'settings' ? ' bl-navbtn-desktop-only' : ''}`}
                aria-current={view === targetView ? 'page' : undefined}
              >
                <span className="bl-navbtn-emoji">{emoji}</span>
                <span>{label}</span>
                {targetView === 'repaso' && totalDue > 0 && (
                  <span className="bl-navbtn-badge">{totalDue}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Profile card — desktop only */}
          <div className="bl-profile-card">
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'var(--color-void)',
                border: '2px solid var(--color-raised-edge-3)',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <picture>
                <source srcSet="/mascot-wave.webp" type="image/webp" />
                <img src="/mascot-wave.png" alt="El Pingüino" width={46} height={46} style={{ objectFit: 'cover' }} />
              </picture>
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-ghost-white)', lineHeight: 1.2 }}>El Pingüino</p>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--color-muted)',
                  marginTop: 2,
                }}
              >
                Nivel {level} · Aprendiz
              </p>
            </div>
          </div>
        </aside>

        {/* Content zone */}
        <div style={{ display: 'flex', flexWrap: 'wrap', padding: 28, gap: 28, alignItems: 'flex-start' }}>
          {/* Main content */}
          <main
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            style={{ flex: '1 1 440px', minWidth: 0 }}
          >
            <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}><p className="ui-label text-slate-grey text-sm tracking-widest">CARGANDO...</p></div>}>
              {view === 'path' ? (
                <PathView
                  lessons={lessonsData}
                  stats={stats}
                  completedLessons={completedLessons}
                  onStartLesson={(id) => { setActiveLessonId(id); setView('lesson'); }}
                />
              ) : view === 'repaso' ? (
                <ReviewView
                  dueItems={due}
                  perLesson={perLesson}
                  totalDue={totalDue}
                  noLives={noLives}
                  onStartReview={onStartReview}
                />
              ) : view === 'tutor' ? (
                <TutorChat />
              ) : view === 'achievements' ? (
                <AchievementsView stats={stats} completedLessons={completedLessons} />
              ) : view === 'progress' ? (
                <ProgressView stats={stats} completedLessons={completedLessons} reviewLog={reviewLog} activityLog={activityLog} />
              ) : (
                <SettingsView
                  stats={stats}
                  tutorModel={tutorModel}
                  setTutorModel={handleSetTutorModel}
                  resetStats={handleResetStats}
                />
              )}
            </Suspense>
          </main>

          {/* Right rail — path view only */}
          {view === 'path' && (
            <div
              style={{
                flex: '1 1 300px',
                maxWidth: 340,
                position: 'sticky',
                top: 104,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {/* Repaso de hoy */}
              <div
                className="arcade-card"
                style={{
                  background: 'linear-gradient(150deg,#2a1c12,#1c1030)',
                  border: '1px solid #3a2a18',
                  padding: 20,
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-muted)',
                    marginBottom: 8,
                  }}
                >
                  🧠 Repaso de hoy
                </p>
                {totalDue === 0 ? (
                  <>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ghost-white)', marginBottom: 12 }}>
                      ¡Todo al día! 🎉
                    </p>
                    <button
                      onClick={() => handleNavClick('repaso')}
                      className="pill-button pill-button-orange"
                      style={{ fontSize: 12, padding: '8px 16px', width: '100%' }}
                    >
                      Practicar de nuevo
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800, color: 'var(--color-flame-orange)' }}>
                        {totalDue}
                      </span>
                      {' '}
                      <span style={{ fontSize: 13, color: 'var(--color-body-lifted)' }}>palabras enfriándose</span>
                    </p>
                    {/* Up to 3 weakest due words with micro memory bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {due.slice(0, 3).map(item => (
                        <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ghost-white)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.word}
                          </span>
                          <div style={{ width: 60, height: 4, background: 'var(--color-raised-edge)', borderRadius: 9999, flexShrink: 0 }}>
                            <div
                              style={{
                                width: `${item.memoryStrength}%`,
                                height: '100%',
                                background: 'var(--color-flame-orange)',
                                borderRadius: 9999,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {noLives ? (
                      <>
                        <button
                          disabled
                          className="pill-button"
                          style={{ fontSize: 12, padding: '8px 16px', width: '100%', opacity: 0.5, cursor: 'not-allowed' }}
                        >
                          Sin vidas
                        </button>
                        <p style={{ fontSize: 11, color: 'var(--color-muted-2)', marginTop: 8 }}>
                          Recupera vidas para repasar.
                        </p>
                      </>
                    ) : (
                      <button
                        onClick={onStartReview}
                        className="pill-button pill-button-orange"
                        style={{ fontSize: 12, padding: '8px 16px', width: '100%' }}
                      >
                        Repasar · ~5 min
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Meta diaria */}
              <div className="arcade-card" style={{ padding: 20 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-muted)',
                    marginBottom: 8,
                  }}
                >
                  Meta diaria
                </p>
                <p style={{ marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: 'var(--color-flame-orange)' }}>
                    {goalProgress.earned}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--color-muted)', marginLeft: 4 }}>
                    / {DAILY_XP_GOAL} XP
                  </span>
                </p>
                <div style={{ height: 12, background: 'var(--color-raised-edge)', borderRadius: 9999, overflow: 'hidden', marginBottom: 8 }}>
                  <div
                    style={{
                      width: `${Math.min(100, (goalProgress.earned / DAILY_XP_GOAL) * 100)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--color-flame-orange), var(--color-fuchsia-accent))',
                      borderRadius: 9999,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
                {goalProgress.met ? (
                  <p style={{ fontSize: 12, color: 'var(--color-success-green)' }}>✅ ¡Meta del día cumplida!</p>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--color-body-lifted)' }}>
                    Te faltan {DAILY_XP_GOAL - goalProgress.earned} XP
                  </p>
                )}
              </div>

              {/* Racha */}
              <div className="arcade-card" style={{ padding: 20 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-muted)',
                    marginBottom: 6,
                  }}
                >
                  Racha
                </p>
                <p>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 900, color: 'var(--color-fuchsia-accent)' }}>
                    {stats.streak}
                  </span>
                  {' '}
                  <span style={{ fontSize: 13, color: 'var(--color-body-lifted)' }}>{stats.streak === 1 ? 'día seguido' : 'días seguidos'}</span>
                </p>
                {(stats.streakFreezes ?? 0) > 0 && (
                  <p style={{ fontSize: 12, color: 'var(--color-electric-blue)', marginTop: 6 }}>
                    ❄️ {plural(stats.streakFreezes ?? 0, 'congelación', 'congelaciones')}
                  </p>
                )}
              </div>

              {/* Próximo logro */}
              <div className="arcade-card" style={{ padding: 20 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-muted)',
                    marginBottom: 10,
                  }}
                >
                  Próximo logro
                </p>
                {nextAchievement === null ? (
                  <p style={{ fontSize: 13, color: 'var(--color-success-green)', fontWeight: 700 }}>
                    🏆 ¡Todos los logros desbloqueados!
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 24 }}>{nextAchievement.icon}</span>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ghost-white)' }}>{nextAchievement.title}</p>
                        <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1 }}>{nextAchievement.description}</p>
                      </div>
                    </div>
                    {(() => {
                      const current = getAchievementCurrent(nextAchievement.kind);
                      const remaining = nextAchievement.threshold - current;
                      return (
                        <>
                          <p style={{ fontSize: 12, color: 'var(--color-body-lifted)', marginBottom: 6 }}>
                            {remaining} más para desbloquear
                          </p>
                          <div style={{ height: 6, background: 'var(--color-raised-edge)', borderRadius: 9999, overflow: 'hidden', marginBottom: 4 }}>
                            <div
                              style={{
                                width: `${Math.min(100, (current / nextAchievement.threshold) * 100)}%`,
                                height: '100%',
                                background: 'var(--color-amethyst)',
                                borderRadius: 9999,
                              }}
                            />
                          </div>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)' }}>
                            {current} / {nextAchievement.threshold}
                          </p>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
