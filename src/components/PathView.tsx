import { useState } from 'react';
import type { Lesson, UserStats } from '../types';
import { soundEffects } from '../lib/audio';

interface PathViewProps {
  lessons: Lesson[];
  stats: UserStats;
  completedLessons: number[]; // IDs of completed lessons
  onStartLesson: (id: number) => void;
}

export default function PathView({ lessons, stats, completedLessons, onStartLesson }: PathViewProps) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Stagger nodes horizontally (Duolingo snake style)
  const getHorizontalOffset = (index: number) => {
    const positions = [0, -45, 45, -45, 0];
    return positions[index % positions.length];
  };

  const handleNodeClick = (lesson: Lesson, isLocked: boolean) => {
    if (isLocked) {
      soundEffects.playIncorrect();
      return;
    }
    soundEffects.playTap();
    // Toggle popover
    if (selectedLesson?.id === lesson.id) {
      setSelectedLesson(null);
    } else {
      setSelectedLesson(lesson);
    }
  };

  const handleStart = (lessonId: number) => {
    soundEffects.playTap();
    onStartLesson(lessonId);
  };

  return (
    <div className="w-full relative min-h-[80vh] flex flex-col items-center">
      {/* Path Header Mascot decoration */}
      <div className="w-full max-w-lg mt-6 px-4 py-2 flex items-center justify-between bg-deep-violet border-3 border-void rounded-2xl shadow-[4px_4px_0_0_var(--color-void)]">
        <div className="flex items-center gap-3">
          <picture className="animate-float">
            <source srcSet="/mascot-wave.webp" type="image/webp" />
            <img src="/mascot-wave.png" alt="Greeting penguin" width={65} height={65} />
          </picture>
          <div>
            <h3 className="font-black text-lg text-flame-orange leading-tight">CAMINO DE LINGO</h3>
            <p className="ui-label text-[10px] text-slate-grey">Learn Spanish with the Stacks</p>
          </div>
        </div>
        <div className="text-right">
          <span className="ui-label text-xs text-fuchsia-accent block">Level Progress</span>
          <span className="font-mono text-sm font-black">{completedLessons.length} / {lessons.length} Lessons</span>
        </div>
      </div>

      {/* Path Line and Staggered Nodes */}
      <div className="path-container mt-6 w-full relative">
        <div className="path-line"></div>

        {lessons.map((lesson, index) => {
          const isCompleted = completedLessons.includes(lesson.id);
          // First lesson is always unlocked; subsequent lessons are unlocked if previous is completed.
          const isUnlocked = index === 0 || completedLessons.includes(lessons[index - 1].id);
          const isLocked = !isUnlocked;
          const isActive = isUnlocked && !isCompleted;
          
          const offsetStyle = {
            transform: `translateX(${getHorizontalOffset(index)}px)`
          };

          return (
            <div key={lesson.id} className="node-wrapper" style={offsetStyle}>
              {/* Crown for completed node */}
              {isCompleted && (
                <div className="node-crown text-lg">👑</div>
              )}
              
              <button
                onClick={() => handleNodeClick(lesson, isLocked)}
                className={`path-node ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                title={lesson.title}
                disabled={isLocked && stats.lives === 0}
              >
                <span className="text-3xl filter drop-shadow-md">{lesson.icon}</span>
                
                {/* Active glow indicator */}
                {isActive && (
                  <span className="absolute -inset-1 rounded-full border-3 border-fuchsia-accent animate-pulse-glow z-[-1]"></span>
                )}
              </button>

              <span className="ui-label text-[10px] text-slate-grey mt-2 text-center max-w-[120px]">
                {lesson.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Retro Floating Lesson Popover Panel */}
      {selectedLesson && (
        <div className="fixed inset-x-4 bottom-24 md:absolute md:inset-x-auto md:-bottom-4 w-auto max-w-sm mx-auto z-50 animate-fade-in-up">
          <div className="retro-card bg-deep-violet border-3 border-void p-5 text-ghost-white flex flex-col gap-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="ui-label text-[10px] text-fuchsia-accent block">Lesson {selectedLesson.id}</span>
                <h4 className="text-xl font-black text-flame-orange leading-tight">{selectedLesson.title}</h4>
                <p className="ui-label text-xs text-slate-grey mt-0.5">{selectedLesson.subtitle}</p>
              </div>
              <button 
                onClick={() => { soundEffects.playTap(); setSelectedLesson(null); }}
                className="bg-void text-slate-grey hover:text-ghost-white border-2 border-void rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-ghost-white/90 leading-relaxed">
              {selectedLesson.description}
            </p>

            <div className="flex justify-between items-center bg-void/50 p-2.5 rounded-xl border border-void">
              <span className="ui-label text-slate-grey text-[10px]">Reward</span>
              <span className="font-mono text-xs font-bold text-flame-orange">🎯 +{selectedLesson.xpReward} XP</span>
            </div>

            <button
              onClick={() => handleStart(selectedLesson.id)}
              disabled={stats.lives === 0}
              className={`pill-button pill-button-orange w-full ${stats.lives === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {stats.lives === 0 ? "REQUIRES LIVES" : "START LESSON"}
            </button>
            {stats.lives === 0 && (
              <p className="text-[10px] text-red-400 text-center font-bold">
                ⚠️ You have 0 lives! Reset your stats in Settings to recover your lives.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
