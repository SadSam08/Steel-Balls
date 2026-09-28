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
import type { User } from 'firebase/auth';

import { auth, googleProvider } from './firebase';
import { deleteAllUserData } from './profileService';

// Ensure any stale legacy demo token is purged
try {
  localStorage.removeItem('liftpulse_demo_user');
} catch {
  // Ignore storage access errors if any
}

export async function signUpWithEmail(email: string, pass: string): Promise<User> {
  const res = await createUserWithEmailAndPassword(auth, email, pass);
  return res.user;
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const res = await signInWithEmailAndPassword(auth, email, pass);
  return res.user;
}

export async function loginWithGoogle(): Promise<User> {
  const res = await signInWithPopup(auth, googleProvider);
  return res.user;
}

export async function sendResetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function deleteAccountAndAllData(reauthPassword?: string): Promise<void> {
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
        } catch {
          throw new Error('Re-authentication required. Please sign in again and retry account deletion.');
        }
      }
    }
    throw error;
  }
}
