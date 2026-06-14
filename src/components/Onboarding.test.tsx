import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Onboarding from './Onboarding';
import { onboardingSlides } from '../lib/onboardingSlides';

describe('Onboarding', () => {
  it('renders onboardingSlides[0].title and body', () => {
    const onComplete = vi.fn();
    render(<Onboarding onComplete={onComplete} />);
    expect(screen.getByText(onboardingSlides[0].title)).toBeTruthy();
    expect(screen.getByText(onboardingSlides[0].body)).toBeTruthy();
  });

  it('clicking Siguiente shows the next slide title', async () => {
    if (onboardingSlides.length < 2) return;

    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Onboarding onComplete={onComplete} />);

    await user.click(screen.getByText('Siguiente'));
    expect(screen.getByText(onboardingSlides[1].title)).toBeTruthy();
  });

  it('advancing through all slides reveals ¡Vamos! and clicking it calls onComplete once', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Onboarding onComplete={onComplete} />);

    for (let i = 0; i < onboardingSlides.length - 1; i++) {
      await user.click(screen.getByText('Siguiente'));
    }

    expect(screen.getByText('¡Vamos!')).toBeTruthy();
    await user.click(screen.getByText('¡Vamos!'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('clicking Skip calls onComplete once', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Onboarding onComplete={onComplete} />);

    await user.click(screen.getByText('Skip'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
