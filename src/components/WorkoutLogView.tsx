import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Trophy,
  Search,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Sparkles,
} from 'lucide-react';
import type { SetItem, CustomExercise, BuiltInExercise, UserProfile } from '../types';
import builtInExercises from '../data/builtInExercises.json';
import { formatDateLabel, getTodayString } from '../utils/dateUtils';

interface WorkoutLogViewProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  allSets: SetItem[];
  customExercises: CustomExercise[];
  userProfile: UserProfile;
  onAddSet: (
    exerciseId: string,
    exerciseName: string,
    isBodyweight: boolean,
    weight: number,
    reps: number,
    isPR: boolean
  ) => Promise<void>;
  onUpdateSet: (setId: string, updates: Partial<SetItem>) => Promise<void>;
  onDeleteSet: (setId: string) => Promise<void>;
  onDeleteExerciseFromDate: (exerciseId: string) => Promise<void>;
  onAddCustomExercise: (name: string, isBodyweight: boolean) => Promise<CustomExercise>;
  onError: (msg: string) => void;
}

export const WorkoutLogView: React.FC<WorkoutLogViewProps> = ({
  selectedDate,
  onSelectDate,
  allSets,
  customExercises,
  userProfile,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onDeleteExerciseFromDate,
  onAddCustomExercise,
  onError,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIsBodyweight, setCustomIsBodyweight] = useState(false);

  // Filter sets for selected date
  const daySets = useMemo(
    () => allSets.filter((s) => s.date === selectedDate),
    [allSets, selectedDate]
  );

  // Group day sets by exerciseId preserving order of first appearance
  const groupedExercises = useMemo(() => {
    const groups: {
      exerciseId: string;
      exerciseName: string;
      isBodyweight: boolean;
      sets: SetItem[];
    }[] = [];

    const map = new Map<string, typeof groups[0]>();

    for (const set of daySets) {
      if (!map.has(set.exerciseId)) {
        const grp = {
          exerciseId: set.exerciseId,
          exerciseName: set.exerciseName,
          isBodyweight: set.isBodyweight,
          sets: [set],
        };
        map.set(set.exerciseId, grp);
        groups.push(grp);
      } else {
        map.get(set.exerciseId)!.sets.push(set);
      }
    }

    return groups;
  }, [daySets]);

  // Combined built-in + custom exercises list for autosuggest
  const allAvailableExercises = useMemo(() => {
    const builtInMapped: (BuiltInExercise | CustomExercise)[] = builtInExercises;
    return [...builtInMapped, ...customExercises];
  }, [customExercises]);

  // Search autosuggest filtering
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allAvailableExercises.filter((ex) =>
      ex.name.toLowerCase().includes(q)
    );
  }, [searchQuery, allAvailableExercises]);

  // Date Navigation
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d - 1);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    onSelectDate(`${year}-${month}-${day}`);
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + 1);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    onSelectDate(`${year}-${month}-${day}`);
  };

  const handleTodayClick = () => {
    onSelectDate(getTodayString());
  };

  // Helper to find prefill values for a new set of an exercise
  const getPrefillValues = (exerciseId: string) => {
    // 1. Check sets logged today for this exercise
    const currentGroup = groupedExercises.find((g) => g.exerciseId === exerciseId);
    if (currentGroup && currentGroup.sets.length > 0) {
      const lastSet = currentGroup.sets[currentGroup.sets.length - 1];
      return { weight: lastSet.weight, reps: lastSet.reps };
    }

    // 2. Check previous sets logged in history for this exercise
    const pastSets = allSets.filter((s) => s.exerciseId === exerciseId);
    if (pastSets.length > 0) {
      const lastPastSet = pastSets[0]; // sorted newest first
      return { weight: lastPastSet.weight, reps: lastPastSet.reps };
    }

    return { weight: 0, reps: 10 };
  };

  // Select exercise from autosuggest
  const handleSelectExercise = async (ex: BuiltInExercise | CustomExercise) => {
    setSearchQuery('');
    setShowSearchDropdown(false);

    try {
      const { weight, reps } = getPrefillValues(ex.id);
      await onAddSet(ex.id, ex.name, ex.isBodyweight, weight, reps, false);
    } catch (err: any) {
      onError(err?.message || 'Failed to add exercise');
    }
  };

  // Handle adding custom exercise
  const handleCreateCustomExercise = async () => {
    if (!customName.trim()) return;
    try {
      const created = await onAddCustomExercise(customName.trim(), customIsBodyweight);
      setShowCustomModal(false);
      setCustomName('');
      setCustomIsBodyweight(false);
      setSearchQuery('');
      setShowSearchDropdown(false);

      // Immediately add first set for this new custom exercise
      const { weight, reps } = getPrefillValues(created.id);
      await onAddSet(created.id, created.name, created.isBodyweight, weight, reps, false);
    } catch (err: any) {
      onError(err?.message || 'Failed to create custom exercise');
    }
  };

  // Fast add set button for an exercise group
  const handleQuickAddSet = async (
    exerciseId: string,
    exerciseName: string,
    isBodyweight: boolean
  ) => {
    try {
      const { weight, reps } = getPrefillValues(exerciseId);
      await onAddSet(exerciseId, exerciseName, isBodyweight, weight, reps, false);
    } catch (err: any) {
      onError(err?.message || 'Failed to add set');
    }
  };

  const isToday = selectedDate === getTodayString();

  return (
    <div className="space-y-4 pb-24">
      {/* Date Header & Selector */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevDay}
            className="p-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-200 active:scale-95 transition"
            aria-label="Previous Day"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center">
            <h2 className="text-base font-bold text-white flex items-center justify-center gap-2">
              {formatDateLabel(selectedDate)}
            </h2>
            {!isToday && (
              <button
                onClick={handleTodayClick}
                className="text-xs text-cyan-400 font-semibold hover:underline mt-0.5 inline-block"
              >
                Jump to Today
              </button>
            )}
          </div>

          <button
            onClick={handleNextDay}
            className="p-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-200 active:scale-95 transition"
            aria-label="Next Day"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Add Exercise Field with Autosuggest */}
      <div className="relative z-20">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Add exercise (e.g. Bench Press, Dips)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm shadow-lg"
          />
        </div>

        {/* Autosuggest Dropdown */}
        {showSearchDropdown && searchQuery.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-700/50 z-30">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => handleSelectExercise(ex)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-700/60 flex items-center justify-between transition group"
                >
                  <span className="text-sm font-medium text-slate-100 group-hover:text-cyan-400">
                    {ex.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                    {ex.isBodyweight ? 'Bodyweight' : 'Weighted'}
                  </span>
                </button>
              ))
            ) : (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-400 mb-3">No matching exercises found.</p>
                <button
                  onClick={() => {
                    setCustomName(searchQuery);
                    setShowCustomModal(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Plus size={16} />
                  Add "{searchQuery}" as Custom Exercise
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Exercise Cards logged for Today */}
      {groupedExercises.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
            <Dumbbell size={24} />
          </div>
          <h3 className="text-base font-semibold text-slate-300">No exercises logged yet</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Use the search bar above to select or add an exercise for this day.
          </p>
        </div>
      ) : (
        groupedExercises.map((group) => (
          <div
            key={group.exerciseId}
            className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3"
          >
            {/* Exercise Header */}
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {group.exerciseName}
                  {group.isBodyweight && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Bodyweight
                    </span>
                  )}
                </h3>
              </div>
              <button
                onClick={() => onDeleteExerciseFromDate(group.exerciseId)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition"
                title="Delete exercise from this date"
                aria-label="Delete Exercise"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Sets List Table */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-400 px-1">
                <div className="col-span-2 text-center">SET</div>
                <div className="col-span-4">
                  {group.isBodyweight ? `ADDED (${userProfile.unit})` : `WEIGHT (${userProfile.unit})`}
                </div>
                <div className="col-span-3 text-center">REPS</div>
                <div className="col-span-1 text-center">PR</div>
                <div className="col-span-2 text-right">ACTION</div>
              </div>

              {group.sets.map((set, idx) => (
                <div
                  key={set.id}
                  className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl transition ${
                    set.isPR ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-900/60'
                  }`}
                >
                  {/* Set Index */}
                  <div className="col-span-2 text-center font-bold text-slate-300 text-xs">
                    {idx + 1}
                  </div>

                  {/* Weight Input */}
                  <div className="col-span-4">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={set.weight}
                      onChange={(e) =>
                        onUpdateSet(set.id, { weight: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-semibold text-xs text-center focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Reps Input */}
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="1"
                      value={set.reps}
                      onChange={(e) =>
                        onUpdateSet(set.id, { reps: parseInt(e.target.value, 10) || 1 })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-semibold text-xs text-center focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* PR Toggle Trophy */}
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => onUpdateSet(set.id, { isPR: !set.isPR })}
                      className={`p-1.5 rounded-lg transition active:scale-125 ${
                        set.isPR
                          ? 'text-amber-400 bg-amber-400/20'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                      title={set.isPR ? 'Marked as PR' : 'Click to flag PR'}
                    >
                      <Trophy size={16} fill={set.isPR ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  {/* Delete Set */}
                  <div className="col-span-2 flex justify-end">
                    <button
                      onClick={() => onDeleteSet(set.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition"
                      aria-label="Delete set"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Set Button */}
            <button
              onClick={() =>
                handleQuickAddSet(group.exerciseId, group.exerciseName, group.isBodyweight)
              }
              className="w-full py-2 rounded-xl bg-slate-700/40 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-dashed border-slate-600 transition active:scale-95"
            >
              <Plus size={15} /> Add Set
            </button>
          </div>
        ))
      )}

      {/* Custom Exercise Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Add Custom Exercise
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Exercise Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ring Dips, Zercher Squat"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={customIsBodyweight}
                  onChange={(e) => setCustomIsBodyweight(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-700"
                />
                <span className="text-xs font-medium text-slate-200">
                  Is this a bodyweight exercise?
                </span>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCustomModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomExercise}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20"
              >
                Save & Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
