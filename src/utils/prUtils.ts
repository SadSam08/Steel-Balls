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
 * Checks whether set A strictly beats or replaces set B for the same exercise.
 *
 * Rules:
 * 1. Same rep: whichever has higher weight is the PR.
 * 2. Same weight: whichever has higher reps is the PR.
 * 3. Higher weight AND higher reps: A strictly dominates B.
 * 4. Same weight AND same reps: whichever is newer (createdAt / date) is the PR.
 */
function doesSetBeat(a: SetItem, b: SetItem): boolean {
  if (a.id === b.id) return false;

  const aWeight = a.weight ?? 0;
  const bWeight = b.weight ?? 0;
  const aReps = a.reps ?? 0;
  const bReps = b.reps ?? 0;

  // Condition 1: Same weight & same reps -> newer wins
  if (aWeight === bWeight && aReps === bReps) {
    if (a.createdAt !== b.createdAt) {
      return a.createdAt > b.createdAt;
    }
    const dateCmp = (a.date || '').localeCompare(b.date || '');
    if (dateCmp !== 0) {
      return dateCmp > 0;
    }
    return (a.id || '').localeCompare(b.id || '') > 0;
  }

  // Condition 2: Equal or higher on both dimensions, with at least one strictly higher
  // Covers:
  // - Same weight, higher reps (aWeight === bWeight && aReps > bReps)
  // - Same reps, higher weight (aReps === bReps && aWeight > bWeight)
  // - Higher weight AND higher reps (aWeight > bWeight && aReps > bReps)
  if (aWeight >= bWeight && aReps >= bReps) {
    return true;
  }

  return false;
}

/**
 * Computes Current PRs dynamically from PR-flagged sets.
 *
 * Rules:
 * - Same exercise, same rep: whichever is higher weight is PR.
 * - Same exercise, same weight: whichever is higher rep is PR.
 * - An exercise can have multiple PRs at a time, but at the same weight
 *   there can only be 1 PR, and at the same rep there can only be 1 PR.
 * - Dominated / superseded PRs are shown only in PR History.
 */
export function computeCurrentPRs(allSets: SetItem[]): CurrentPRGroup[] {
  const prSets = allSets.filter((s) => s.isPR);

  // Group by exerciseId
  const exerciseMap = new Map<string, SetItem[]>();
  for (const set of prSets) {
    if (!exerciseMap.has(set.exerciseId)) {
      exerciseMap.set(set.exerciseId, []);
    }
    exerciseMap.get(set.exerciseId)!.push(set);
  }

  const results: CurrentPRGroup[] = [];

  exerciseMap.forEach((sets) => {
    // A set is a Current PR if no other PR set for this exercise strictly beats it
    const activePRs = sets.filter((candidate) =>
      !sets.some((other) => doesSetBeat(other, candidate))
    );

    for (const bestSet of activePRs) {
      results.push({
        exerciseId: bestSet.exerciseId,
        exerciseName: bestSet.exerciseName,
        isBodyweight: bestSet.isBodyweight,
        isStatic: Boolean(bestSet.isStatic),
        reps: bestSet.reps,
        bestSet,
        totalLoad: calculateTotalLoad(bestSet),
      });
    }
  });

  // Sort default: newest PR date first, then newest createdAt, then exercise name
  results.sort((a, b) => {
    const dateCmp = (b.bestSet.date || '').localeCompare(a.bestSet.date || '');
    if (dateCmp !== 0) return dateCmp;
    if (b.bestSet.createdAt !== a.bestSet.createdAt) {
      return b.bestSet.createdAt - a.bestSet.createdAt;
    }
    return a.exerciseName.localeCompare(b.exerciseName);
  });

  return results;
}

/**
 * Finds the set with the highest estimated 1RM for a specific exercise that is not already marked as PR.
 */
export function findAutoPRCandidate(allSetsForExercise: SetItem[]): { set: SetItem; estimated1RM: number } | null {
  if (!allSetsForExercise.length) return null;
  // Epley 1RM auto-detect does not apply to static (time-based) exercises
  if (allSetsForExercise.some((s) => s.isStatic)) return null;

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
