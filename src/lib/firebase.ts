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
const auth = getAuth(app);
const db = getFirestore(app);

let authReadyPromise: Promise<User | null> | null = null;
let currentUser: User | null = null;

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

export { auth, db, getAuthReady, currentUser };
export type { User, Firestore };
