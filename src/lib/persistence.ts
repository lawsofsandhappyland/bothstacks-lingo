import { db } from './firebase';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import type { UserStats } from '../types';

interface UserDoc {
  stats: UserStats;
  completedLessons: number[];
  tutorModel: string;
  updatedAt: number;
}

function userDocRef(uid: string) {
  return doc(db as Firestore, 'users', uid);
}

export async function loadUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(userDocRef(uid));
  if (!snap.exists()) return null;
  return snap.data() as UserDoc;
}

export async function saveUserDoc(uid: string, data: Omit<UserDoc, 'updatedAt'>): Promise<void> {
  await setDoc(userDocRef(uid), {
    ...data,
    updatedAt: Date.now(),
  });
}
