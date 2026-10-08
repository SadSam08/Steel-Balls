import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Hourglass,
  Square,
  GripVertical,
  FileText,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import {
  subscribeDayNote,
  saveDayNote,
  updateExerciseNoteForDate,
} from '../data/workoutService';
import { formatTime } from '../utils/unitUtils';

class SmartPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (
        { nativeEvent: event }: React.PointerEvent,
        { onActivation }: any
      ) => {
        const target = event.target as HTMLElement;
        if (target.closest('input, textarea, select, button, [data-no-drag]')) {
          return false;
        }
        return true;
      },
    },
  ];
}

class SmartTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: (
        { nativeEvent: event }: React.TouchEvent,
        { onActivation }: any
      ) => {
        const target = event.target as HTMLElement;
        if (target.closest('input, textarea, select, button, [data-no-drag]')) {
          return false;
        }
        return true;
      },
    },
  ];
}

interface RestTimerItem {
  id: string;
  exerciseId: string;
  startTime: number;
  endTime?: number;
}

interface RestTimerRowProps {
  item: RestTimerItem;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
}

const RestTimerRow: React.FC<RestTimerRowProps> = ({
  item,
  onStop,
  onDelete,
}) => {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (item.endTime) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 200);
    return () => clearInterval(interval);
  }, [item.endTime]);

  const isRunning = !item.endTime;
  const elapsedMs = (item.endTime || now) - item.startTime;
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));

  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;
  const formattedTime = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs my-1">
      <div className="flex items-center gap-2 font-mono">
        <Hourglass
          size={16}
          className={
            isRunning
              ? 'text-cyan-400 animate-[spin_3s_linear_infinite]'
              : 'text-slate-400'
          }
        />
        <span className="font-semibold text-slate-300">
          {isRunning ? 'Resting:' : 'Rest:'}
        </span>
        <span
          className={`font-bold text-sm tracking-wider ${
            isRunning ? 'text-cyan-400' : 'text-slate-200'
          }`}
        >
          {formattedTime}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {isRunning && (
          <button
            onClick={() => onStop(item.id)}
            className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] transition active:scale-95 flex items-center gap-1"
          >
            <Square size={10} fill="currentColor" /> Stop
          </button>
        )}
        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition"
          title="Delete rest timer"
          aria-label="Delete rest timer"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
};

interface WorkoutLogViewProps {
  currentUserId: string;
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
    isPR: boolean,
    isStatic?: boolean,
    note?: string
  ) => Promise<void>;
  onUpdateSet: (setId: string, updates: Partial<SetItem>) => Promise<void>;
  onDeleteSet: (setId: string) => Promise<void>;
  onDeleteExerciseFromDate: (exerciseId: string) => Promise<void>;
  onAddCustomExercise: (name: string, isBodyweight: boolean, isStatic?: boolean) => Promise<CustomExercise>;
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
          placeholder={set.isStatic ? '0s' : '0'}
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

// Sortable wrapper for each exercise card
interface SortableExerciseCardProps {
  id: string;
  children: React.ReactNode;
}

