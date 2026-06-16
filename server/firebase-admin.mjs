import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin access for the server: verifies Firebase ID tokens (so the
 * server trusts a cryptographically-verified uid instead of a client-supplied
 * string) and reads/writes the learner's structured profile in Firestore.
 *
 * On Cloud Run, applicationDefault() uses the runtime service account via the
 * metadata server (no key file). verifyIdToken needs only the projectId; the
 * Firestore reads/writes need roles/datastore.user on that service account.
 */

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCP_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  'both-stacks';

let cachedApp = null;
function getAdminApp() {
  if (cachedApp) return cachedApp;
  if (getApps().length) {
    cachedApp = getApps()[0];
    return cachedApp;
  }
  try {
    cachedApp = initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  } catch (error) {
    console.warn('firebase-admin init failed:', String(error.message || error).slice(0, 200));
    cachedApp = null;
  }
  return cachedApp;
}

/**
 * Verify a Firebase ID token and return the authenticated uid, or null if the
 * token is missing, invalid, expired, or admin is unavailable. Never throws.
 */
export async function verifyIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;
  const app = getAdminApp();
  if (!app) return null;
  try {
    const decoded = await getAuth(app).verifyIdToken(idToken);
    return decoded.uid || null;
  } catch (error) {
    console.warn('verifyIdToken failed:', String(error.message || error).slice(0, 160));
    return null;
  }
}

/**
 * Read the learner's structured profile from users/{uid}.learnerProfile.
 * Returns {} on a missing doc/field or any failure.
 */
export async function getLearnerProfile(uid) {
  if (!uid) return {};
  const app = getAdminApp();
  if (!app) return {};
  try {
    const snap = await getFirestore(app).doc(`users/${uid}`).get();
    return (snap.exists && snap.data()?.learnerProfile) || {};
  } catch (error) {
    console.warn('getLearnerProfile failed:', String(error.message || error).slice(0, 160));
    return {};
  }
}

/**
 * Merge the learner's structured profile into users/{uid} (merge write, so it
 * never clobbers stats/tutorSessions/etc). Best-effort; returns whether it wrote.
 */
export async function saveLearnerProfile(uid, profile) {
  if (!uid || !profile || typeof profile !== 'object') return false;
  const app = getAdminApp();
  if (!app) return false;
  try {
    await getFirestore(app).doc(`users/${uid}`).set(
      { learnerProfile: profile, updatedAt: Date.now() },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn('saveLearnerProfile failed:', String(error.message || error).slice(0, 160));
    return false;
  }
}
