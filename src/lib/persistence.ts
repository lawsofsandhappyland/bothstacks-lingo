import { db } from './firebase';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import type { UserStats } from '../types';
import type { ReviewLog } from './review';

/**
 * User document shape persisted to Firestore.
 */
interface UserDoc {
  stats: UserStats;
  completedLessons: number[];
  tutorModel: string;
  reviewLog?: ReviewLog;
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
 * Writes the user document to Firestore, stamping updatedAt with the current time.
 */
export async function saveUserDoc(uid: string, data: Omit<UserDoc, 'updatedAt'>): Promise<void> {
  await setDoc(userDocRef(uid), {
    ...data,
    updatedAt: Date.now(),
  });
}
