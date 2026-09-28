import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';
import { getCalendarGrid, formatDateLabel } from '../utils/dateUtils';
import type { SetItem } from '../types';

interface CalendarViewProps {
  allSets: SetItem[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onNavigateToWorkout: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  allSets,
  selectedDate,
  onSelectDate,
  onNavigateToWorkout,
}) => {
  const [currentDate, setCurrentDate] = useState(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const daysGrid = getCalendarGrid(year, month);

  // Set of dates that have logged workouts
  const loggedDatesSet = new Set(allSets.map((s) => s.date));

  const monthName = currentDate.toLocaleString(undefined, { month: 'long' });

  const handleDayClick = (dateStr: string) => {
    onSelectDate(dateStr);
    onNavigateToWorkout();
  };

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate stats for current month
  const monthSets = allSets.filter((s) => {
    const [sY, sM] = s.date.split('-').map(Number);
    return sY === year && sM === month + 1;
  });
  const workoutDaysCount = new Set(monthSets.map((s) => s.date)).size;

  return (
    <div className="space-y-4 pb-20">
      {/* Month Header */}
      <div className="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalIcon className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">
              {monthName} <span className="text-slate-400 font-normal">{year}</span>
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-200 transition active:scale-95"
              aria-label="Previous Month"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-200 transition active:scale-95"
              aria-label="Next Month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-2">
          {daysOfWeek.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {daysGrid.map((dayObj) => {
            const hasWorkout = loggedDatesSet.has(dayObj.dateStr);
            const isSelected = dayObj.dateStr === selectedDate;

            return (
              <button
                key={dayObj.dateStr}
                onClick={() => handleDayClick(dayObj.dateStr)}
                className={`relative flex flex-col items-center justify-center h-11 rounded-xl text-sm font-medium transition-all ${
                  !dayObj.isCurrentMonth
                    ? 'text-slate-600 bg-slate-900/30'
                    : isSelected
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-300'
                    : dayObj.isToday
                    ? 'bg-slate-700 text-white font-semibold border border-cyan-500/50'
                    : 'bg-slate-900/70 text-slate-200 hover:bg-slate-700/80'
                }`}
              >
                <span>{dayObj.dayNumber}</span>
                {hasWorkout && (
                  <span
                    className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-slate-950' : 'bg-cyan-400 shadow-sm shadow-cyan-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Monthly Summary Box */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 flex items-center justify-around text-center">
        <div>
          <p className="text-2xl font-bold text-cyan-400">{workoutDaysCount}</p>
          <p className="text-xs text-slate-400">Workouts This Month</p>
        </div>
        <div className="h-8 w-px bg-slate-700" />
        <div>
          <p className="text-2xl font-bold text-white">{monthSets.length}</p>
          <p className="text-xs text-slate-400">Total Sets Logged</p>
        </div>
      </div>

      {/* Selected Date Action Card */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-cyan-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">
            Selected Date
          </p>
          <p className="text-base font-bold text-white">{formatDateLabel(selectedDate)}</p>
        </div>
        <button
          onClick={onNavigateToWorkout}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 active:scale-95 transition"
        >
          Open Workout Log
        </button>
      </div>
    </div>
  );
};
