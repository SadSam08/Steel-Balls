import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { SetItem, CustomExercise } from '../types';

/**
 * Subscribes to real-time changes for all sets of a user.
 */
export function subscribeToUserSets(
  uid: string,
  onUpdate: (sets: SetItem[]) => void,
  onError?: (err: Error) => void
) {
  const setsRef = collection(db, 'users', uid, 'sets');
  const q = query(setsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const sets: SetItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          date: data.date,
          exerciseId: data.exerciseId,
          exerciseName: data.exerciseName || data.exerciseId,
          isBodyweight: Boolean(data.isBodyweight),
          weight: Number(data.weight || 0),
          reps: Number(data.reps || 1),
          bodyweightAtTime: Number(data.bodyweightAtTime || 0),
          isPR: Boolean(data.isPR),
          createdAt: data.createdAt || Date.now(),
        };
      });
      onUpdate(sets);
    },
    (err) => {
      console.error('Error listening to sets:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to real-time changes for custom exercises.
 */
export function subscribeToCustomExercises(
  uid: string,
  onUpdate: (exercises: CustomExercise[]) => void
) {
  const customRef = collection(db, 'users', uid, 'customExercises');
  return onSnapshot(customRef, (snapshot) => {
    const custom: CustomExercise[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        isBodyweight: Boolean(data.isBodyweight),
      };
    });
    onUpdate(custom);
  });
}

/**
 * Adds a new set document for a user.
 */
export async function addWorkoutSet(
  uid: string,
  setData: Omit<SetItem, 'id'>
): Promise<string> {
  const setsRef = collection(db, 'users', uid, 'sets');
  const newDocRef = doc(setsRef);
  const payload = {
    date: setData.date,
    exerciseId: setData.exerciseId,
    exerciseName: setData.exerciseName,
    isBodyweight: setData.isBodyweight,
    weight: setData.weight,
    reps: setData.reps,
    bodyweightAtTime: setData.bodyweightAtTime,
    isPR: setData.isPR,
    createdAt: setData.createdAt || Date.now(),
  };

  await setDoc(newDocRef, payload);
  return newDocRef.id;
}

/**
 * Updates an existing set document.
 */
export async function updateWorkoutSet(
  uid: string,
  setId: string,
  updates: Partial<SetItem>
): Promise<void> {
  const setRef = doc(db, 'users', uid, 'sets', setId);
  await updateDoc(setRef, updates as Record<string, any>);
}

/**
 * Deletes a set document.
 */
export async function deleteWorkoutSet(uid: string, setId: string): Promise<void> {
  const setRef = doc(db, 'users', uid, 'sets', setId);
  await deleteDoc(setRef);
}

/**
 * Deletes all sets for a specific exercise on a specific date.
 */
export async function deleteExerciseSetsFromDate(
  uid: string,
  exerciseId: string,
  date: string
): Promise<void> {
  const setsRef = collection(db, 'users', uid, 'sets');
  const q = query(setsRef, where('date', '==', date), where('exerciseId', '==', exerciseId));
  const snapshot = await getDocs(q);

  const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletePromises);
}

/**
 * Adds a custom exercise to users/{uid}/customExercises.
 */
export async function createCustomExercise(
  uid: string,
  name: string,
  isBodyweight: boolean
): Promise<CustomExercise> {
  const customRef = collection(db, 'users', uid, 'customExercises');
  const newDocRef = doc(customRef);
  const id = `custom_${newDocRef.id}`;
  const customDocRef = doc(db, 'users', uid, 'customExercises', id);

  const payload = { name, isBodyweight };
  await setDoc(customDocRef, payload);

  return { id, name, isBodyweight };
}
