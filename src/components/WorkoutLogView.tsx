import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Trophy,
  Search,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Sparkles,
  FolderOpen,
  BookmarkPlus,
} from 'lucide-react';
import type {
  SetItem,
  CustomExercise,
  BuiltInExercise,
  UserProfile,
  WorkoutTemplate,
  TemplateExercise,
} from '../types';
import builtInExercises from '../data/builtInExercises.json';
import { formatDateLabel, getTodayString } from '../utils/dateUtils';

interface WorkoutLogViewProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  allSets: SetItem[];
  customExercises: CustomExercise[];
  templates?: WorkoutTemplate[];
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
  onSaveTemplate?: (
    name: string,
    exercises: TemplateExercise[],
    existingId?: string
  ) => Promise<void>;
  onDeleteTemplate?: (templateId: string, templateName: string) => Promise<void>;
  onError: (msg: string) => void;
  onSuccess?: (msg: string) => void;
}

interface SetRowItemProps {
  set: SetItem;
  idx: number;
  onUpdateSet: (setId: string, updates: Partial<SetItem>) => Promise<void>;
  onDeleteSet: (setId: string) => Promise<void>;
}

const SetRowItem: React.FC<SetRowItemProps> = ({
  set,
  idx,
  onUpdateSet,
  onDeleteSet,
}) => {
  const [weightStr, setWeightStr] = useState<string>(set.weight === 0 ? '' : String(set.weight));
  const [repsStr, setRepsStr] = useState<string>(set.reps === 0 ? '' : String(set.reps));

  useEffect(() => {
    setWeightStr(set.weight === 0 ? '' : String(set.weight));
  }, [set.weight]);

  useEffect(() => {
    setRepsStr(set.reps === 0 ? '' : String(set.reps));
  }, [set.reps]);

  const commitWeight = () => {
    const trimmed = weightStr.trim();
    if (trimmed === '') {
      setWeightStr(set.weight === 0 ? '' : String(set.weight));
      return;
    }
    const parsed = parseFloat(trimmed);
    if (isNaN(parsed) || parsed < 0) {
      setWeightStr(set.weight === 0 ? '' : String(set.weight));
      return;
    }
    if (parsed !== set.weight) {
      onUpdateSet(set.id, { weight: parsed });
    }
  };

  const commitReps = () => {
    const trimmed = repsStr.trim();
    if (trimmed === '') {
      setRepsStr(set.reps === 0 ? '' : String(set.reps));
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed) || parsed < 1) {
      setRepsStr(set.reps === 0 ? '' : String(set.reps));
      return;
    }
    if (parsed !== set.reps) {
      onUpdateSet(set.id, { reps: parsed });
    }
  };

  return (
    <div
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
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={weightStr}
          onChange={(e) => setWeightStr(e.target.value)}
          onBlur={commitWeight}
          onFocus={(e) => e.target.select()}
          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-semibold text-xs text-center focus:ring-1 focus:ring-cyan-500 focus:outline-none"
        />
      </div>

      {/* Reps Input */}
      <div className="col-span-3">
        <input
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={repsStr}
          onChange={(e) => setRepsStr(e.target.value)}
          onBlur={commitReps}
          onFocus={(e) => e.target.select()}
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
  );
};

