import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function Thrower({ boom }: { boom: boolean }) {
  if (boom) {
    throw new Error('kaboom');
  }
  return <div>safe child</div>;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('shows the fallback when a child throws', () => {
    render(
      <ErrorBoundary>
        <Thrower boom={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('¡Ay, caramba!')).toBeTruthy();
    expect(
      screen.getByText('Something went wrong. Reloading usually fixes it.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
  });

  it('renders children normally when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Thrower boom={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('safe child')).toBeTruthy();
    expect(screen.queryByText('¡Ay, caramba!')).toBeNull();
  });
});
