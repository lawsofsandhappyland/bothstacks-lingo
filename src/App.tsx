import { lazy, Suspense, useEffect, useState } from 'react';
import type { ViewType, UserStats } from './types';
import { DEFAULT_STATS, computeLessonCompletion, loseLife, resetStats } from './lib/progress';
import { lessonsData } from './lib/lessons';
import { soundEffects } from './lib/audio';
import { getAuthReady } from './lib/firebase';
import { loadUserDoc, saveUserDoc } from './lib/persistence';

import Onboarding from './components/Onboarding';

// Lazy-loaded route views (code-split into separate chunks)
const PathView = lazy(() => import('./components/PathView'));
const LessonRunner = lazy(() => import('./components/LessonRunner'));
const TutorChat = lazy(() => import('./components/TutorChat'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const AchievementsView = lazy(() => import('./components/AchievementsView'));
const ProgressView = lazy(() => import('./components/ProgressView'));

const STORAGE_KEYS = {
  STATS: 'bothlingo_stats',
  COMPLETED: 'bothlingo_completed_lessons',
  MODEL: 'bothlingo_tutor_model'
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
 * Root application shell that bootstraps anonymous Firebase auth and loads user data from Firestore
 * with a localStorage fallback and one-time migration. Owns the global stats, streak, and
 * completed-lesson state, and switches between path, lesson, tutor, achievements, and settings
 * views with a first-run onboarding overlay.
 */
export default function App() {
  const [view, setView] = useState<ViewType>('path');
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [tutorModel, setTutorModel] = useState<string>(DEFAULT_TUTOR_MODEL);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
        setStats(readStoredJson(STORAGE_KEYS.STATS, DEFAULT_STATS));
        setCompletedLessons(readStoredJson(STORAGE_KEYS.COMPLETED, []));
        setTutorModel(readStoredText(STORAGE_KEYS.MODEL, DEFAULT_TUTOR_MODEL));
        setLoading(false);
        return;
      }

      setUid(user.uid);
      const remote = await loadUserDoc(user.uid);

      if (remote) {
        setStats(remote.stats);
        setCompletedLessons(remote.completedLessons);
        setTutorModel(remote.tutorModel || DEFAULT_TUTOR_MODEL);
        setLoading(false);
        return;
      }

      // No Firestore doc — migrate from localStorage
      const localStats = readStoredJson(STORAGE_KEYS.STATS, DEFAULT_STATS);
      const localCompleted = readStoredJson(STORAGE_KEYS.COMPLETED, []);
      const localModel = readStoredText(STORAGE_KEYS.MODEL, DEFAULT_TUTOR_MODEL);

      setStats(localStats);
      setCompletedLessons(localCompleted);
      setTutorModel(localModel);
      setLoading(false);

      // Seed Firestore with local data
      await saveUserDoc(user.uid, {
        stats: localStats,
        completedLessons: localCompleted,
        tutorModel: localModel,
      }).catch(() => {});

      // Clear localStorage after migration
      localStorage.removeItem(STORAGE_KEYS.STATS);
      localStorage.removeItem(STORAGE_KEYS.COMPLETED);
      localStorage.removeItem(STORAGE_KEYS.MODEL);
    });
  }, []);

  // Persist state to Firestore on change
  const syncToFirestore = (newStats: UserStats, newCompleted: number[], newModel: string) => {
    if (!uid) {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(newStats));
      localStorage.setItem(STORAGE_KEYS.COMPLETED, JSON.stringify(newCompleted));
      localStorage.setItem(STORAGE_KEYS.MODEL, newModel);
      return;
    }
    saveUserDoc(uid, {
      stats: newStats,
      completedLessons: newCompleted,
      tutorModel: newModel,
    }).catch((err) => console.error('Firestore save failed', err));
  };

  const handleLoseLife = () => {
    const updatedStats = loseLife(stats);
    setStats(updatedStats);
    syncToFirestore(updatedStats, completedLessons, tutorModel);
  };

  const handleLessonComplete = (xpReward: number) => {
    if (activeLessonId === null) return;

    const result = computeLessonCompletion(stats, completedLessons, activeLessonId, xpReward);
    setStats(result.stats);
    setCompletedLessons(result.completedLessons);
    syncToFirestore(result.stats, result.completedLessons, tutorModel);

    setActiveLessonId(null);
    setView('path');
  };

  const handleResetStats = () => {
    localStorage.removeItem(STORAGE_KEYS.STATS);
    localStorage.removeItem(STORAGE_KEYS.COMPLETED);
    localStorage.removeItem(LEGACY_API_KEY_STORAGE_KEY);

    const resetStatsValue = resetStats();
    setStats(resetStatsValue);
    setCompletedLessons([]);
    setActiveLessonId(null);
    setView('path');

    syncToFirestore(resetStatsValue, [], tutorModel);
  };

  const handleSetTutorModel = (m: string) => {
    setTutorModel(m);
    syncToFirestore(stats, completedLessons, m);
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

  return (
    <div className="min-h-screen bg-void text-ghost-white flex flex-col font-sans pb-28">
      {!loading && showOnboarding && <Onboarding onComplete={completeOnboarding} />}
      {view !== 'lesson' && (
        <header className="sticky top-0 bg-void/90 backdrop-blur-md border-b-3 border-void py-3.5 px-4 z-40 transition-all">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <picture>
                <source srcSet="/logomark.png" type="image/png" />
                <img src="/logomark.png" alt="Both Stacks Logomark" width={28} height={28} className="animate-float" />
              </picture>
              <h1 className="ui-label text-sm tracking-widest text-ghost-white font-black">
                Both<span className="text-flame-orange">Lingo</span>
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1" title="Daily Streak">
                <span className="text-base select-none">🔥</span>
                <span className="font-mono text-sm font-black text-fuchsia-accent">{stats.streak}</span>
              </div>
              <div className="flex items-center gap-1" title="Streak Freezes">
                <span className="text-base select-none">❄️</span>
                <span className="font-mono text-sm font-black text-electric-blue">{stats.streakFreezes ?? 0}</span>
              </div>
              <div className="flex items-center gap-1" title="XP Gained">
                <span className="text-base select-none">🎯</span>
                <span className="font-mono text-sm font-black text-flame-orange">{stats.xp} XP</span>
              </div>
              <div className="flex items-center gap-1" title="Hearts Remaining">
                <span className="text-base select-none">❤️</span>
                <span className="font-mono text-sm font-black text-electric-blue">{stats.lives}</span>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-grow flex items-center justify-center">
        <Suspense fallback={<div className="flex-grow flex items-center justify-center"><p className="ui-label text-slate-grey text-sm tracking-widest">CARGANDO...</p></div>}>
          {view === 'lesson' && activeLesson ? (
            <LessonRunner
              lesson={activeLesson}
              stats={stats}
              onLessonComplete={handleLessonComplete}
              onLoseLife={handleLoseLife}
              onQuit={() => { soundEffects.playTap(); setActiveLessonId(null); setView('path'); }}
            />
          ) : view === 'path' ? (
            <PathView
              lessons={lessonsData}
              stats={stats}
              completedLessons={completedLessons}
              onStartLesson={(id) => { setActiveLessonId(id); setView('lesson'); }}
            />
          ) : view === 'tutor' ? (
            <TutorChat />
          ) : view === 'achievements' ? (
            <AchievementsView stats={stats} completedLessons={completedLessons} />
          ) : view === 'progress' ? (
            <ProgressView stats={stats} completedLessons={completedLessons} />
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

      {view !== 'lesson' && (
        <nav className="floating-navbar select-none">
          <button
            onClick={() => handleNavClick('path')}
            className={`nav-pill ${view === 'path' ? 'active' : ''}`}
            aria-label="Path"
          >
            🗺️ <span className="hidden sm:inline">Path</span>
          </button>
          <button
            onClick={() => handleNavClick('tutor')}
            className={`nav-pill ${view === 'tutor' ? 'active' : ''}`}
            aria-label="Tutor"
          >
            🐧 <span className="hidden sm:inline">Tutor</span>
          </button>
          <button
            onClick={() => handleNavClick('achievements')}
            className={`nav-pill ${view === 'achievements' ? 'active' : ''}`}
            aria-label="Achievements"
          >
            🏆 <span className="hidden sm:inline">Logros</span>
          </button>
          <button
            onClick={() => handleNavClick('progress')}
            className={`nav-pill ${view === 'progress' ? 'active' : ''}`}
            aria-label="Progress"
          >
            📊 <span className="hidden sm:inline">Progreso</span>
          </button>
          <button
            onClick={() => handleNavClick('settings')}
            className={`nav-pill ${view === 'settings' ? 'active' : ''}`}
            aria-label="Settings"
          >
            ⚙️ <span className="hidden sm:inline">Ajustes</span>
          </button>
        </nav>
      )}
    </div>
  );
}
