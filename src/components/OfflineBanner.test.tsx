import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import OfflineBanner from './OfflineBanner';

describe('OfflineBanner', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  it('renders nothing when navigator.onLine is true', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the banner when navigator.onLine is false at mount', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    render(<OfflineBanner />);
    expect(screen.getByText(/Sin conexión/)).toBeTruthy();
  });

  it('shows the banner on offline event and hides it on online event', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    render(<OfflineBanner />);
    expect(screen.queryByText(/Sin conexión/)).toBeNull();

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText(/Sin conexión/)).toBeTruthy();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByText(/Sin conexión/)).toBeNull();
  });
});
