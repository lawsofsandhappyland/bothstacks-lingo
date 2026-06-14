import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressView from './ProgressView';
import { lessonsData } from '../lib/lessons';

describe('ProgressView', () => {
  it('renders XP, lessons fraction, and at least one progressbar', () => {
    render(
      <ProgressView
        stats={{ xp: 120, streak: 4, lives: 3, lastActiveDate: null, streakFreezes: 1 }}
        completedLessons={[1, 2]}
      />
    );

    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByText(`2/${lessonsData.length}`)).toBeTruthy();
    expect(screen.getAllByRole('progressbar').length >= 1).toBe(true);
  });
});
