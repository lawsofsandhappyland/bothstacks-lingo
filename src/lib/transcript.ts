/** A grouped transcript turn: consecutive streaming chunks from one speaker. */
export interface TranscriptTurn {
  speaker: 'You' | 'Tutor';
  text: string;
}

/** A persistable tutor-session turn (speaker normalized for storage). */
export interface SessionTurn {
  speaker: 'user' | 'tutor';
  text: string;
}

/**
 * Appends a streaming transcription chunk to the turn list, grouping consecutive
 * chunks from the same speaker into ONE turn instead of one line per chunk. The
 * raw chunk text is concatenated as-is so the API's own spacing is preserved, and
 * a new turn starts only when the speaker changes. Returns the same array when the
 * chunk is empty.
 */
export function appendChunk(
  turns: TranscriptTurn[],
  speaker: TranscriptTurn['speaker'],
  text: string
): TranscriptTurn[] {
  if (!text) return turns;
  const last = turns[turns.length - 1];
  if (last && last.speaker === speaker) {
    return [...turns.slice(0, -1), { speaker, text: last.text + text }];
  }
  return [...turns, { speaker, text }];
}

/** Renders the transcript as plain text with Spanish speaker labels, one turn per line. */
export function formatTranscript(turns: TranscriptTurn[]): string {
  return turns
    .filter(turn => turn.text.trim().length > 0)
    .map(turn => `${turn.speaker === 'You' ? 'Tú' : 'El Pingüino'}: ${turn.text.trim()}`)
    .join('\n');
}

/** Normalizes display turns into persistable session turns, dropping empties. */
export function toSessionTurns(turns: TranscriptTurn[]): SessionTurn[] {
  return turns
    .map(turn => ({
      speaker: turn.speaker === 'You' ? ('user' as const) : ('tutor' as const),
      text: turn.text.trim(),
    }))
    .filter(turn => turn.text.length > 0);
}