const SortableExerciseCard: React.FC<SortableExerciseCardProps> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.9 : 1,
        scale: isDragging ? '1.02' : '1',
        boxShadow: isDragging ? '0 20px 25px -5px rgba(0, 0, 0, 0.5)' : undefined,
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
      }}
      {...attributes}
      {...listeners}
      className={`bg-slate-800/90 border ${isDragging ? 'border-cyan-500/50' : 'border-slate-700/80'} rounded-2xl p-4 shadow-xl space-y-3 relative ${isDragging ? 'z-50' : 'z-10'}`}
    >
      {children}
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
  const [customIsStatic, setCustomIsStatic] = useState(false);

  // Session Notes state
  const [sessionNote, setSessionNote] = useState('');

  // Exercise Notes local UI state
  const [exerciseNotesInput, setExerciseNotesInput] = useState<Record<string, string>>({});
  const [showNoteInput, setShowNoteInput] = useState<Record<string, boolean>>({});

  // Subscribe to Session Notes for selectedDate
  useEffect(() => {
    if (!currentUserId || !selectedDate) return;
    const unsub = subscribeDayNote(currentUserId, selectedDate, (note) => {
      setSessionNote(note);
    });
    return () => unsub();
  }, [currentUserId, selectedDate]);

  // Rest Timers local UI state
  const [restTimers, setRestTimers] = useState<RestTimerItem[]>([]);

  // Template Save & Management state
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [overwriteCandidate, setOverwriteCandidate] = useState<WorkoutTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<WorkoutTemplate | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Local exercise order state for drag-to-reorder
  const [exerciseOrder, setExerciseOrder] = useState<string[]>([]);
  // Track previous date to reset order when date changes
  const prevDateRef = useRef(selectedDate);

  // dnd-kit sensors (pointer + touch)
  const sensors = useSensors(
    useSensor(SmartPointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(SmartTouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  );

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
      isStatic: boolean;
      sets: SetItem[];
    }[] = [];

    const map = new Map<string, (typeof groups)[0]>();

    for (const set of daySets) {
      if (!map.has(set.exerciseId)) {
        const grp = {
          exerciseId: set.exerciseId,
          exerciseName: set.exerciseName,
          isBodyweight: set.isBodyweight,
          isStatic: Boolean(set.isStatic),
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

  // Sync exerciseOrder when date changes or new exercises are added
  useEffect(() => {
    const ids = groupedExercises.map((g) => g.exerciseId);
    if (prevDateRef.current !== selectedDate) {
      // Date changed: reset order to natural order
      prevDateRef.current = selectedDate;
      setExerciseOrder(ids);
    } else {
      // Same date: merge in any newly added exercises not yet in order list
      setExerciseOrder((prev) => {
        const existing = new Set(prev);
        const newIds = ids.filter((id) => !existing.has(id));
        // Also remove exercises that no longer exist
        const filtered = prev.filter((id) => ids.includes(id));
        return [...filtered, ...newIds];
      });
    }
  }, [groupedExercises, selectedDate]);

  // Reorder groupedExercises according to exerciseOrder
  const orderedExercises = useMemo(() => {
    if (exerciseOrder.length === 0) return groupedExercises;
    const map = new Map(groupedExercises.map((g) => [g.exerciseId, g]));
    const ordered = exerciseOrder.map((id) => map.get(id)).filter(Boolean) as typeof groupedExercises;
    // Append any groups not in exerciseOrder (safety fallback)
    const inOrder = new Set(exerciseOrder);
    groupedExercises.forEach((g) => { if (!inOrder.has(g.exerciseId)) ordered.push(g); });
    return ordered;
  }, [groupedExercises, exerciseOrder]);

  // Drag end handler: reorder locally and persist via createdAt updates
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = exerciseOrder.indexOf(active.id as string);
    const newIndex = exerciseOrder.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(exerciseOrder, oldIndex, newIndex);
    setExerciseOrder(newOrder);

    // Persist order by updating createdAt of each group's representative set.
    // Firestore query is orderBy('createdAt', 'desc'), so first in UI = highest createdAt.
    // We find the minimum createdAt set for each group (representative) and assign
    // new timestamps spaced 1ms apart in descending order.
    const now = Date.now();
    const map = new Map(groupedExercises.map((g) => [g.exerciseId, g]));
    const updatePromises: Promise<void>[] = [];
    newOrder.forEach((exerciseId, i) => {
      const group = map.get(exerciseId);
      if (!group) return;
      // Representative set: the one with the smallest createdAt (first added)
      const rep = group.sets.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
      // Assign timestamps: index 0 gets highest (most recent), so subtract i ms
      const targetTs = now - i;
      if (rep.createdAt !== targetTs) {
        updatePromises.push(onUpdateSet(rep.id, { createdAt: targetTs }));
      }
    });
    await Promise.all(updatePromises);
  };

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
      await onAddSet(ex.id, ex.name, ex.isBodyweight, weight, reps, false, ex.isStatic);
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
        await onAddSet(ex.exerciseId, ex.name, ex.isBodyweight, 0, 0, false, ex.isStatic);
      }
      if (onSuccess) onSuccess(`Added template "${tpl.name}"!`);
    } catch (err: any) {
      onError(err?.message || 'Failed to apply template');
    }
  };

  // Rest Timer handlers
  const handleAddRestTimer = (exerciseId: string) => {
    const now = Date.now();
    setRestTimers((prev) => {
      // Stop-previous behavior: automatically stop any running timer for this exercise
      const updated = prev.map((t) => {
        if (t.exerciseId === exerciseId && !t.endTime) {
          return { ...t, endTime: now };
        }
        return t;
      });

      return [
        ...updated,
        {
          id: `rest_${now}_${Math.random().toString(36).slice(2, 7)}`,
          exerciseId,
          startTime: now,
        },
      ];
    });
  };

  const handleStopRestTimer = (timerId: string) => {
    const now = Date.now();
    setRestTimers((prev) =>
      prev.map((t) => (t.id === timerId ? { ...t, endTime: now } : t))
    );
  };

  const handleDeleteRestTimer = (timerId: string) => {
    setRestTimers((prev) => prev.filter((t) => t.id !== timerId));
  };

  // Handle adding custom exercise
  const handleCreateCustomExercise = async () => {
    if (!customName.trim()) return;
    try {
      const created = await onAddCustomExercise(
        customName.trim(),
        customIsBodyweight || customIsStatic,
        customIsStatic
      );
      setShowCustomModal(false);
      setCustomName('');
      setCustomIsBodyweight(false);
      setCustomIsStatic(false);
      setSearchQuery('');
      setShowSearchDropdown(false);

      const { weight, reps } = getPrefillValues(created.id);
      await onAddSet(created.id, created.name, created.isBodyweight, weight, reps, false, created.isStatic);
    } catch (err: any) {
      onError(err?.message || 'Failed to create custom exercise');
    }
  };

  // Fast add set button for an exercise group
  const handleQuickAddSet = async (
    exerciseId: string,
    exerciseName: string,
    isBodyweight: boolean,
    isStatic?: boolean
  ) => {
    try {
      const { weight, reps } = getPrefillValues(exerciseId);
      await onAddSet(exerciseId, exerciseName, isBodyweight, weight, reps, false, isStatic);
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
      isStatic: g.isStatic,
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={exerciseOrder} strategy={verticalListSortingStrategy}>
          {orderedExercises.map((group) => (
            <SortableExerciseCard key={group.exerciseId} id={group.exerciseId}>
              {/* Exercise Header */}
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {group.exerciseName}
                    {group.isStatic ? (
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Static
                      </span>
                    ) : group.isBodyweight ? (
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Bodyweight
                      </span>
                    ) : null}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onDeleteExerciseFromDate(group.exerciseId)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition"
                    title="Delete exercise from this date"
                    aria-label="Delete Exercise"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Exercise Note (per exercise per day) */}
              {(() => {
                const currentNote = group.sets.find((s) => Boolean(s.note))?.note || '';
                const isOpen = showNoteInput[group.exerciseId] || Boolean(currentNote);
                return (
                  <div className="pt-2 border-b border-slate-700/40 pb-3">
                    {isOpen ? (
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-cyan-400 shrink-0" />
                        <input
                          type="text"
                          value={exerciseNotesInput[group.exerciseId] ?? currentNote}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExerciseNotesInput((prev) => ({
                              ...prev,
                              [group.exerciseId]: val,
                            }));
                          }}
                          onBlur={() => {
                            const val = exerciseNotesInput[group.exerciseId] ?? currentNote;
                            updateExerciseNoteForDate(currentUserId, group.exerciseId, selectedDate, val);
                          }}
                          placeholder="Add note for this exercise (e.g. form felt great)..."
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          setShowNoteInput((prev) => ({ ...prev, [group.exerciseId]: true }))
                        }
                        className="text-[11px] font-medium text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition"
                      >
                        <FileText size={12} /> + Add note
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Combined, time-ordered list of sets and rest timers */}
              {(() => {
                const exerciseRests = restTimers.filter(
                  (t) => t.exerciseId === group.exerciseId
                );
                type SetEntry = { kind: 'set'; item: (typeof group.sets)[number]; sortKey: number };
                type RestEntry = { kind: 'rest'; item: (typeof exerciseRests)[number]; sortKey: number };
                const combined: (SetEntry | RestEntry)[] = [
                  ...group.sets.map((s) => ({ kind: 'set' as const, item: s, sortKey: s.createdAt })),
                  ...exerciseRests.map((r) => ({ kind: 'rest' as const, item: r, sortKey: r.startTime })),
                ].sort((a, b) => a.sortKey - b.sortKey);

                // Count sets to display 1-based set index
                let setIndex = 0;

                return (
                  <div className="space-y-2">
                    {/* Column headers — only show when there is at least one set */}
                    {group.sets.length > 0 && (
                      <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-400 px-1">
                        <div className="col-span-2 text-center">SET</div>
                        <div className="col-span-4">
                          {group.isBodyweight
                            ? `ADDED (${userProfile.unit})`
                            : `WEIGHT (${userProfile.unit})`}
                        </div>
                        <div className="col-span-3 text-center">
                          {group.isStatic ? 'TIME (s)' : 'REPS'}
                        </div>
                        <div className="col-span-1 text-center">PR</div>
                        <div className="col-span-2 text-right">ACTION</div>
                      </div>
                    )}

                    {combined.map((entry) => {
                      if (entry.kind === 'set') {
                        const currentIdx = setIndex++;
                        return (
                          <SetRowItem
                            key={entry.item.id}
                            set={entry.item}
                            idx={currentIdx}
                            onUpdateSet={onUpdateSet}
                            onDeleteSet={onDeleteSet}
                          />
                        );
                      } else {
                        return (
                          <RestTimerRow
                            key={entry.item.id}
                            item={entry.item}
                            onStop={handleStopRestTimer}
                            onDelete={handleDeleteRestTimer}
                          />
                        );
                      }
                    })}
                  </div>
                );
              })()}

              {/* 50/50 Split Button Row: Add Set | Add Rest */}
              <div className="flex items-center rounded-xl bg-slate-700/40 border border-dashed border-slate-600 overflow-hidden">
                <button
                  onClick={() =>
                    handleQuickAddSet(group.exerciseId, group.exerciseName, group.isBodyweight, group.isStatic)
                  }
                  className="flex-1 py-2 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border-r border-slate-600/60"
                >
                  <Plus size={15} /> Add Set
                </button>
                <button
                  onClick={() => handleAddRestTimer(group.exerciseId)}
                  className="flex-1 py-2 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Hourglass
                    size={15}
                    className={
                      restTimers.some(
                        (t) => t.exerciseId === group.exerciseId && !t.endTime
                      )
                        ? 'animate-[spin_3s_linear_infinite]'
                        : ''
                    }
                  />{' '}
                  Add Rest
                </button>
              </div>
            </SortableExerciseCard>
          ))}
            </SortableContext>
          </DndContext>

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

          {/* Session Notes (per day) */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-2.5 mt-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <FileText size={16} className="text-cyan-400" />
              Session Notes
            </div>
            <textarea
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              onBlur={() => saveDayNote(currentUserId, selectedDate, sessionNote)}
              placeholder="How did today feel?"
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none resize-none"
            />
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

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
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
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customIsStatic}
                    onChange={(e) => {
                      setCustomIsStatic(e.target.checked);
                      if (e.target.checked) setCustomIsBodyweight(true);
                    }}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs font-medium text-slate-200">
                    Static (time-based hold)?
                  </span>
                </label>
              </div>
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
