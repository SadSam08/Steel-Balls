import type { SetItem, CurrentPRGroup, ChartDataPoint } from '../types';

/**
 * Calculates total load for a set.
 * Bodyweight exercise: totalLoad = bodyweightAtTime + addedWeight
 * Non-bodyweight exercise: totalLoad = weight
 */
export function calculateTotalLoad(set: SetItem): number {
  if (set.isBodyweight) {
    const bw = set.bodyweightAtTime || 0;
    return bw + (set.weight || 0);
  }
  return set.weight || 0;
}

/**
 * Epley formula for estimated 1 Rep Max (1RM):
 * 1RM = weight * (1 + reps / 30)
 * Uses totalLoad for bodyweight exercises.
 */
export function calculateEpley1RM(set: SetItem): number {
  const load = calculateTotalLoad(set);
  if (set.reps <= 0 || load <= 0) return 0;
  if (set.reps === 1) return load;
  const est = load * (1 + set.reps / 30);
  return Math.round(est * 10) / 10;
}

/**
 * Computes Current PRs dynamically from PR-flagged sets.
 * Groups by exercise and rep count, picking the set with the highest total load (or most recent on tie).
 */
export function computeCurrentPRs(allSets: SetItem[]): CurrentPRGroup[] {
  const prSets = allSets.filter((s) => s.isPR);
  
  // Map key: `${exerciseId}_${reps}`
  const bestMap = new Map<string, SetItem>();

  for (const set of prSets) {
    const key = `${set.exerciseId}_${set.reps}`;
    const existing = bestMap.get(key);

    if (!existing) {
      bestMap.set(key, set);
    } else {
      const existingLoad = calculateTotalLoad(existing);
      const currentLoad = calculateTotalLoad(set);

      if (currentLoad > existingLoad) {
        bestMap.set(key, set);
      } else if (currentLoad === existingLoad) {
        // Tie breaker: most recent date/createdAt
        if (set.createdAt > existing.createdAt || set.date > existing.date) {
          bestMap.set(key, set);
        }
      }
    }
  }

  const results: CurrentPRGroup[] = [];
  bestMap.forEach((bestSet) => {
    results.push({
      exerciseId: bestSet.exerciseId,
      exerciseName: bestSet.exerciseName,
      isBodyweight: bestSet.isBodyweight,
      reps: bestSet.reps,
      bestSet,
      totalLoad: calculateTotalLoad(bestSet),
    });
  });

  // Sort by exercise name then reps ascending
  results.sort((a, b) => {
    if (a.exerciseName !== b.exerciseName) {
      return a.exerciseName.localeCompare(b.exerciseName);
    }
    return a.reps - b.reps;
  });

  return results;
}

/**
 * Finds the set with the highest estimated 1RM for a specific exercise that is not already marked as PR.
 */
export function findAutoPRCandidate(allSetsForExercise: SetItem[]): { set: SetItem; estimated1RM: number } | null {
  if (!allSetsForExercise.length) return null;

  let bestCandidate: SetItem | null = null;
  let maxEst = -1;

  for (const set of allSetsForExercise) {
    const est = calculateEpley1RM(set);
    if (est > maxEst) {
      maxEst = est;
      bestCandidate = set;
    }
  }

  if (!bestCandidate) return null;
  return { set: bestCandidate, estimated1RM: maxEst };
}

/**
 * Prepares chronological chart data for an exercise and rep count.
 */
export function getChartDataForExerciseReps(
  allSets: SetItem[],
  exerciseId: string,
  reps: number
): ChartDataPoint[] {
  const filtered = allSets.filter(
    (s) => s.exerciseId === exerciseId && s.reps === reps
  );

  // Sort chronologically
  filtered.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);

  return filtered.map((set) => ({
    date: set.date,
    weight: set.weight,
    totalLoad: calculateTotalLoad(set),
    reps: set.reps,
    isPR: set.isPR,
  }));
}
