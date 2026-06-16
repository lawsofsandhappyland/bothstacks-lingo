import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'both-stacks',
  appId: '1:831930974109:web:c0720c88715301c8b67974',
  apiKey: 'AIzaSyCBwEt51gD54-eWVagPhqWqtAFqkBbFvD4',
  authDomain: 'both-stacks.firebaseapp.com',
};

const app = initializeApp(firebaseConfig);
/** Firebase authentication instance. */
const auth = getAuth(app);
/** Firestore database instance. */
const db = getFirestore(app);

let authReadyPromise: Promise<User | null> | null = null;
let currentUser: User | null = null;

/**
 * Resolves the current anonymous Firebase user, signing in anonymously on first call.
 * Resolves null on authentication failure.
 * @returns A promise that resolves to the authenticated user or null.
 */
function getAuthReady(): Promise<User | null> {
  if (authReadyPromise) return authReadyPromise;

  authReadyPromise = new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;
        resolve(user);
        return;
      }
      try {
        const cred = await signInAnonymously(auth);
        currentUser = cred.user;
        resolve(cred.user);
      } catch (err) {
        console.error('Anonymous auth failed', err);
        resolve(null);
      }
    }, (err) => {
      console.error('Auth state error', err);
      resolve(null);
    });
    // listener lives for app lifetime — intentionally not unsubscribed
  });

  return authReadyPromise;
}

/**
 * Returns a fresh Firebase ID token for the current user, or null if signed out
 * or the token cannot be minted. Used to authenticate calls to the server's /api
 * endpoints (the server verifies it with firebase-admin).
 */
async function getIdToken(): Promise<string | null> {
  try {
    return (await auth.currentUser?.getIdToken()) ?? null;
  } catch {
    return null;
  }
}

export { auth, db, getAuthReady, currentUser, getIdToken };
export type { User, Firestore };
