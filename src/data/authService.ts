import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  reauthenticateWithPopup,
} from 'firebase/auth';

import { auth, googleProvider, isDemoConfig } from './firebase';
import { deleteAllUserData } from './profileService';

// Local storage key for demo mode session
const DEMO_USER_KEY = 'liftpulse_demo_user';

export function getStoredDemoUser(): { uid: string; email: string } | null {
  const raw = localStorage.getItem(DEMO_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function signUpWithEmail(email: string, pass: string): Promise<any> {
  if (isDemoConfig) {
    const demoUser = { uid: 'demo_user_123', email };
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    window.dispatchEvent(new Event('demo-auth-changed'));
    return demoUser;
  }

  const res = await createUserWithEmailAndPassword(auth, email, pass);
  return res.user;
}

export async function loginWithEmail(email: string, pass: string): Promise<any> {
  if (isDemoConfig) {
    const demoUser = { uid: 'demo_user_123', email };
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    window.dispatchEvent(new Event('demo-auth-changed'));
    return demoUser;
  }

  const res = await signInWithEmailAndPassword(auth, email, pass);
  return res.user;
}

export async function loginWithGoogle(): Promise<any> {
  if (isDemoConfig) {
    const demoUser = { uid: 'demo_user_123', email: 'sammmm' };
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    window.dispatchEvent(new Event('demo-auth-changed'));
    return demoUser;
  }

  const res = await signInWithPopup(auth, googleProvider);
  return res.user;
}

export async function sendResetPassword(email: string): Promise<void> {
  if (isDemoConfig) {
    return;
  }
  await sendPasswordResetEmail(auth, email);
}

export async function logoutUser(): Promise<void> {
  if (isDemoConfig) {
    localStorage.removeItem(DEMO_USER_KEY);
    window.dispatchEvent(new Event('demo-auth-changed'));
    return;
  }
  await signOut(auth);
}

export async function deleteAccountAndAllData(reauthPassword?: string): Promise<void> {
  if (isDemoConfig) {
    const demoUser = getStoredDemoUser();
    if (demoUser) {
      await deleteAllUserData(demoUser.uid);
    }
    localStorage.removeItem(DEMO_USER_KEY);
    window.dispatchEvent(new Event('demo-auth-changed'));
    return;
  }

  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user found.');

  const uid = user.uid;

  try {
    await deleteAllUserData(uid);
    await deleteUser(user);
  } catch (error: any) {
    if (error?.code === 'auth/requires-recent-login') {
      if (reauthPassword && user.email) {
        const credential = EmailAuthProvider.credential(user.email, reauthPassword);
        await reauthenticateWithCredential(user, credential);
        await deleteAllUserData(uid);
        await deleteUser(user);
        return;
      } else {
        try {
          await reauthenticateWithPopup(user, googleProvider);
          await deleteAllUserData(uid);
          await deleteUser(user);
          return;
        } catch (reauthErr) {
          throw new Error('Re-authentication required. Please sign in again and retry account deletion.');
        }
      }
    }
    throw error;
  }
}
