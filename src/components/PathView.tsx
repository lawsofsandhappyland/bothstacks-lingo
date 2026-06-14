import { useState, useEffect, useRef } from 'react';
import type { Lesson, UserStats } from '../types';
import { soundEffects } from '../lib/audio';

/**
 * Props for the PathView component.
 * @property {Lesson[]} lessons - Array of lessons to display in the path.
 * @property {UserStats} stats - User statistics including lives and experience.
 * @property {number[]} completedLessons - IDs of lessons already completed by the user.
 * @property {(id: number) => void} onStartLesson - Callback triggered when starting a lesson.
 */
interface PathViewProps {
  lessons: Lesson[];
  stats: UserStats;
  completedLessons: number[]; // IDs of completed lessons
  onStartLesson: (id: number) => void;
}

/**
 * Duolingo-style staggered lesson path where nodes unlock sequentially as previous lessons complete.
 * Clicking an unlocked node opens a centered modal; locked nodes play an error sound.
 */
export default function PathView({ lessons, stats, completedLessons, onStartLesson }: PathViewProps) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selectedLesson) return;

    prevFocusRef.current = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        soundEffects.playTap();
        setSelectedLesson(null);
        return;
      }

      if (e.key === 'Tab' && cardRef.current) {
        const focusable = Array.from(
          cardRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      prevFocusRef.current?.focus();
    };
  }, [selectedLesson]);

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
    // Toggle modal
    if (selectedLesson?.id === lesson.id) {
      setSelectedLesson(null);
    } else {
      setSelectedLesson(lesson);
    }
  };

  const handleStart = (lessonId: number) => {
    soundEffects.playTap();
    setSelectedLesson(null);
    onStartLesson(lessonId);
  };

  const handleClose = () => {
    soundEffects.playTap();
    setSelectedLesson(null);
  };

  return (
    <div className="w-full relative min-h-[80vh] flex flex-col items-center">
      {/* Header Hero Card */}
      <div
        className="arcade-card-hero w-full max-w-lg mt-6 mx-auto flex items-center gap-4"
        style={{
          background: 'linear-gradient(120deg,#241038,#1a0e2e)',
          border: '1px solid #3a2456',
          borderRadius: '20px',
          padding: '20px 24px',
        }}
      >
        {/* Left: mascot */}
        <picture className="animate-float flex-shrink-0">
          <source srcSet="/mascot-wave.webp" type="image/webp" />
          <img src="/mascot-wave.png" alt="Greeting penguin" width={62} height={62} />
        </picture>

        {/* Middle: title + subline */}
        <div className="flex-1 min-w-0">
          <h3
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '22px',
              fontWeight: 900,
              color: 'var(--color-flame-orange)',
              lineHeight: 1.15,
              marginBottom: '4px',
            }}
          >
            Camino de Lingo
          </h3>
          <p style={{ color: 'var(--color-body-lifted)', fontSize: '13px', lineHeight: 1.4 }}>
            Aprende español con los Stacks — una lección a la vez.
          </p>
        </div>

        {/* Right: progress */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--color-fuchsia-accent)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            Progreso
          </span>
          <span data-testid="path-progress" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
            {completedLessons.length}{' '}
            <span style={{ color: 'var(--color-muted)' }}>/ {lessons.length}</span>
          </span>
        </div>
      </div>

      {/* Path Line and Staggered Nodes */}
      <div className="path-container mt-6 w-full relative">
        {/* Subtle dashed vertical center line */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '2px',
            top: '4rem',
            bottom: '4rem',
            borderLeft: '2px dashed var(--color-raised-edge)',
            zIndex: 1,
          }}
        />

        {lessons.map((lesson, index) => {
          const isCompleted = completedLessons.includes(lesson.id);
          // First lesson is always unlocked; subsequent lessons are unlocked if previous is completed.
          const isUnlocked = index === 0 || completedLessons.includes(lessons[index - 1].id);
          const isLocked = !isUnlocked;
          const isActive = isUnlocked && !isCompleted;

          const offsetStyle = {
            transform: `translateX(${getHorizontalOffset(index)}px)`,
          };

          // Node size and styles per state
          const nodeSize = isCompleted ? 88 : isActive ? 96 : 84;

          const nodeStyle: React.CSSProperties = isCompleted
            ? {
                width: `${nodeSize}px`,
                height: `${nodeSize}px`,
                backgroundColor: 'var(--color-flame-orange)',
                border: '4px solid var(--color-hard-shadow)',
                boxShadow: '0 6px 0 0 #7a3d14',
              }
            : isActive
              ? {
                  width: `${nodeSize}px`,
                  height: `${nodeSize}px`,
                  backgroundColor: 'var(--color-electric-blue)',
                  border: '4px solid var(--color-hard-shadow)',
                  boxShadow: '0 6px 0 0 #1a3e72',
                }
              : {
                  width: `${nodeSize}px`,
                  height: `${nodeSize}px`,
                  backgroundColor: '#1a1228',
                  border: '4px solid var(--color-hard-shadow)',
                  filter: 'grayscale(0.5)',
                  opacity: 0.85,
                };

          return (
            <div key={lesson.id} className="node-wrapper" style={offsetStyle}>
              {/* ESTÁS AQUÍ pill for active node */}
              {isActive && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    fontWeight: 800,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.08em',
                    backgroundColor: 'var(--color-fuchsia-accent)',
                    color: 'var(--color-void)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    marginBottom: '6px',
                    display: 'block',
                  }}
                >
                  ESTÁS AQUÍ
                </span>
              )}

              <button
                onClick={() => handleNodeClick(lesson, isLocked)}
                className={`path-node ${isCompleted ? 'completed' : ''} ${isActive ? 'active animate-pulse-glow' : ''} ${isLocked ? 'locked' : ''}`}
                style={nodeStyle}
                title={lesson.title}
              >
                <span style={{ fontSize: '32px', filter: 'drop-shadow(2px 2px 0px rgba(0,0,0,0.4))' }}>
                  {lesson.icon}
                </span>

                {/* Lock chip bottom-right for locked nodes */}
                {isLocked && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-4px',
                      right: '-4px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-void)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      zIndex: 3,
                    }}
                  >
                    🔒
                  </span>
                )}
              </button>

              <span
                className="ui-label text-[10px] mt-2 text-center max-w-[120px]"
                style={{ color: isLocked ? 'var(--color-muted-2)' : 'var(--color-slate-grey)' }}
              >
                {lesson.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Centered Fixed-Overlay Lesson Modal */}
      {selectedLesson && (
        <div
          className="animate-fade-up"
          onClick={handleClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(8,5,14,0.72)',
            backdropFilter: 'blur(4px)',
          }}
        >
          {/* Card — stop propagation so clicks inside don't close */}
          <div
            ref={cardRef}
            role="dialog"
            aria-modal={true}
            aria-labelledby="lesson-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '404px',
              width: '100%',
              borderRadius: '24px',
              background: 'linear-gradient(160deg,#241038,#180c28)',
              border: '1px solid #3a2456',
              boxShadow: '0 12px 0 0 var(--color-hard-shadow), 0 30px 60px rgba(0,0,0,0.6)',
              padding: '28px',
              position: 'relative',
            }}
          >
            {/* Close button */}
            <button
              ref={closeBtnRef}
              aria-label="Cerrar"
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-void)',
                border: '1px solid var(--color-raised-edge)',
                color: 'var(--color-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              ✕
            </button>

            {/* Icon tile */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                backgroundColor: 'var(--color-electric-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '30px',
                marginBottom: '16px',
              }}
            >
              {selectedLesson.icon}
            </div>

            {/* Fuchsia kicker */}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                color: 'var(--color-fuchsia-accent)',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Lección {selectedLesson.id} · Siguiente
            </span>

            {/* Title */}
            <h4
              id="lesson-modal-title"
              style={{
                fontSize: '21px',
                fontWeight: 900,
                color: 'var(--color-flame-orange)',
                lineHeight: 1.2,
                marginBottom: '4px',
              }}
            >
              {selectedLesson.title}
            </h4>

            {/* Subtitle */}
            <p
              style={{
                color: 'var(--color-muted)',
                fontSize: '12px',
                marginBottom: '12px',
              }}
            >
              {selectedLesson.subtitle}
            </p>

            {/* Description */}
            <p
              style={{
                color: 'var(--color-body-lifted)',
                fontSize: '14px',
                lineHeight: 1.55,
                marginBottom: '16px',
              }}
            >
              {selectedLesson.description}
            </p>

            {/* Reward row */}
            <div
              style={{
                backgroundColor: 'var(--color-void)',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.1em',
                  color: 'var(--color-muted)',
                }}
              >
                Recompensa
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--color-flame-orange)',
                }}
              >
                🎯 +{selectedLesson.xpReward} XP
              </span>
            </div>

            {/* Meta chips row */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              {[
                `${selectedLesson.exercises.length} ejercicios`,
                `~${selectedLesson.exercises.length} min`,
                `❤️ ${stats.lives} vidas`,
              ].map((chip) => (
                <span
                  key={chip}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: 'var(--color-card-alt)',
                    border: '1px solid var(--color-raised-edge-2)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    color: 'var(--color-body-lifted)',
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>

            {/* CTA button */}
            <button
              onClick={() => {
                if (stats.lives > 0) {
                  handleStart(selectedLesson.id);
                }
              }}
              disabled={stats.lives === 0}
              className={`pill-button pill-button-orange w-full ${stats.lives === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {stats.lives === 0 ? 'Sin vidas' : 'Empezar lección →'}
            </button>

            {stats.lives === 0 && (
              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--color-muted)',
                  textAlign: 'center' as const,
                  marginTop: '10px',
                  lineHeight: 1.45,
                }}
              >
                Necesitas vidas para empezar. Recupéralas con el tiempo o reinicia en Ajustes.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
