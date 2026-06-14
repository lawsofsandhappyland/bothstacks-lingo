import type { ReviewItem, LessonDue } from '../lib/review';

interface ReviewViewProps {
  dueItems: ReviewItem[];
  perLesson: LessonDue[];
  totalDue: number;
  noLives?: boolean;
  onStartReview: () => void;
}

export default function ReviewView({ dueItems, perLesson, totalDue, noLives = false, onStartReview }: ReviewViewProps) {
  return (
    <div data-testid="review-view" className="animate-fade-up" style={{ maxWidth: 900, width: '100%' }}>
      {/* Headline row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 24,
          marginBottom: 28,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 340px', minWidth: 0 }}>
          <p
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
            Repaso espaciado · todas tus lecciones
          </p>
          {totalDue > 0 ? (
            <h2
              style={{
                fontSize: 25,
                fontWeight: 800,
                textWrap: 'balance',
                maxWidth: 520,
                lineHeight: 1.3,
                color: 'var(--color-ghost-white)',
                marginBottom: 8,
              }}
            >
              {totalDue} palabra(s) se están enfriando —{' '}
              <span style={{ color: 'var(--color-flame-orange)' }}>repásalas antes de olvidarlas.</span>
            </h2>
          ) : (
            <h2
              style={{
                fontSize: 25,
                fontWeight: 800,
                textWrap: 'balance',
                maxWidth: 520,
                lineHeight: 1.3,
                color: 'var(--color-ghost-white)',
                marginBottom: 8,
              }}
            >
              ¡Vas al día!{' '}
              <span style={{ color: 'var(--color-flame-orange)' }}>
                no hay nada que repasar ahora mismo.
              </span>
            </h2>
          )}
          <p style={{ color: 'var(--color-body-lifted)', fontSize: 14, lineHeight: 1.5 }}>
            Cinco minutos hoy te ahorran volver a aprenderlas la semana que viene.
          </p>
        </div>

        <div style={{ flexShrink: 0, paddingTop: 4 }}>
          {totalDue > 0 ? (
            noLives ? (
              <div style={{ textAlign: 'right' }}>
                <button
                  disabled
                  className="pill-button"
                  style={{ fontSize: 13, padding: '10px 20px', opacity: 0.5, cursor: 'not-allowed' }}
                >
                  🧠 Sin vidas
                </button>
                <p style={{ color: 'var(--color-muted-2)', fontSize: 12, marginTop: 8, maxWidth: 220 }}>
                  Recupera vidas para empezar un repaso.
                </p>
              </div>
            ) : (
              <button
                onClick={onStartReview}
                className="pill-button pill-button-orange"
                style={{ fontSize: 13, padding: '10px 20px' }}
              >
                🧠 Empezar repaso · ~5 min
              </button>
            )
          ) : (
            <p style={{ color: 'var(--color-muted)', fontSize: 13, fontFamily: 'var(--font-mono)', maxWidth: 200, textAlign: 'right' }}>
              Sigue completando lecciones para llenar tu repaso.
            </p>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)',
          gap: 20,
        }}
        className="review-grid"
      >
        {/* Due queue card */}
        <div className="arcade-card" style={{ padding: 24 }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-muted)',
              marginBottom: 16,
            }}
          >
            Para repasar · memoria más débil primero
          </p>

          {dueItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-muted)' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🎉</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ¡Todo al día!
              </p>
              <p style={{ fontSize: 13, marginTop: 6, color: 'var(--color-muted-2)' }}>
                No hay palabras pendientes por ahora.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {dueItems.map((item) => {
                const strengthColor =
                  item.memoryStrength < 50
                    ? 'var(--color-flame-orange)'
                    : item.memoryStrength < 70
                    ? 'var(--color-electric-blue)'
                    : 'var(--color-success-green)';

                return (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: '0 0 auto', minWidth: 0 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--color-muted)',
                          display: 'block',
                          marginBottom: 2,
                        }}
                      >
                        {item.lessonRef}
                      </span>
                    </div>
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-ghost-white)', lineHeight: 1.2 }}>
                        {item.word}{' '}
                        <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>— {item.translation}</span>
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--color-muted-2)', marginTop: 2 }}>
                        practicado hace {item.lastPracticedDaysAgo} día(s)
                      </p>
                    </div>
                    <div style={{ flex: '0 0 auto', textAlign: 'right', minWidth: 110 }}>
                      <p
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          fontWeight: 700,
                          color: strengthColor,
                          marginBottom: 4,
                        }}
                      >
                        memoria {item.memoryStrength}%
                      </p>
                      <div
                        style={{
                          width: 92,
                          height: 5,
                          background: 'var(--color-raised-edge)',
                          borderRadius: 9999,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${item.memoryStrength}%`,
                            height: '100%',
                            background: strengthColor,
                            borderRadius: 9999,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Per lesson card */}
          <div className="arcade-card" style={{ padding: 20 }}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-muted)',
                marginBottom: 14,
              }}
            >
              Por lección
            </p>
            {perLesson.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-muted-2)' }}>
                Completa lecciones para ver el progreso.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {perLesson.map((lesson) => (
                  <div
                    key={lesson.lessonId}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--color-body-lifted)' }}>
                      {lesson.icon} {lesson.title}
                    </span>
                    {lesson.caughtUp ? (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--color-success-green)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        al día
                      </span>
                    ) : (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--color-flame-orange)',
                        }}
                      >
                        {lesson.dueCount} pendiente(s)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Why these — info card */}
          <div
            style={{
              background: '#13111f',
              border: '1px solid #2a3656',
              borderRadius: 20,
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
                color: '#7CA0E8',
                marginBottom: 10,
              }}
            >
              ¿Por qué estas?
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-body-lifted)', lineHeight: 1.6 }}>
              Cada palabra llega justo en su punto de repaso — lo bastante lejos como para que recordarla cueste,
              lo bastante cerca como para que aún puedas. Ese esfuerzo es lo que la fija.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
