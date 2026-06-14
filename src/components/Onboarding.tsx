import { useState, useEffect } from 'react';
import { onboardingSlides } from '../lib/onboardingSlides';

/**
 * Props for Onboarding component.
 */
interface OnboardingProps {
  onComplete: () => void;
}

/**
 * A first-run full-screen slide overlay introducing the app, calling onComplete when finished or skipped.
 */
export default function Onboarding({ onComplete }: OnboardingProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (onboardingSlides.length === 0) {
      onComplete();
    }
  }, [onComplete]);

  if (onboardingSlides.length === 0) {
    return null;
  }

  const slide = onboardingSlides[index];
  const isLast = index === onboardingSlides.length - 1;

  return (
    <div className="fixed inset-0 z-[200] bg-void/95 flex items-center justify-center p-4">
      <div className="retro-card bg-deep-violet text-ghost-white rounded flex flex-col gap-6 w-full max-w-md border border-void">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-5xl select-none">{slide.icon}</span>
          <h2 className="text-flame-orange font-black text-2xl tracking-tight">{slide.title}</h2>
          <p className="text-ghost-white/90 text-sm leading-relaxed">{slide.body}</p>
        </div>

        <div className="flex justify-center gap-2">
          {onboardingSlides.map((_, i) => (
            <span
              key={i}
              className={`inline-block w-2 h-2 rounded-full ${i === index ? 'bg-fuchsia-accent' : 'bg-void'}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onComplete}
            className="text-slate-grey text-sm underline underline-offset-2 hover:text-ghost-white"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                onClick={() => setIndex(index - 1)}
                className="pill-button bg-void border-void text-ghost-white"
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (isLast) {
                  onComplete();
                } else {
                  setIndex(index + 1);
                }
              }}
              className="pill-button bg-flame-orange border-orange-900 text-void"
            >
              {isLast ? '¡Vamos!' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
