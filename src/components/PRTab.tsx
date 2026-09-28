import React, { useState, useMemo } from 'react';
import {
  Award,
  History,
  TrendingUp,
  Sparkles,
  X,
  Star,
  ChevronRight,
  Info,
  Calendar,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { SetItem, UserProfile } from '../types';
import {
  computeCurrentPRs,
  findAutoPRCandidate,
  getChartDataForExerciseReps,
} from '../utils/prUtils';
import { formatWeight } from '../utils/unitUtils';
import { formatDateLabel } from '../utils/dateUtils';

interface PRTabProps {
  allSets: SetItem[];
  userProfile: UserProfile;
  onUpdateSet: (setId: string, updates: Partial<SetItem>) => Promise<void>;
  onError: (msg: string) => void;
}

export const PRTab: React.FC<PRTabProps> = ({
  allSets,
  userProfile,
  onUpdateSet,
  onError,
}) => {
  const [prView, setPrView] = useState<'current' | 'history'>('current');
  
  // Selected PR for line chart modal
  const [chartSelection, setChartSelection] = useState<{
    exerciseId: string;
    exerciseName: string;
    reps: number;
    isBodyweight: boolean;
  } | null>(null);

  // Auto PR Modal state
  const [autoPRModal, setAutoPRModal] = useState<{
    exerciseId: string;
    exerciseName: string;
    candidate: { set: SetItem; estimated1RM: number };
  } | null>(null);

  // Compute Current PRs dynamically from allSets
  const currentPRs = useMemo(() => computeCurrentPRs(allSets), [allSets]);

  // Compute History PRs sorted newest first, grouped by exercise
  const historyPRsGrouped = useMemo(() => {
    const prSets = allSets.filter((s) => s.isPR);
    prSets.sort((a, b) => b.createdAt - a.createdAt || b.date.localeCompare(a.date));

    const map = new Map<string, { exerciseName: string; isBodyweight: boolean; sets: SetItem[] }>();

    for (const set of prSets) {
      if (!map.has(set.exerciseId)) {
        map.set(set.exerciseId, {
          exerciseName: set.exerciseName,
          isBodyweight: set.isBodyweight,
          sets: [set],
        });
      } else {
        map.get(set.exerciseId)!.sets.push(set);
      }
    }

    return Array.from(map.values());
  }, [allSets]);

  // All unique exercise IDs in user's sets history for Auto-PR scanning
  const uniqueExercises = useMemo(() => {
    const map = new Map<string, { exerciseId: string; exerciseName: string }>();
    allSets.forEach((s) => {
      if (!map.has(s.exerciseId)) {
        map.set(s.exerciseId, { exerciseId: s.exerciseId, exerciseName: s.exerciseName });
      }
    });
    return Array.from(map.values());
  }, [allSets]);

  // Handle Auto-Find PR trigger for an exercise
  const handleAutoFindPR = (exerciseId: string, exerciseName: string) => {
    const exerciseSets = allSets.filter((s) => s.exerciseId === exerciseId);
    const result = findAutoPRCandidate(exerciseSets);

    if (!result) {
      onError(`No set candidates found for ${exerciseName}`);
      return;
    }

    setAutoPRModal({
      exerciseId,
      exerciseName,
      candidate: result,
    });
  };

  // Confirm Auto PR flag
  const handleConfirmAutoPR = async () => {
    if (!autoPRModal) return;
    try {
      await onUpdateSet(autoPRModal.candidate.set.id, { isPR: true });
      setAutoPRModal(null);
    } catch (err: any) {
      onError(err?.message || 'Failed to mark PR');
    }
  };

  // Prepare chart data when chart modal is open
  const chartData = useMemo(() => {
    if (!chartSelection) return [];
    return getChartDataForExerciseReps(
      allSets,
      chartSelection.exerciseId,
      chartSelection.reps
    );
  }, [allSets, chartSelection]);

  return (
    <div className="space-y-4 pb-24">
      {/* Top Toggle View */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-1.5 flex gap-1 shadow-lg">
        <button
          onClick={() => setPrView('current')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
            prView === 'current'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award size={16} /> Current PRs
        </button>
        <button
          onClick={() => setPrView('history')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
            prView === 'history'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History size={16} /> PR History
        </button>
      </div>

      {/* Auto-Find PR Quick Selector Banner */}
      {uniqueExercises.length > 0 && (
        <div className="bg-slate-800/60 border border-cyan-500/30 rounded-2xl p-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-xs font-bold text-white">Auto-Find PR (Epley 1RM)</p>
              <p className="text-[10px] text-slate-400">Calculates highest estimated 1RM</p>
            </div>
          </div>
          <select
            onChange={(e) => {
              if (e.target.value) {
                const ex = uniqueExercises.find((u) => u.exerciseId === e.target.value);
                if (ex) handleAutoFindPR(ex.exerciseId, ex.exerciseName);
                e.target.value = '';
              }
            }}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-cyan-400 font-bold text-xs rounded-xl focus:outline-none cursor-pointer"
          >
            <option value="">Select Exercise...</option>
            {uniqueExercises.map((ex) => (
              <option key={ex.exerciseId} value={ex.exerciseId}>
                {ex.exerciseName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Current PRs View */}
      {prView === 'current' && (
        <div className="space-y-3">
          {currentPRs.length === 0 ? (
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-8 text-center space-y-3">
              <Award className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-300">No PRs marked yet</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Toggle the star icon on any set in your Workout Log, or use "Auto-Find PR" above.
              </p>
            </div>
          ) : (
            currentPRs.map((prGroup) => (
              <div
                key={`${prGroup.exerciseId}_${prGroup.reps}`}
                onClick={() =>
                  setChartSelection({
                    exerciseId: prGroup.exerciseId,
                    exerciseName: prGroup.exerciseName,
                    reps: prGroup.reps,
                    isBodyweight: prGroup.isBodyweight,
                  })
                }
                className="bg-slate-800/90 border border-slate-700/80 hover:border-cyan-500/50 rounded-2xl p-4 shadow-xl flex items-center justify-between cursor-pointer group transition active:scale-[0.99]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition">
                      {prGroup.exerciseName}
                    </h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                      {prGroup.reps} {prGroup.reps === 1 ? 'rep' : 'reps'}
                    </span>
                  </div>

                  <p className="text-base font-extrabold text-cyan-400">
                    {formatWeight(
                      prGroup.bestSet.weight,
                      userProfile.unit,
                      prGroup.isBodyweight
                    )}
                  </p>

                  <p className="text-[10px] text-slate-400 flex items-center gap-2">
                    <span>{formatDateLabel(prGroup.bestSet.date)}</span>
                    {prGroup.isBodyweight && prGroup.bestSet.bodyweightAtTime > 0 && (
                      <span>• Total Load: {prGroup.totalLoad} {userProfile.unit}</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-slate-400 group-hover:text-cyan-400">
                  <TrendingUp size={18} />
                  <ChevronRight size={18} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* PR History View */}
      {prView === 'history' && (
        <div className="space-y-4">
          {historyPRsGrouped.length === 0 ? (
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-8 text-center space-y-2">
              <History className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-400">No PR history recorded.</p>
            </div>
          ) : (
            historyPRsGrouped.map((grp) => (
              <div
                key={grp.exerciseName}
                className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3"
              >
                <h4 className="text-sm font-bold text-white border-b border-slate-700/60 pb-2 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  {grp.exerciseName}
                </h4>

                <div className="space-y-2">
                  {grp.sets.map((set) => (
                    <div
                      key={set.id}
                      className="bg-slate-900/60 p-3 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-cyan-400">
                          {formatWeight(set.weight, userProfile.unit, grp.isBodyweight)} ×{' '}
                          {set.reps} {set.reps === 1 ? 'rep' : 'reps'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {formatDateLabel(set.date)}
                          {grp.isBodyweight && set.bodyweightAtTime > 0 && (
                            <span> • BW: {set.bodyweightAtTime} {userProfile.unit}</span>
                          )}
                        </p>
                      </div>

                      <button
                        onClick={() => onUpdateSet(set.id, { isPR: false })}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 text-[10px] font-semibold transition"
                      >
                        Unmark PR
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Line Chart Modal */}
      {chartSelection && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-5 w-full max-w-lg space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{chartSelection.exerciseName}</h3>
                <p className="text-xs text-cyan-400 font-medium">
                  {chartSelection.reps}-Rep Weight Progress Over Time
                </p>
              </div>
              <button
                onClick={() => setChartSelection(null)}
                className="p-1.5 rounded-full bg-slate-700 text-slate-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Recharts Line Chart */}
            <div className="h-64 w-full pt-2">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  No data points found for chart.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickFormatter={(val) => val.slice(5)}
                    />
                    <YAxis stroke="#94a3b8" fontSize={10} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(val: any) => [
                        `${val} ${userProfile.unit}`,
                        chartSelection.isBodyweight ? 'Added Weight' : 'Weight',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#22d3ee"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#06b6d4', stroke: '#fff' }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="text-right">
              <button
                onClick={() => setChartSelection(null)}
                className="px-4 py-2 rounded-xl bg-slate-700 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-PR Confirmation Modal */}
      {autoPRModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-2 text-cyan-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Suggested Auto PR</h3>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700 space-y-2">
              <p className="text-xs font-semibold text-slate-300">{autoPRModal.exerciseName}</p>
              <p className="text-lg font-extrabold text-cyan-400">
                {formatWeight(
                  autoPRModal.candidate.set.weight,
                  userProfile.unit,
                  autoPRModal.candidate.set.isBodyweight
                )}{' '}
                × {autoPRModal.candidate.set.reps} reps
              </p>

              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                <span>~estimated 1RM:</span>
                <span>
                  {autoPRModal.candidate.estimated1RM} {userProfile.unit}
                </span>
              </div>

              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Calendar size={12} />
                Logged on {formatDateLabel(autoPRModal.candidate.set.date)}
              </p>
            </div>

            <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/50 flex items-start gap-2 text-[11px] text-slate-400">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>Estimates are a ballpark and less reliable above ~10 reps.</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setAutoPRModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-200 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAutoPR}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
              >
                Confirm PR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
