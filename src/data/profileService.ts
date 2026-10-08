import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile, BodyweightLogEntry, SetItem } from '../types';
import { getTodayString } from '../utils/dateUtils';

const DEFAULT_PROFILE: UserProfile = {
  height: 175,
  bodyweight: 75,
  age: 25,
  gender: 'other',
  unit: 'kg',
};

/**
 * Subscribes to real-time changes of the user profile.
 */
export function subscribeUserProfile(
  uid: string,
  onUpdate: (profile: UserProfile) => void
) {
  const profileRef = doc(db, 'users', uid);
  return onSnapshot(profileRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      onUpdate({
        height: Number(data.height ?? DEFAULT_PROFILE.height),
        bodyweight: Number(data.bodyweight ?? DEFAULT_PROFILE.bodyweight),
        age: Number(data.age ?? DEFAULT_PROFILE.age),
        gender: String(data.gender ?? DEFAULT_PROFILE.gender),
        unit: (data.unit as 'kg' | 'lb') || DEFAULT_PROFILE.unit,
        prCardOrder: Array.isArray(data.prCardOrder) ? data.prCardOrder : [],
      });
    } else {
      setDoc(profileRef, DEFAULT_PROFILE).catch((err) =>
        console.error('Failed creating default profile:', err)
      );
      onUpdate(DEFAULT_PROFILE);
    }
  });
}

/**
 * Updates user profile and appends a bodyweight log entry if bodyweight changes.
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>,
  currentProfile: UserProfile
): Promise<void> {
  const newProfile = { ...currentProfile, ...updates };

  const profileRef = doc(db, 'users', uid);
  await setDoc(profileRef, newProfile, { merge: true });

  if (updates.bodyweight !== undefined && updates.bodyweight !== currentProfile.bodyweight) {
    const bwLogRef = collection(db, 'users', uid, 'bodyweightLog');
    await addDoc(bwLogRef, {
      date: getTodayString(),
      weight: updates.bodyweight,
      createdAt: Date.now(),
    });
  }
}

/**
 * Subscribes to bodyweight history log.
 */
export function subscribeBodyweightLog(
  uid: string,
  onUpdate: (logs: BodyweightLogEntry[]) => void
) {
  const bwLogRef = collection(db, 'users', uid, 'bodyweightLog');
  return onSnapshot(bwLogRef, (snap) => {
    const logs: BodyweightLogEntry[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        date: data.date,
        weight: Number(data.weight),
      };
    });
    logs.sort((a, b) => b.date.localeCompare(a.date));
    onUpdate(logs);
  });
}

/**
 * Deletes all Firestore documents for a user.
 */
export async function deleteAllUserData(uid: string): Promise<void> {
  const subcollections = ['sets', 'customExercises', 'bodyweightLog'];

  for (const sub of subcollections) {
    const subRef = collection(db, 'users', uid, sub);
    const snap = await getDocs(subRef);
    const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  }

  const profileRef = doc(db, 'users', uid);
  await deleteDoc(profileRef);
}

/**
 * Populates realistic sample workouts in Firestore under users/{uid}/sets.
 */
export async function loadDemoData(uid: string, currentBw: number = 75): Promise<void> {
  const now = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const sampleSets: SetItem[] = [
    { id: 'sample_1', date: daysAgo(21), exerciseId: 'bench-press', exerciseName: 'Barbell Bench Press', isBodyweight: false, weight: 60, reps: 10, bodyweightAtTime: currentBw, isPR: false, createdAt: Date.now() - 21 * 86400000 },
    { id: 'sample_2', date: daysAgo(21), exerciseId: 'bench-press', exerciseName: 'Barbell Bench Press', isBodyweight: false, weight: 80, reps: 5, bodyweightAtTime: currentBw, isPR: true, createdAt: Date.now() - 21 * 86400000 + 100 },
    { id: 'sample_3', date: daysAgo(21), exerciseId: 'dips', exerciseName: 'Chest / Tricep Dips', isBodyweight: true, weight: 0, reps: 12, bodyweightAtTime: currentBw, isPR: true, createdAt: Date.now() - 21 * 86400000 + 200 },
    { id: 'sample_4', date: daysAgo(21), exerciseId: 'dips', exerciseName: 'Chest / Tricep Dips', isBodyweight: true, weight: 15, reps: 6, bodyweightAtTime: currentBw, isPR: true, createdAt: Date.now() - 21 * 86400000 + 300 },
    { id: 'sample_5', date: daysAgo(14), exerciseId: 'barbell-squat', exerciseName: 'Barbell Back Squat', isBodyweight: false, weight: 100, reps: 5, bodyweightAtTime: currentBw, isPR: true, createdAt: Date.now() - 14 * 86400000 },
    { id: 'sample_6', date: daysAgo(14), exerciseId: 'barbell-squat', exerciseName: 'Barbell Back Squat', isBodyweight: false, weight: 110, reps: 3, bodyweightAtTime: currentBw, isPR: true, createdAt: Date.now() - 14 * 86400000 + 100 },
    { id: 'sample_7', date: daysAgo(14), exerciseId: 'pull-ups', exerciseName: 'Pull-ups', isBodyweight: true, weight: 10, reps: 8, bodyweightAtTime: currentBw, isPR: true, createdAt: Date.now() - 14 * 86400000 + 200 },
    { id: 'sample_8', date: daysAgo(7), exerciseId: 'bench-press', exerciseName: 'Barbell Bench Press', isBodyweight: false, weight: 85, reps: 5, bodyweightAtTime: currentBw, isPR: true, createdAt: Date.now() - 7 * 86400000 },
    { id: 'sample_9', date: daysAgo(7), exerciseId: 'bench-press', exerciseName: 'Barbell Bench Press', isBodyweight: false, weight: 95, reps: 2, bodyweightAtTime: currentBw, isPR: true, createdAt: Date.now() - 7 * 86400000 + 100 },
    { id: 'sample_10', date: daysAgo(3), exerciseId: 'dips', exerciseName: 'Chest / Tricep Dips', isBodyweight: true, weight: 20, reps: 5, bodyweightAtTime: currentBw, isPR: true, createdAt: Date.now() - 3 * 86400000 },
    { id: 'sample_11', date: daysAgo(3), exerciseId: 'dips', exerciseName: 'Chest / Tricep Dips', isBodyweight: true, weight: 30, reps: 3, bodyweightAtTime: currentBw, isPR: true, createdAt: Date.now() - 3 * 86400000 + 100 },
    { id: 'sample_12', date: daysAgo(0), exerciseId: 'barbell-squat', exerciseName: 'Barbell Back Squat', isBodyweight: false, weight: 120, reps: 3, bodyweightAtTime: currentBw, isPR: true, createdAt: Date.now() },
  ];

  const setsRef = collection(db, 'users', uid, 'sets');
  for (const s of sampleSets) {
    const docRef = doc(setsRef);
    await setDoc(docRef, s);
  }
}