export const WorkoutLogView: React.FC<WorkoutLogViewProps> = ({
  selectedDate,
  onSelectDate,
  allSets,
  customExercises,
  templates = [],
  userProfile,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onDeleteExerciseFromDate,
  onAddCustomExercise,
  onSaveTemplate,
  onDeleteTemplate,
  onError,
  onSuccess,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIsBodyweight, setCustomIsBodyweight] = useState(false);

  // Template Save & Management state
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [overwriteCandidate, setOverwriteCandidate] = useState<WorkoutTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<WorkoutTemplate | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

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

    const map = new Map<string, (typeof groups)[0]>();

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

  // Search autosuggest filtering for exercises
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allAvailableExercises.filter((ex) =>
      ex.name.toLowerCase().includes(q)
    );
  }, [searchQuery, allAvailableExercises]);

  // Search autosuggest filtering for templates
  const filteredTemplateSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return templates.filter((tpl) => tpl.name.toLowerCase().includes(q));
  }, [searchQuery, templates]);

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
    const currentGroup = groupedExercises.find((g) => g.exerciseId === exerciseId);
    if (currentGroup && currentGroup.sets.length > 0) {
      const lastSet = currentGroup.sets[currentGroup.sets.length - 1];
      return { weight: lastSet.weight, reps: lastSet.reps };
    }

    const pastSets = allSets.filter((s) => s.exerciseId === exerciseId);
    if (pastSets.length > 0) {
      const lastPastSet = pastSets[0];
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

  // Apply a template (adds all exercises with empty 0 weight and 0 reps)
  const handleApplyTemplate = async (tpl: WorkoutTemplate) => {
    setShowSearchDropdown(false);
    setShowTemplateDropdown(false);
    setSearchQuery('');
    try {
      for (const ex of tpl.exercises) {
        await onAddSet(ex.exerciseId, ex.name, ex.isBodyweight, 0, 0, false);
      }
      if (onSuccess) onSuccess(`Added template "${tpl.name}"!`);
    } catch (err: any) {
      onError(err?.message || 'Failed to apply template');
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

  // Save template workflow
  const handleConfirmSaveTemplate = async (
    name: string,
    existingTemplateId?: string
  ) => {
    if (!name.trim()) return;
    if (!onSaveTemplate) return;

    const exercises: TemplateExercise[] = groupedExercises.map((g) => ({
      exerciseId: g.exerciseId,
      name: g.exerciseName,
      isBodyweight: g.isBodyweight,
    }));

    setIsSavingTemplate(true);
    try {
      await onSaveTemplate(name.trim(), exercises, existingTemplateId);
      setShowSaveTemplateModal(false);
      setTemplateNameInput('');
      setOverwriteCandidate(null);
      if (onSuccess) onSuccess(`Template "${name.trim()}" saved!`);
    } catch (err: any) {
      onError(err?.message || 'Failed to save template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleInitiateSaveTemplate = () => {
    const trimmed = templateNameInput.trim();
    if (!trimmed) return;

    const existing = templates.find(
      (t) => t.name.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (existing) {
      setOverwriteCandidate(existing);
    } else {
      handleConfirmSaveTemplate(trimmed);
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

      {/* Add Exercise Field & Template Trigger */}
      <div className="relative z-20">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Add exercise (e.g. Bench Press, Dips)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
                setShowTemplateDropdown(false);
              }}
              onFocus={() => {
                setShowSearchDropdown(true);
                setShowTemplateDropdown(false);
              }}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm shadow-lg"
            />
          </div>

          {/* Icon-only Template Dropdown Trigger */}
          <button
            onClick={() => {
              setShowTemplateDropdown((prev) => !prev);
              setShowSearchDropdown(false);
            }}
            className={`p-3.5 rounded-2xl border transition active:scale-95 shadow-lg flex items-center justify-center shrink-0 ${
              showTemplateDropdown
                ? 'bg-cyan-500 text-slate-950 border-cyan-500 shadow-cyan-500/20'
                : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50'
            }`}
            title="Saved Templates"
            aria-label="Saved Templates"
          >
            <FolderOpen size={20} />
          </button>
        </div>

        {/* Saved Templates Dropdown Popover */}
        {showTemplateDropdown && (
          <div className="absolute top-full right-0 left-0 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto z-30 animate-in fade-in zoom-in-95">
            <div className="p-3 bg-slate-900/60 border-b border-slate-700/60 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FolderOpen size={14} className="text-cyan-400" /> Saved Templates
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                {templates.length} {templates.length === 1 ? 'template' : 'templates'}
              </span>
            </div>

            {templates.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs text-slate-400">No saved templates yet.</p>
                <p className="text-[11px] text-slate-500">
                  Log exercises for today and tap "Save as Template" below.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/60 transition group cursor-pointer"
                    onClick={() => handleApplyTemplate(tpl)}
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-sm font-bold text-slate-100 group-hover:text-cyan-400 transition truncate">
                        {tpl.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {tpl.exercises.map((e) => e.name).join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 shrink-0">
                        {tpl.exercises.length} {tpl.exercises.length === 1 ? 'ex' : 'exs'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingTemplate(tpl);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/80 transition"
                        title="Delete Template"
                        aria-label="Delete Template"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Autosuggest Dropdown (Exercises + Matching Templates) */}
        {showSearchDropdown && searchQuery.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-700/50 z-30">
            {/* Matching Templates */}
            {filteredTemplateSuggestions.map((tpl) => (
              <button
                key={`template_${tpl.id}`}
                onClick={() => handleApplyTemplate(tpl)}
                className="w-full px-4 py-3 text-left hover:bg-slate-700/60 flex items-center justify-between transition group bg-cyan-950/20"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <FolderOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-sm font-bold text-white group-hover:text-cyan-400">
                      {tpl.name}
                    </span>
                    <p className="text-[10px] text-slate-400 truncate">
                      {tpl.exercises.map((e) => e.name).join(', ')}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                  Template ({tpl.exercises.length})
                </span>
              </button>
            ))}

            {/* Matching Exercises */}
            {filteredSuggestions.map((ex) => (
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
            ))}

            {filteredTemplateSuggestions.length === 0 && filteredSuggestions.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-400 mb-3">No matching exercises or templates found.</p>
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
            Use the search bar above to select an exercise or saved template for this day.
          </p>
        </div>
      ) : (
        <>
          {groupedExercises.map((group) => (
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
                  <SetRowItem
                    key={set.id}
                    set={set}
                    idx={idx}
                    onUpdateSet={onUpdateSet}
                    onDeleteSet={onDeleteSet}
                  />
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
          ))}

          {/* Save as Template Button at the bottom of Workout Page */}
          <div className="pt-2">
            <button
              onClick={() => {
                setTemplateNameInput('');
                setOverwriteCandidate(null);
                setShowSaveTemplateModal(true);
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-cyan-400 hover:text-cyan-300 font-bold text-sm flex items-center justify-center gap-2 shadow-xl transition active:scale-95"
            >
              <BookmarkPlus size={18} />
              Save as Template
            </button>
          </div>
        </>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BookmarkPlus className="w-5 h-5 text-cyan-400" />
              Save as Template
            </h3>

            {overwriteCandidate ? (
              <div className="space-y-4 animate-in fade-in">
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-amber-500/30 space-y-1">
                  <p className="text-xs font-bold text-amber-300">Template already exists</p>
                  <p className="text-xs text-slate-300">
                    A template named <span className="font-bold text-white">"{overwriteCandidate.name}"</span> already exists. What would you like to do?
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => handleConfirmSaveTemplate(templateNameInput.trim(), overwriteCandidate.id)}
                    disabled={isSavingTemplate}
                    className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
                  >
                    {isSavingTemplate ? 'Overwriting...' : 'Overwrite Existing'}
                  </button>
                  <button
                    onClick={() => handleConfirmSaveTemplate(`${templateNameInput.trim()} (New)`)}
                    disabled={isSavingTemplate}
                    className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition"
                  >
                    Save as "{templateNameInput.trim()} (New)"
                  </button>
                  <button
                    onClick={() => setOverwriteCandidate(null)}
                    className="w-full py-2 text-slate-400 hover:text-slate-200 font-semibold text-xs"
                  >
                    Back to edit name
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pull Day, Legs & Core"
                    value={templateNameInput}
                    onChange={(e) => setTemplateNameInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-400">
                    Includes {groupedExercises.length} {groupedExercises.length === 1 ? 'exercise' : 'exercises'}:
                  </p>
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-800">
                    {groupedExercises.map((g) => (
                      <div key={g.exerciseId} className="pt-1 first:pt-0 flex items-center justify-between text-xs text-slate-200">
                        <span>{g.exerciseName}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {g.isBodyweight ? 'BW' : 'Weighted'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowSaveTemplateModal(false);
                      setTemplateNameInput('');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInitiateSaveTemplate}
                    disabled={isSavingTemplate || !templateNameInput.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition disabled:opacity-50 shadow-lg shadow-cyan-500/20"
                  >
                    {isSavingTemplate ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Template Confirmation Modal */}
      {deletingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Delete Template
            </h3>

            <p className="text-xs text-slate-300">
              Delete template <span className="font-bold text-white">"{deletingTemplate.name}"</span>?
            </p>
            <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50">
              This will only remove the template preset. Past workouts logged using this template will not be affected.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletingTemplate(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (onDeleteTemplate) {
                    await onDeleteTemplate(deletingTemplate.id, deletingTemplate.name);
                  }
                  setDeletingTemplate(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition shadow-lg shadow-red-600/20"
              >
                Delete Template
              </button>
            </div>
          </div>
        </div>
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
