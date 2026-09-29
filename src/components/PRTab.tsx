import React, { useState, useMemo } from 'react';
import {
  Trophy,
  History,
  TrendingUp,
  Sparkles,
  X,
  ChevronRight,
  Info,
  Calendar,
  Plus,
  Trash2,
  Edit3,
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
import type { SetItem, CustomExercise, UserProfile, BodyweightLogEntry } from '../types';
import {
  computeCurrentPRs,
  findAutoPRCandidate,
  getChartDataForExerciseReps,
} from '../utils/prUtils';
import { formatWeight } from '../utils/unitUtils';
import { formatDateLabel, getTodayString } from '../utils/dateUtils';
import { AddPRModal } from './AddPRModal';

interface PRTabProps {
  allSets: SetItem[];
  userProfile: UserProfile;
  customExercises: CustomExercise[];
  bodyweightLogs: BodyweightLogEntry[];
  onAddSet: (setData: Omit<SetItem, 'id'>) => Promise<void>;
  onUpdateSet: (setId: string, updates: Partial<SetItem>) => Promise<void>;
  onDeleteSet: (setId: string) => Promise<void>;
  onAddCustomExercise: (name: string, isBodyweight: boolean) => Promise<CustomExercise>;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export const PRTab: React.FC<PRTabProps> = ({
  allSets,
  userProfile,
  customExercises,
  bodyweightLogs,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onAddCustomExercise,
  onError,
  onSuccess,
}) => {
  const [prView, setPrView] = useState<'current' | 'history'>('current');
  const [showAddPRModal, setShowAddPRModal] = useState(false);

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

  // Edit PR state — track which PR set is being edited inline
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editWeightStr, setEditWeightStr] = useState('');
  const [editRepsStr, setEditRepsStr] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Confirm delete state
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null);

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

  // Start editing a PR set
  const startEdit = (set: SetItem) => {
    setEditingSetId(set.id);
    setEditWeightStr(String(set.weight));
    setEditRepsStr(String(set.reps));
    setEditDate(set.date);
    setEditError(null);
  };

  // Save edit
  const saveEdit = async () => {
    setEditError(null);
    const parsedWeight = parseFloat(editWeightStr.trim());
    if (editWeightStr.trim() === '' || isNaN(parsedWeight) || parsedWeight < 0) {
      setEditError('Weight must be a number ≥ 0.');
      return;
    }
    const parsedReps = parseInt(editRepsStr.trim(), 10);
    if (editRepsStr.trim() === '' || isNaN(parsedReps) || parsedReps < 1 || String(parsedReps) !== editRepsStr.trim()) {
      setEditError('Reps must be a whole number ≥ 1.');
      return;
    }
    if (!editDate) {
      setEditError('Please select a date.');
      return;
    }
    setIsSavingEdit(true);
    try {
      await onUpdateSet(editingSetId!, {
        weight: parsedWeight,
        reps: parsedReps,
        date: editDate,
      });
      setEditingSetId(null);
    } catch {
      setEditError('Failed to save. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const cancelEdit = () => {
    setEditingSetId(null);
    setEditError(null);
  };

  // Unmark PR
  const handleUnmarkPR = async (setId: string) => {
    try {
      await onUpdateSet(setId, { isPR: false });
    } catch {
      onError('Failed to unmark PR.');
    }
  };

  // Delete set
  const handleDeleteSet = async (setId: string) => {
    try {
      await onDeleteSet(setId);
      setDeletingSetId(null);
    } catch {
      onError('Failed to delete PR set.');
    }
  };

  return (
    <div className="space-y-4 pb-28 relative">
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
          <Trophy size={16} /> Current PRs
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
              <Trophy className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-300">No PRs marked yet</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Tap the <span className="text-cyan-400 font-bold">+</span> button to log a PR directly, or toggle the trophy icon on any set.
              </p>
            </div>
          ) : (
            currentPRs.map((prGroup) => (
              <div
                key={`${prGroup.exerciseId}_${prGroup.bestSet.id}`}
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
                  <Trophy className="w-4 h-4 text-amber-400 fill-amber-400" />
                  {grp.exerciseName}
                  {grp.isBodyweight && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold">BW</span>
                  )}
                </h4>

                <div className="space-y-2">
                  {grp.sets.map((set) => (
                    <div key={set.id}>
                      {/* Edit Mode */}
                      {editingSetId === set.id ? (
                        <div className="bg-slate-900/80 border border-cyan-500/40 rounded-xl p-3 space-y-3">
                          {editError && (
                            <p className="text-xs text-red-400">{editError}</p>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                                {grp.isBodyweight ? 'Added Weight' : 'Weight'} ({userProfile.unit})
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editWeightStr}
                                onChange={(e) => { setEditWeightStr(e.target.value); setEditError(null); }}
                                onFocus={(e) => e.target.select()}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs text-center focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-400 block mb-1">Reps</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={editRepsStr}
                                onChange={(e) => { setEditRepsStr(e.target.value); setEditError(null); }}
                                onFocus={(e) => e.target.select()}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs text-center focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Date</label>
                            <input
                              type="date"
                              value={editDate}
                              max={getTodayString()}
                              onChange={(e) => { setEditDate(e.target.value); setEditError(null); }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={cancelEdit}
                              className="flex-1 py-1.5 rounded-lg bg-slate-700 text-slate-200 text-xs font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveEdit}
                              disabled={isSavingEdit}
                              className="flex-1 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition"
                            >
                              {isSavingEdit ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : deletingSetId === set.id ? (
                        /* Delete Confirm */
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-2">
                          <p className="text-xs text-red-300 font-semibold">Delete this PR set permanently?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setDeletingSetId(null)}
                              className="flex-1 py-1.5 rounded-lg bg-slate-700 text-slate-200 text-xs font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDeleteSet(set.id)}
                              className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Normal Row */
                        <div className="bg-slate-900/60 p-3 rounded-xl flex items-center justify-between text-xs">
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

                          <div className="flex items-center gap-1">
                            {/* Edit */}
                            <button
                              onClick={() => startEdit(set)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition"
                              title="Edit PR"
                              aria-label="Edit PR"
                            >
                              <Edit3 size={13} />
                            </button>
                            {/* Unmark */}
                            <button
                              onClick={() => handleUnmarkPR(set.id)}
                              className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 text-[10px] font-semibold transition"
                              title="Remove PR flag (keeps the set)"
                            >
                              Unmark
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => setDeletingSetId(set.id)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition"
                              title="Delete set"
                              aria-label="Delete PR set"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Floating "Add PR" Button */}
      <button
        onClick={() => setShowAddPRModal(true)}
        aria-label="Add PR"
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-2xl shadow-cyan-500/40 flex items-center justify-center transition active:scale-90 focus:outline-none focus:ring-4 focus:ring-cyan-500/40"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* Add PR Modal */}
      {showAddPRModal && (
        <AddPRModal
          onClose={() => setShowAddPRModal(false)}
          userProfile={userProfile}
          customExercises={customExercises}
          bodyweightLogs={bodyweightLogs}
          onAddSet={onAddSet}
          onAddCustomExercise={onAddCustomExercise}
          onSuccess={onSuccess}
        />
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
