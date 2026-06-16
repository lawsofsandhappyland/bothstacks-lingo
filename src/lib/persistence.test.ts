import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock('./firebase', () => ({ db: {} }));

import { loadUserDoc, saveUserDoc } from './persistence';
import { doc, getDoc, setDoc } from 'firebase/firestore';

describe('loadUserDoc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(doc).mockReturnValue('DOC_REF' as never);
  });

  it('returns null when the snapshot does not exist', async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as never);
    const r = await loadUserDoc('uid-1');
    expect(r).toBeNull();
    expect(vi.mocked(doc)).toHaveBeenCalledWith(expect.anything(), 'users', 'uid-1');
  });

  it('returns the document data when the snapshot exists', async () => {
    const userData = {
      stats: { xp: 10, streak: 2, lives: 5, lastActiveDate: '2026-06-14' },
      completedLessons: [1, 2],
      tutorModel: 'gemini-x',
      updatedAt: 123,
    };
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => userData } as never);
    const r = await loadUserDoc('uid-2');
    expect(r).toEqual(userData);
    expect(vi.mocked(getDoc)).toHaveBeenCalledWith('DOC_REF');
  });
});

describe('saveUserDoc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(doc).mockReturnValue('DOC_REF' as never);
  });

  it('stamps updatedAt from Date.now() and writes via setDoc', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const payload = {
      stats: { xp: 1, streak: 0, lives: 5, lastActiveDate: null },
      completedLessons: [1],
      tutorModel: 'm',
    };
    await saveUserDoc('uid-9', payload);
    expect(vi.mocked(setDoc)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(setDoc)).toHaveBeenCalledWith('DOC_REF', { ...payload, updatedAt: 1700000000000 }, { merge: true });
  });

  it('builds the doc ref from the given uid', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const payload = {
      stats: { xp: 1, streak: 0, lives: 5, lastActiveDate: null },
      completedLessons: [1],
      tutorModel: 'm',
    };
    await saveUserDoc('uid-9', payload);
    expect(vi.mocked(doc)).toHaveBeenCalledWith(expect.anything(), 'users', 'uid-9');
  });
});
