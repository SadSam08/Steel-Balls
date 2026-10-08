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
import type { SetItem, CustomExercise, WorkoutTemplate, TemplateExercise } from '../types';

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
          isStatic: Boolean(data.isStatic),
          weight: Number(data.weight || 0),
          reps: Number(data.reps || 1),
          bodyweightAtTime: Number(data.bodyweightAtTime || 0),
          isPR: Boolean(data.isPR),
          createdAt: data.createdAt || Date.now(),
          note: data.note || '',
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
        isStatic: Boolean(data.isStatic),
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
  const payload: Record<string, any> = {
    date: setData.date,
    exerciseId: setData.exerciseId,
    exerciseName: setData.exerciseName,
    isBodyweight: Boolean(setData.isBodyweight),
    isStatic: Boolean(setData.isStatic),
    weight: setData.weight,
    reps: setData.reps,
    bodyweightAtTime: setData.bodyweightAtTime,
    isPR: setData.isPR,
    createdAt: setData.createdAt || Date.now(),
  };
  if (setData.note) {
    payload.note = setData.note;
  }

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
 * Updates note for all sets of an exercise on a specific date.
 */
export async function updateExerciseNoteForDate(
  uid: string,
  exerciseId: string,
  date: string,
  note: string
): Promise<void> {
  const setsRef = collection(db, 'users', uid, 'sets');
  const q = query(setsRef, where('date', '==', date), where('exerciseId', '==', exerciseId));
  const snapshot = await getDocs(q);

  const trimmed = note.trim();
  const updatePromises = snapshot.docs.map((docSnap) =>
    updateDoc(docSnap.ref, { note: trimmed })
  );
  await Promise.all(updatePromises);
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
  isBodyweight: boolean,
  isStatic?: boolean
): Promise<CustomExercise> {
  const customRef = collection(db, 'users', uid, 'customExercises');
  const newDocRef = doc(customRef);
  const id = `custom_${newDocRef.id}`;
  const customDocRef = doc(db, 'users', uid, 'customExercises', id);

  const payload = { name, isBodyweight, isStatic: Boolean(isStatic) };
  await setDoc(customDocRef, payload);

  return { id, name, isBodyweight, isStatic: Boolean(isStatic) };
}

/**
 * Subscribes to real-time session notes for a given date from users/{uid}/dayNotes/{date}.
 */
export function subscribeDayNote(
  uid: string,
  date: string,
  onUpdate: (note: string) => void
) {
  const noteRef = doc(db, 'users', uid, 'dayNotes', date);
  return onSnapshot(noteRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data().text || '');
    } else {
      onUpdate('');
    }
  });
}

/**
 * Saves session notes for a given date in users/{uid}/dayNotes/{date}.
 * If text is empty, removes the document so no empty document is left.
 */
export async function saveDayNote(
  uid: string,
  date: string,
  text: string
): Promise<void> {
  const noteRef = doc(db, 'users', uid, 'dayNotes', date);
  const trimmed = text.trim();
  if (!trimmed) {
    await deleteDoc(noteRef);
  } else {
    await setDoc(noteRef, { text: trimmed, updatedAt: Date.now() }, { merge: true });
  }
}

/**
 * Subscribes to real-time changes for workout templates of a user.
 */
export function subscribeToUserTemplates(
  uid: string,
  onUpdate: (templates: WorkoutTemplate[]) => void,
  onError?: (err: Error) => void
) {
  const templatesRef = collection(db, 'users', uid, 'templates');
  const q = query(templatesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const templates: WorkoutTemplate[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || 'Untitled Template',
          exercises: Array.isArray(data.exercises) ? data.exercises : [],
          createdAt: data.createdAt || Date.now(),
        };
      });
      onUpdate(templates);
    },
    (err) => {
      console.error('Error listening to templates:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Saves or updates a workout template for a user.
 */
export async function saveWorkoutTemplate(
  uid: string,
  name: string,
  exercises: TemplateExercise[],
  existingTemplateId?: string
): Promise<string> {
  const templatesRef = collection(db, 'users', uid, 'templates');
  const docRef = existingTemplateId
    ? doc(db, 'users', uid, 'templates', existingTemplateId)
    : doc(templatesRef);

  const payload = {
    name: name.trim(),
    exercises: exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      isBodyweight: Boolean(ex.isBodyweight),
    })),
    createdAt: Date.now(),
  };

  await setDoc(docRef, payload, { merge: true });
  return docRef.id;
}

/**
 * Deletes a workout template for a user.
 */
export async function deleteWorkoutTemplate(
  uid: string,
  templateId: string
): Promise<void> {
  const templateRef = doc(db, 'users', uid, 'templates', templateId);
  await deleteDoc(templateRef);
}

