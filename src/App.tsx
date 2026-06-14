import { useEffect, useState } from 'react';
import type { ViewType, UserStats } from './types';
import { lessonsData } from './lib/lessons';
import { soundEffects } from './lib/audio';

// Subcomponents
import PathView from './components/PathView';
import LessonRunner from './components/LessonRunner';
import TutorChat from './components/TutorChat';
import SettingsView from './components/SettingsView';

const STORAGE_KEYS = {
  STATS: 'bothlingo_stats',
  COMPLETED: 'bothlingo_completed_lessons',
  MODEL: 'bothlingo_tutor_model'
};

const LEGACY_API_KEY_STORAGE_KEY = 'bothlingo_gemini_key';

const DEFAULT_STATS: UserStats = {
  xp: 0,
  streak: 0,
  lives: 5,
  lastActiveDate: null
};

function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) as T : fallback;
  } catch (error) {
    console.error(`Local storage read failed for ${key}`, error);
    return fallback;
  }
}

function readStoredText(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (error) {
    console.error(`Local storage read failed for ${key}`, error);
    return fallback;
  }
}

export default function App() {
  const [view, setView] = useState<ViewType>('path');
  const [stats, setStats] = useState<UserStats>(() => readStoredJson(STORAGE_KEYS.STATS, DEFAULT_STATS));
  const [completedLessons, setCompletedLessons] = useState<number[]>(() => readStoredJson(STORAGE_KEYS.COMPLETED, []));
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [tutorModel, setTutorModel] = useState<string>(() => readStoredText(STORAGE_KEYS.MODEL, 'gemini-2.5-flash'));

  useEffect(() => {
    localStorage.removeItem(LEGACY_API_KEY_STORAGE_KEY);
  }, []);

  const saveStats = (newStats: UserStats) => {
    setStats(newStats);
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(newStats));
  };

  const handleLoseLife = () => {
    const updatedStats = {
      ...stats,
      lives: Math.max(0, stats.lives - 1)
    };
    saveStats(updatedStats);
  };

  const handleLessonComplete = (xpReward: number) => {
    if (activeLessonId === null) return;

    // Add to completed lessons
    const wasAlreadyCompleted = completedLessons.includes(activeLessonId);
    const newCompleted = [...completedLessons];
    if (!newCompleted.includes(activeLessonId)) {
      newCompleted.push(activeLessonId);
      setCompletedLessons(newCompleted);
      localStorage.setItem(STORAGE_KEYS.COMPLETED, JSON.stringify(newCompleted));
    }

    // Update streak logic
    const todayStr = new Date().toDateString();
    let newStreak = stats.streak;

    if (stats.lastActiveDate === null) {
      newStreak = 1;
    } else if (stats.lastActiveDate !== todayStr) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      if (stats.lastActiveDate === yesterdayStr) {
        newStreak += 1;
      } else {
        // Streak broken
        newStreak = 1;
      }
    }

    const updatedStats: UserStats = {
      ...stats,
      xp: wasAlreadyCompleted ? stats.xp : stats.xp + xpReward,
      streak: newStreak,
      lives: stats.lives, // maintain current lives
      lastActiveDate: todayStr
    };

    saveStats(updatedStats);
    setActiveLessonId(null);
    setView('path');
  };

  const handleResetStats = () => {
    localStorage.removeItem(STORAGE_KEYS.STATS);
    localStorage.removeItem(STORAGE_KEYS.COMPLETED);
    localStorage.removeItem(LEGACY_API_KEY_STORAGE_KEY);
    setStats(DEFAULT_STATS);
    setCompletedLessons([]);
    setActiveLessonId(null);
    setView('path');
  };

  const activeLesson = lessonsData.find(l => l.id === activeLessonId);

  // Sound navigations helper
  const handleNavClick = (targetView: ViewType) => {
    soundEffects.playTap();
    setView(targetView);
  };

  return (
    <div className="min-h-screen bg-void text-ghost-white flex flex-col font-sans pb-28">
      {/* 1. Global stats top navbar (Hidden in active lesson mode) */}
      {view !== 'lesson' && (
        <header className="sticky top-0 bg-void/90 backdrop-blur-md border-b-3 border-void py-3.5 px-4 z-40 transition-all">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            {/* Mascot and Brand logo */}
            <div className="flex items-center gap-2">
              <picture>
                <source srcSet="/logomark.png" type="image/png" />
                <img src="/logomark.png" alt="Both Stacks Logomark" width={28} height={28} className="animate-float" />
              </picture>
              <h1 className="ui-label text-sm tracking-widest text-ghost-white font-black">
                Both<span className="text-flame-orange">Lingo</span>
              </h1>
            </div>

            {/* Profile Statistics badges */}
            <div className="flex items-center gap-4">
              {/* Streak */}
              <div className="flex items-center gap-1" title="Daily Streak">
                <span className="text-base select-none">🔥</span>
                <span className="font-mono text-sm font-black text-fuchsia-accent">{stats.streak}</span>
              </div>
              
              {/* XP */}
              <div className="flex items-center gap-1" title="XP Gained">
                <span className="text-base select-none">🎯</span>
                <span className="font-mono text-sm font-black text-flame-orange">{stats.xp} XP</span>
              </div>

              {/* Lives */}
              <div className="flex items-center gap-1" title="Hearts Remaining">
                <span className="text-base select-none">❤️</span>
                <span className="font-mono text-sm font-black text-electric-blue">{stats.lives}</span>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* 2. Main content view manager router */}
      <main className="flex-grow flex items-center justify-center">
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
        ) : (
          <SettingsView
            stats={stats}
            tutorModel={tutorModel}
            setTutorModel={(m) => { setTutorModel(m); localStorage.setItem(STORAGE_KEYS.MODEL, m); }}
            resetStats={handleResetStats}
          />
        )}
      </main>

      {/* 3. Bottom floating navigator control bar (Hidden in active lesson mode) */}
      {view !== 'lesson' && (
        <nav className="floating-navbar select-none">
          <button
            onClick={() => handleNavClick('path')}
            className={`nav-pill ${view === 'path' ? 'active' : ''}`}
          >
            🗺️ <span className="hidden sm:inline">Path</span>
          </button>
          <button
            onClick={() => handleNavClick('tutor')}
            className={`nav-pill ${view === 'tutor' ? 'active' : ''}`}
          >
            🐧 <span className="hidden sm:inline">Tutor</span>
          </button>
          <button
            onClick={() => handleNavClick('settings')}
            className={`nav-pill ${view === 'settings' ? 'active' : ''}`}
          >
            ⚙️ <span className="hidden sm:inline">Ajustes</span>
          </button>
        </nav>
      )}
    </div>
  );
}
