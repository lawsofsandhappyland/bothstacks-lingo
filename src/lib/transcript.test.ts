import { describe, it, expect } from 'vitest';
import { appendChunk, formatTranscript, toSessionTurns, type TranscriptTurn } from './transcript';

describe('appendChunk', () => {
  it('groups consecutive chunks from the same speaker into one turn', () => {
    let turns: TranscriptTurn[] = [];
    turns = appendChunk(turns, 'Tutor', '¡Buen');
    turns = appendChunk(turns, 'Tutor', ' trabajo');
    turns = appendChunk(turns, 'Tutor', ' hoy!');
    expect(turns).toHaveLength(1);
    expect(turns[0]).toEqual({ speaker: 'Tutor', text: '¡Buen trabajo hoy!' });
  });

  it('starts a new turn when the speaker changes', () => {
    let turns: TranscriptTurn[] = [];
    turns = appendChunk(turns, 'You', 'Hola');
    turns = appendChunk(turns, 'Tutor', '¡Hola!');
    turns = appendChunk(turns, 'You', 'Adiós');
    expect(turns.map(t => t.speaker)).toEqual(['You', 'Tutor', 'You']);
    expect(turns.map(t => t.text)).toEqual(['Hola', '¡Hola!', 'Adiós']);
  });

  it('concatenates raw text without inserting spaces (preserves API spacing)', () => {
    let turns: TranscriptTurn[] = [];
    turns = appendChunk(turns, 'Tutor', 'Ho');
    turns = appendChunk(turns, 'Tutor', 'la');
    expect(turns[0].text).toBe('Hola');
  });

  it('ignores empty chunks and returns the same array reference', () => {
    const turns: TranscriptTurn[] = [{ speaker: 'You', text: 'Hola' }];
    const result = appendChunk(turns, 'You', '');
    expect(result).toBe(turns);
  });

  it('does not mutate the input array', () => {
    const turns: TranscriptTurn[] = [{ speaker: 'Tutor', text: 'Ho' }];
    const result = appendChunk(turns, 'Tutor', 'la');
    expect(turns[0].text).toBe('Ho');
    expect(result[0].text).toBe('Hola');
  });
});

describe('formatTranscript', () => {
  it('renders Spanish speaker labels, one turn per line, trimmed', () => {
    const turns: TranscriptTurn[] = [
      { speaker: 'You', text: '  Hola  ' },
      { speaker: 'Tutor', text: '¡Hola! ¿Cómo estás?' },
    ];
    expect(formatTranscript(turns)).toBe('Tú: Hola\nEl Pingüino: ¡Hola! ¿Cómo estás?');
  });

  it('drops turns whose text is empty after trimming', () => {
    const turns: TranscriptTurn[] = [
      { speaker: 'You', text: '   ' },
      { speaker: 'Tutor', text: 'Hola' },
    ];
    expect(formatTranscript(turns)).toBe('El Pingüino: Hola');
  });

  it('returns an empty string for no turns', () => {
    expect(formatTranscript([])).toBe('');
  });
});

describe('toSessionTurns', () => {
  it('normalizes speakers to user/tutor and trims text', () => {
    const turns: TranscriptTurn[] = [
      { speaker: 'You', text: '  Hola  ' },
      { speaker: 'Tutor', text: '¡Hola!' },
    ];
    expect(toSessionTurns(turns)).toEqual([
      { speaker: 'user', text: 'Hola' },
      { speaker: 'tutor', text: '¡Hola!' },
    ]);
  });

  it('drops empty turns', () => {
    const turns: TranscriptTurn[] = [
      { speaker: 'You', text: '  ' },
      { speaker: 'Tutor', text: 'Hola' },
    ];
    expect(toSessionTurns(turns)).toEqual([{ speaker: 'tutor', text: 'Hola' }]);
  });
});
