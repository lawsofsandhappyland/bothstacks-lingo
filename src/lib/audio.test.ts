import { describe, it, expect } from 'vitest';
import { soundEffects } from './audio';

describe('soundEffects', () => {
  it('exports all expected sound functions', () => {
    expect(typeof soundEffects.playTap).toBe('function');
    expect(typeof soundEffects.playCorrect).toBe('function');
    expect(typeof soundEffects.playIncorrect).toBe('function');
    expect(typeof soundEffects.playHeartLost).toBe('function');
    expect(typeof soundEffects.playLevelUp).toBe('function');
  });

  it('playTap does not throw', () => {
    expect(() => soundEffects.playTap()).not.toThrow();
  });

  it('playCorrect does not throw', () => {
    expect(() => soundEffects.playCorrect()).not.toThrow();
  });

  it('playIncorrect does not throw', () => {
    expect(() => soundEffects.playIncorrect()).not.toThrow();
  });

  it('playHeartLost does not throw', () => {
    expect(() => soundEffects.playHeartLost()).not.toThrow();
  });

  it('playLevelUp does not throw', () => {
    expect(() => soundEffects.playLevelUp()).not.toThrow();
  });
});
