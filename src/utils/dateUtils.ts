export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export interface CalendarDay {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function getCalendarGrid(year: number, monthZeroBased: number): CalendarDay[] {
  const todayStr = getTodayString();
  const firstDayOfMonth = new Date(year, monthZeroBased, 1);
  const lastDayOfMonth = new Date(year, monthZeroBased + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const totalDaysInMonth = lastDayOfMonth.getDate();

  const days: CalendarDay[] = [];

  // Previous month padding days
  const prevMonthLastDay = new Date(year, monthZeroBased, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const prevDate = new Date(year, monthZeroBased - 1, dayNum);
    const pYear = prevDate.getFullYear();
    const pMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
    const pDay = String(dayNum).padStart(2, '0');
    const dateStr = `${pYear}-${pMonth}-${pDay}`;

    days.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const monthStr = String(monthZeroBased + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;

    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Next month padding days to complete 35 or 42 grid cells
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, monthZeroBased + 1, i);
      const nYear = nextDate.getFullYear();
      const nMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
      const nDay = String(i).padStart(2, '0');
      const dateStr = `${nYear}-${nMonth}-${nDay}`;

      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }
  }

  return days;
}
