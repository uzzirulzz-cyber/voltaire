/**
 * firebase.ts — client-side Firebase Auth bootstrap (Task 27).
 *
 * Project gen-lang-client-0800809003, web app "ai-studio-applet-webapp".
 * The web config is public by design (it ships in every page load); the
 * service-account fragments stay server-side only and are NOT used here.
 *
 * IMPORTANT:
 *  - Client-only. Never import from server code.
 *  - Lazy initialization: getFirebaseAuth() initializes on first call (inside
 *    user event handlers), so importing this module during SSR/prerender is
 *    safe and no Firebase code runs until the user actually signs in.
 *  - The Firebase SDK is imported dynamically so it stays out of the initial
 *    page bundle.
 */

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCsODAXMFfkqz779F6GEqZR7BPmCfMPiTk',
  authDomain: 'gen-lang-client-0800809003.firebaseapp.com',
  projectId: 'gen-lang-client-0800809003',
  storageBucket: 'gen-lang-client-0800809003.firebasestorage.app',
  messagingSenderId: '1093973326302',
  appId: '1:1093973326302:web:daebb8ba222ce7bebd454f',
} as const;

/* Re-exported auth type (type-only — erased at build time) for consumers. */
export type { ConfirmationResult } from 'firebase/auth';

/* The lazily-created singleton auth instance. */
let authPromise: Promise<import('firebase/auth').Auth> | null = null;

/** Get (and lazily create) the Firebase Auth singleton. */
export async function getFirebaseAuth(): Promise<import('firebase/auth').Auth> {
  if (!authPromise) {
    authPromise = (async () => {
      const [{ initializeApp, getApps, getApp }, { getAuth }] =
        await Promise.all([import('firebase/app'), import('firebase/auth')]);
      const app = getApps().length
        ? getApp()
        : initializeApp(FIREBASE_CONFIG);
      return getAuth(app);
    })();
  }
  return authPromise;
}

/** The four federated providers offered in the auth modal. */
export type SocialProvider = 'google' | 'github' | 'facebook';

/**
 * Sign in with a federated provider (popup). Returns the ID token for
 * /api/auth/firebase. Throws FirebaseError with `code` on failure.
 */
export async function socialSignIn(
  provider: SocialProvider
): Promise<string> {
  const { GoogleAuthProvider, GithubAuthProvider, FacebookAuthProvider, signInWithPopup } =
    await import('firebase/auth');
  const auth = await getFirebaseAuth();

  const providerInstance =
    provider === 'google'
      ? new GoogleAuthProvider()
      : provider === 'github'
        ? new GithubAuthProvider()
        : new FacebookAuthProvider();

  const credential = await signInWithPopup(auth, providerInstance);
  return credential.user.getIdToken();
}

/**
 * Phone (SMS) step 1 — request a verification code.
 * `containerId` is the DOM id hosting the invisible reCAPTCHA.
 * Returns the ConfirmationResult used for step 2. Throws FirebaseError.
 */
export async function phoneSendCode(
  phoneNumber: string,
  containerId: string
): Promise<import('firebase/auth').ConfirmationResult> {
  const { RecaptchaVerifier, signInWithPhoneNumber } = await import(
    'firebase/auth'
  );
  const auth = await getFirebaseAuth();

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  });
  try {
    return await signInWithPhoneNumber(auth, phoneNumber, verifier);
  } catch (error) {
    // A failed challenge can't be reused — clean the widget so a retry
    // starts fresh.
    try {
      verifier.clear();
    } catch {
      /* already cleared */
    }
    throw error;
  }
}

/**
 * Phone (SMS) step 2 — confirm the 6-digit code. Returns the ID token for
 * /api/auth/firebase. Throws FirebaseError on a wrong/expired code.
 */
export async function phoneConfirmCode(
  confirmation: import('firebase/auth').ConfirmationResult,
  code: string
): Promise<string> {
  const credential = await confirmation.confirm(code);
  return credential.user.getIdToken();
}

/** Map Firebase auth error codes to friendly, actionable messages. */
export function firebaseErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'auth/unauthorized-domain':
      return 'This site\u2019s domain isn\u2019t in your Firebase project\u2019s Authorized domains yet — add it in Firebase Console \u2192 Authentication \u2192 Settings \u2192 Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method isn\u2019t enabled yet — turn it on in Firebase Console \u2192 Authentication \u2192 Sign-in method.';
    case 'auth/popup-blocked':
      return 'The sign-in popup was blocked — allow popups for this site and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled — try again whenever you\u2019re ready.';
    case 'auth/account-exists-with-different-credential':
      return 'That email is already registered with a different sign-in method — use the one you signed up with.';
    case 'auth/invalid-phone-number':
      return 'That phone number doesn\u2019t look right — include the country code, e.g. +1 555 123 4567.';
    case 'auth/invalid-verification-code':
      return 'That code isn\u2019t valid — check the 6-digit SMS code and try again.';
    case 'auth/code-expired':
      return 'That code expired — request a fresh one.';
    case 'auth/too-many-requests':
      return 'Too many attempts — wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network hiccup talking to Firebase — check your connection and retry.';
    default:
      // Non-Firebase errors (e.g. our API's own message) keep their text.
      if (
        typeof error === 'object' &&
        error !== null &&
        typeof (error as Error).message === 'string' &&
        (error as Error).message
      ) {
        return (error as Error).message;
      }
      return 'Firebase sign-in failed — please try again.';
  }
}
