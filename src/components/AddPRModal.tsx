import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  Trophy,
  AlertCircle,
  Sparkles,
  Calendar,
} from 'lucide-react';
import type { SetItem, CustomExercise, BuiltInExercise, UserProfile, BodyweightLogEntry } from '../types';
import builtInExercises from '../data/builtInExercises.json';
import { getTodayString } from '../utils/dateUtils';

interface AddPRModalProps {
  onClose: () => void;
  userProfile: UserProfile;
  customExercises: CustomExercise[];
  bodyweightLogs: BodyweightLogEntry[];
  onAddSet: (setData: Omit<SetItem, 'id'>) => Promise<void>;
  onAddCustomExercise: (name: string, isBodyweight: boolean) => Promise<CustomExercise>;
  onSuccess: (msg: string) => void;
}

export const AddPRModal: React.FC<AddPRModalProps> = ({
  onClose,
  userProfile,
  customExercises,
  bodyweightLogs,
  onAddSet,
  onAddCustomExercise,
  onSuccess,
}) => {
  // Exercise selection
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<(BuiltInExercise | CustomExercise) | null>(null);

  // Custom exercise creation sub-form
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIsBodyweight, setCustomIsBodyweight] = useState(false);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  // Set values (strings while typing)
  const [weightStr, setWeightStr] = useState('');
  const [repsStr, setRepsStr] = useState('');
  const [date, setDate] = useState(getTodayString());

  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Combined exercise list
  const allExercises = useMemo<(BuiltInExercise | CustomExercise)[]>(() => {
    return [...(builtInExercises as BuiltInExercise[]), ...customExercises];
  }, [customExercises]);

  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allExercises.filter((ex) => ex.name.toLowerCase().includes(q));
  }, [searchQuery, allExercises]);

  /**
   * Look up bodyweightAtTime: latest bodyweight log entry on or before the chosen date.
   * Falls back to current profile bodyweight.
   */
  const resolveBodyweightAtTime = (targetDate: string): number => {
    const logsOnOrBefore = bodyweightLogs
      .filter((log) => log.date <= targetDate)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (logsOnOrBefore.length > 0) return logsOnOrBefore[0].weight;
    return userProfile.bodyweight || 0;
  };

  const handleSelectExercise = (ex: BuiltInExercise | CustomExercise) => {
    setSelectedExercise(ex);
    setSearchQuery(ex.name);
    setShowDropdown(false);
    setInlineError(null);
  };

  const handleCreateCustomExercise = async () => {
    if (!customName.trim()) return;
    setIsCreatingCustom(true);
    try {
      const created = await onAddCustomExercise(customName.trim(), customIsBodyweight);
      handleSelectExercise(created);
      setShowCustomForm(false);
      setCustomName('');
      setCustomIsBodyweight(false);
    } catch {
      setInlineError('Failed to create custom exercise. Please try again.');
    } finally {
      setIsCreatingCustom(false);
    }
  };

  const handleSave = async () => {
    setInlineError(null);

    // Validate exercise
    if (!selectedExercise) {
      setInlineError('Please select an exercise.');
      return;
    }

    // Validate weight
    const parsedWeight = parseFloat(weightStr.trim());
    if (weightStr.trim() === '' || isNaN(parsedWeight) || parsedWeight < 0) {
      setInlineError('Weight must be a number ≥ 0 (e.g. 0, 20, 2.5).');
      return;
    }

    // Validate reps
    const parsedReps = parseInt(repsStr.trim(), 10);
    if (repsStr.trim() === '' || isNaN(parsedReps) || parsedReps < 1 || String(parsedReps) !== repsStr.trim()) {
      setInlineError('Reps must be a whole number ≥ 1.');
      return;
    }

    // Validate date
    if (!date) {
      setInlineError('Please select a date.');
      return;
    }

    const bodyweightAtTime = resolveBodyweightAtTime(date);

    setIsSaving(true);
    try {
      await onAddSet({
        date,
        exerciseId: selectedExercise.id,
        exerciseName: selectedExercise.name,
        isBodyweight: selectedExercise.isBodyweight,
        weight: parsedWeight,
        reps: parsedReps,
        bodyweightAtTime,
        isPR: true,
        createdAt: Date.now(),
      });
      onSuccess('PR saved! 🏆');
      onClose();
    } catch {
      setInlineError('Failed to save PR. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Bottom Sheet / Modal */}
      <div className="w-full sm:max-w-sm bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-200 sm:animate-in sm:zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Trophy size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Log a PR</h3>
              <p className="text-[11px] text-slate-400">Adds a set with isPR marked</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Inline Error */}
          {inlineError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs animate-in fade-in">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
              <span>{inlineError}</span>
            </div>
          )}

          {/* Exercise Search */}
          <div className="relative">
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Exercise</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedExercise(null);
                  setShowDropdown(true);
                  setInlineError(null);
                }}
                onFocus={() => {
                  if (searchQuery) setShowDropdown(true);
                }}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Exercise Dropdown */}
            {showDropdown && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto z-10 divide-y divide-slate-700/50">
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
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                        {ex.isBodyweight ? 'BW' : 'Weighted'}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center space-y-2">
                    <p className="text-xs text-slate-400">No matching exercises.</p>
                    <button
                      onClick={() => {
                        setCustomName(searchQuery);
                        setShowDropdown(false);
                        setShowCustomForm(true);
                      }}
                      className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus size={14} /> Add "{searchQuery}" as Custom
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Custom Exercise Sub-Form */}
          {showCustomForm && (
            <div className="bg-slate-800/80 border border-cyan-500/30 p-4 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                <Sparkles size={14} /> New Custom Exercise
              </div>
              <input
                type="text"
                placeholder="Exercise name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customIsBodyweight}
                  onChange={(e) => setCustomIsBodyweight(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
                />
                <span className="text-xs text-slate-300 font-medium">Bodyweight exercise</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustomForm(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-700 text-slate-200 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustomExercise}
                  disabled={isCreatingCustom || !customName.trim()}
                  className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
                >
                  {isCreatingCustom ? 'Creating...' : 'Create & Select'}
                </button>
              </div>
            </div>
          )}

          {/* Weight & Reps Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                {selectedExercise?.isBodyweight ? 'Added Weight' : 'Weight'}{' '}
                <span className="text-slate-500">({userProfile.unit})</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 80, 2.5"
                value={weightStr}
                onChange={(e) => {
                  setWeightStr(e.target.value);
                  setInlineError(null);
                }}
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none text-center font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Reps</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 5"
                value={repsStr}
                onChange={(e) => {
                  setRepsStr(e.target.value);
                  setInlineError(null);
                }}
                onFocus={(e) => e.target.select()}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none text-center font-semibold"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Calendar size={12} className="text-slate-400" /> Date
            </label>
            <input
              type="date"
              value={date}
              max={getTodayString()}
              onChange={(e) => {
                setDate(e.target.value);
                setInlineError(null);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
            {bodyweightLogs.length > 0 && date && (
              <p className="text-[10px] text-slate-500 mt-1">
                BW at time: {resolveBodyweightAtTime(date)} {userProfile.unit}
              </p>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 transition disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-cyan-500/40"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Trophy size={17} /> Save PR
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
