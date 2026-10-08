export type WeightUnit = 'kg' | 'lb';

export interface UserProfile {
  height: number; // in cm
  bodyweight: number; // in preferred unit or kg
  age: number;
  gender: string;
  unit: WeightUnit;
  prCardOrder?: string[];
}

export interface SetItem {
  id: string;
  date: string; // YYYY-MM-DD format
  exerciseId: string;
  exerciseName: string; // cached for fast display
  isBodyweight: boolean; // cached for fast display
  isStatic?: boolean; // true for static/time-based bodyweight exercises
  weight: number; // Added weight if bodyweight, total weight if normal
  reps: number; // Rep count OR duration in seconds if isStatic
  bodyweightAtTime: number; // Bodyweight snapshot at the time of set creation
  isPR: boolean;
  createdAt: number; // timestamp ms
  note?: string; // Exercise note per exercise per day
}

export interface CustomExercise {
  id: string;
  name: string;
  isBodyweight: boolean;
  isStatic?: boolean;
}

export interface BuiltInExercise {
  id: string;
  name: string;
  isBodyweight: boolean;
  isStatic?: boolean;
}

export type Exercise = BuiltInExercise | CustomExercise;

export interface TemplateExercise {
  exerciseId: string;
  name: string;
  isBodyweight: boolean;
  isStatic?: boolean;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  createdAt: number;
}

export interface BodyweightLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number;
}

export interface PRItem {
  set: SetItem;
  epley1RM: number; // Estimated 1RM
  totalLoad: number; // weight + bodyweightAtTime (or just weight if not bodyweight)
}

export interface CurrentPRGroup {
  exerciseId: string;
  exerciseName: string;
  isBodyweight: boolean;
  isStatic?: boolean;
  reps: number;
  bestSet: SetItem;
  totalLoad: number;
}

export interface ChartDataPoint {
  date: string;
  weight: number; // Display weight (added weight for bodyweight, weight for normal)
  totalLoad: number;
  reps: number;
  isPR: boolean;
}
