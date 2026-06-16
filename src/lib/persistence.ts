import { db } from './firebase';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import type { UserStats } from '../types';
import type { ReviewLog } from './review';
import type { ActivityLog } from './analytics';
import type { SessionTurn } from './transcript';

/** A saved voice-tutor conversation. */
export interface TutorSession {
  /** ISO timestamp of when the session started. */
  startedAt: string;
  turns: SessionTurn[];
}

/**
 * User document shape persisted to Firestore.
 */
interface UserDoc {
  stats: UserStats;
  completedLessons: number[];
  tutorModel: string;
  reviewLog?: ReviewLog;
  activityLog?: ActivityLog;
  tutorSessions?: TutorSession[];
  updatedAt: number;
}

function userDocRef(uid: string) {
  return doc(db as Firestore, 'users', uid);
}

/**
 * Loads a user's Firestore document by UID; returns null if not found.
 */
export async function loadUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(userDocRef(uid));
  if (!snap.exists()) return null;
  return snap.data() as UserDoc;
}

/**
 * Writes (merges) the user document to Firestore, stamping updatedAt with the
 * current time. Uses merge so a partial write (e.g. saving only tutorSessions)
 * does not clobber the other fields.
 */
export async function saveUserDoc(uid: string, data: Partial<Omit<UserDoc, 'updatedAt'>>): Promise<void> {
  await setDoc(userDocRef(uid), {
    ...data,
    updatedAt: Date.now(),
  }, { merge: true });
}
