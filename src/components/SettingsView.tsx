import { useState } from 'react';
import type { UserStats } from '../types';
import { soundEffects } from '../lib/audio';
import ConfirmDialog from './ConfirmDialog';

interface SettingsViewProps {
  stats: UserStats;
  tutorModel: string;
  setTutorModel: (model: string) => void;
  resetStats: () => void;
}

const STYLE_TO_MODEL = {
  friendly: 'gemini-2.5-flash',
  patient: 'gemini-1.5-pro',
  fast: 'gemini-2.5-flash-lite',
} as const;

type TutorStyle = keyof typeof STYLE_TO_MODEL;

function modelToStyle(model: string): TutorStyle {
  const entry = (Object.entries(STYLE_TO_MODEL) as [TutorStyle, string][]).find(
    ([, v]) => v === model
  );
  return entry ? entry[0] : 'friendly';
}

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}

function Toggle({ checked, onChange, ariaLabel }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: 52,
        height: 30,
        borderRadius: 9999,
        background: checked ? 'var(--color-success-green)' : 'var(--color-raised-edge-3)',
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.2s ease',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 24 : 2,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s ease',
          display: 'block',
        }}
      />
    </button>
  );
}

export default function SettingsView({
  tutorModel,
  setTutorModel,
  resetStats,
}: SettingsViewProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Sound toggle
  const [soundOn, setSoundOn] = useState(() => !soundEffects.isMuted());

  // Animations toggle — persisted
  const [animOn, setAnimOn] = useState(() => {
    try {
      return localStorage.getItem('bothlingo_pref_anim') !== 'false';
    } catch {
      return true;
    }
  });

  const activeStyle = modelToStyle(tutorModel);

  const handleStyleClick = (style: TutorStyle) => {
    soundEffects.playTap();
    setTutorModel(STYLE_TO_MODEL[style]);
  };

  const handleSoundToggle = (next: boolean) => {
    setSoundOn(next);
    soundEffects.setMuted(!next);
  };

  const handleAnimToggle = (next: boolean) => {
    setAnimOn(next);
    try {
      localStorage.setItem('bothlingo_pref_anim', next ? 'true' : 'false');
    } catch { /* ignore */ }
    if (next) {
      document.documentElement.classList.remove('bl-reduce-anim');
    } else {
      document.documentElement.classList.add('bl-reduce-anim');
    }
  };

  const styleButtons: { style: TutorStyle; label: string }[] = [
    { style: 'friendly', label: '😊 Amigable' },
    { style: 'patient', label: '🧘 Paciente' },
    { style: 'fast', label: '⚡ Rápido' },
  ];

  return (
    <div className="animate-fade-in-up w-full max-w-lg px-4 py-8 mx-auto flex flex-col gap-4">
      {/* 1. Header card */}
      <div className="arcade-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <picture className="animate-float" style={{ flexShrink: 0 }}>
          <source srcSet="/mascot-tinker.webp" type="image/webp" />
          <img src="/mascot-tinker.png" alt="El Pingüino arreglando cosas" width={64} height={64} className="drop-shadow-lg" />
        </picture>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-flame-orange)', letterSpacing: '-0.02em' }}>
            Ajustes
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-body-lifted)', marginTop: 2 }}>
            Haz que BothLingo sea tuyo.
          </p>
        </div>
      </div>

      {/* 2. Estilo del tutor */}
      <div className="arcade-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p className="ui-label" style={{ color: 'var(--color-fuchsia-accent)' }}>Estilo del tutor</p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-body-lifted)' }}>
          Elige cómo suena El Pingüino cuando practicas en voz alta.
        </p>
        <div
          role="radiogroup"
          aria-label="Estilo del tutor"
          style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}
        >
          {styleButtons.map(({ style, label }) => {
            const isActive = activeStyle === style;
            return (
              <button
                key={style}
                role="radio"
                aria-checked={isActive}
                onClick={() => handleStyleClick(style)}
                style={{
                  background: isActive ? 'rgba(232,57,246,0.14)' : 'var(--color-void)',
                  border: isActive
                    ? '1.5px solid var(--color-fuchsia-accent)'
                    : '1.5px solid var(--color-raised-edge-3)',
                  borderRadius: 9999,
                  padding: '0.5rem 1.25rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: isActive ? '#fff' : 'var(--color-body-lifted)',
                  cursor: 'pointer',
                  letterSpacing: '0.03em',
                  transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Preferencias */}
      <div className="arcade-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p className="ui-label" style={{ color: 'var(--color-fuchsia-accent)' }}>Preferencias</p>

        {/* Sound */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-ghost-white)' }}>Efectos de sonido</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-body-lifted)', marginTop: 2 }}>Pops y campanitas al acertar.</p>
          </div>
          <Toggle
            checked={soundOn}
            onChange={handleSoundToggle}
            ariaLabel="Efectos de sonido"
          />
        </div>

        <div style={{ height: 1, background: 'var(--color-raised-edge)' }} />

        {/* Animations */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-ghost-white)' }}>Animaciones</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-body-lifted)', marginTop: 2 }}>Celebraciones y movimiento del camino.</p>
          </div>
          <Toggle
            checked={animOn}
            onChange={handleAnimToggle}
            ariaLabel="Animaciones"
          />
        </div>
      </div>

      {/* 4. Empezar de nuevo */}
      <div className="arcade-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p className="ui-label" style={{ color: 'var(--color-fuchsia-accent)' }}>Empezar de nuevo</p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-body-lifted)' }}>
          Borra tu XP, tu racha y tus lecciones. No se puede deshacer.
        </p>
        <button
          onClick={() => setConfirmOpen(true)}
          style={{
            background: 'transparent',
            border: '1.5px solid #5b1d1d',
            borderRadius: 9999,
            padding: '0.625rem 1.5rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#fca5a5',
            cursor: 'pointer',
            alignSelf: 'flex-start',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#3a1414'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          Reiniciar
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Empezar de nuevo?"
        message="Esto pone tu XP a 0 y restaura tus 5 vidas. No se puede deshacer."
        confirmLabel="Reiniciar"
        cancelLabel="Conservar mis datos"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { soundEffects.playHeartLost(); resetStats(); setConfirmOpen(false); }}
      />
    </div>
  );
}
