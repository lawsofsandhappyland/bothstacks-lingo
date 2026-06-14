import { describe, it, expect } from 'vitest';
import { plural } from './format';

describe('plural', () => {
  it('returns singular form for n===1', () => {
    expect(plural(1, 'palabra', 'palabras')).toBe('1 palabra');
  });

  it('returns plural form for n===0', () => {
    expect(plural(0, 'palabra', 'palabras')).toBe('0 palabras');
  });

  it('returns plural form for n===3 with accent', () => {
    expect(plural(3, 'día', 'días')).toBe('3 días');
  });

  it('handles verb-agreement: 1 -> se está, many -> se están', () => {
    expect(plural(1, 'palabra se está enfriando', 'palabras se están enfriando')).toBe('1 palabra se está enfriando');
  });
});
