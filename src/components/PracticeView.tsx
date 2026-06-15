import type { PracticeTarget } from '../lib/practice';

interface PracticeViewProps {
  targets: PracticeTarget[];
  level: number;
  rankTitle: string;
  noLives?: boolean;
  loading?: boolean;
  error?: string | null;
  onGenerate: () => void;
}

export default function PracticeView({
  targets,
  level,
  rankTitle,
  noLives = false,
  loading = false,
  error = null,
  onGenerate,
}: PracticeViewProps) {
  const isDisabled = noLives || loading || targets.length === 0;

  let buttonLabel = '✨ Generar práctica';
  if (loading) buttonLabel = 'Generando…';
  else if (noLives) buttonLabel = 'Sin vidas';

  return (
    <div data-testid="practice-view" className="animate-fade-up" style={{ maxWidth: 900, width: '100%' }}>
      {/* Headline block */}
      <div style={{ marginBottom: 28 }}>
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
          Práctica adaptativa · creada para ti
        </p>
        <h2
          style={{
            fontSize: 25,
            fontWeight: 800,
            textWrap: 'balance',
            maxWidth: 580,
            lineHeight: 1.3,
            color: 'var(--color-ghost-white)',
            marginBottom: 8,
          }}
        >
          El Pingüino generará ejercicios frescos para las palabras{' '}
          <span style={{ color: 'var(--color-flame-orange)' }}>que más te cuestan.</span>
        </h2>
        <p style={{ color: 'var(--color-body-lifted)', fontSize: 14, lineHeight: 1.5, marginBottom: 4 }}>
          La dificultad se adapta a tu nivel. Cuanto más practicas, más precisos se vuelven los ejercicios.
        </p>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--color-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Nivel {level} · {rankTitle}
        </p>
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
        {/* Target words card */}
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
            Palabras a practicar · memoria más débil primero
          </p>

          {targets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-muted)' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📚</p>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Sin vocabulario todavía
              </p>
              <p style={{ fontSize: 13, marginTop: 6, color: 'var(--color-muted-2)' }}>
                Completa algunas lecciones para desbloquear la práctica.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {targets.map(target => (
                <div
                  key={target.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 0',
                    borderBottom: '1px solid var(--color-raised-edge)',
                  }}
                >
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: 'var(--color-ghost-white)',
                      lineHeight: 1.2,
                    }}
                  >
                    {target.word}{' '}
                    <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>
                      — {target.translation}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Action button */}
          <div style={{ marginTop: 24 }}>
            <button
              onClick={isDisabled ? undefined : onGenerate}
              disabled={isDisabled}
              className="pill-button pill-button-orange"
              style={{
                fontSize: 14,
                padding: '12px 24px',
                opacity: isDisabled ? 0.5 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              {buttonLabel}
            </button>
            {noLives && !loading && (
              <p style={{ color: 'var(--color-muted-2)', fontSize: 12, marginTop: 8 }}>
                Recupera vidas para practicar.
              </p>
            )}
          </div>

          {/* Error box */}
          {error && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgb(23 6 6)',
                border: '1px solid rgb(153 27 27)',
              }}
            >
              <p style={{ fontSize: 13, color: 'rgb(252 165 165)', lineHeight: 1.5 }}>{error}</p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Why adaptive practice info card */}
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
              ¿Por qué práctica adaptativa?
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-body-lifted)', lineHeight: 1.6 }}>
              En lugar de ejercicios genéricos, el Pingüino genera preguntas pensadas exactamente
              para tus palabras más débiles y tu nivel actual. Practicar lo que te cuesta más es la
              forma más rápida de mejorar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
