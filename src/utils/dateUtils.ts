import { DayOfWeek, WeekInfo } from '../types';

export const DAYS_OF_WEEK: {
  key: DayOfWeek;
  label: string;
  shortLabel: string;
  dayOffset: number; // 0 = Lunes, 6 = Domingo
}[] = [
  { key: 'lunes', label: 'Lunes', shortLabel: 'Lun', dayOffset: 0 },
  { key: 'martes', label: 'Martes', shortLabel: 'Mar', dayOffset: 1 },
  { key: 'miercoles', label: 'Miércoles', shortLabel: 'Mié', dayOffset: 2 },
  { key: 'jueves', label: 'Jueves', shortLabel: 'Jue', dayOffset: 3 },
  { key: 'viernes', label: 'Viernes', shortLabel: 'Vie', dayOffset: 4 },
  { key: 'sabado', label: 'Sábado', shortLabel: 'Sáb', dayOffset: 5 },
  { key: 'domingo', label: 'Domingo', shortLabel: 'Dom', dayOffset: 6 },
];

/**
 * Returns the Monday for any given date at 00:00:00
 */
export function getMondayOfDate(d: Date = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Format a Date object to YYYY-MM-DD
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string into a local Date
 */
export function parseISODate(isoStr: string): Date {
  const [year, month, day] = isoStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Returns week number in ISO 8601
 */
export function getISOWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Get full WeekInfo for a given base date
 */
export function getWeekInfo(date: Date): WeekInfo {
  const monday = getMondayOfDate(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const weekNumber = getISOWeekNumber(monday);
  const year = monday.getFullYear();
  const startDateStr = formatDateToISO(monday);

  const startDay = monday.getDate();
  const endDay = sunday.getDate();
  const startMonth = MONTH_NAMES_ES[monday.getMonth()];
  const endMonth = MONTH_NAMES_ES[sunday.getMonth()];

  let formattedRange = '';
  if (monday.getMonth() === sunday.getMonth()) {
    formattedRange = `${startDay} - ${endDay} de ${startMonth}, ${year}`;
  } else {
    formattedRange = `${startDay} de ${startMonth} - ${endDay} de ${endMonth}, ${year}`;
  }

  return {
    startDate: monday,
    endDate: sunday,
    weekNumber,
    year,
    startDateStr,
    formattedRange,
  };
}

/**
 * Get exact Date for a specific day of week given week start Monday
 */
export function getDateForDayOfWeek(weekStartDateStr: string, day: DayOfWeek): Date {
  const monday = parseISODate(weekStartDateStr);
  const found = DAYS_OF_WEEK.find((d) => d.key === day);
  const offset = found ? found.dayOffset : 0;
  const date = new Date(monday);
  date.setDate(monday.getDate() + offset);
  return date;
}

/**
 * Generates an array of weeks for history view
 */
export function getHistoricalWeeks(currentDate: Date = new Date(), pastWeeksCount: number = 8, futureWeeksCount: number = 4): WeekInfo[] {
  const currentMonday = getMondayOfDate(currentDate);
  const weeks: WeekInfo[] = [];

  for (let i = -pastWeeksCount; i <= futureWeeksCount; i++) {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + (i * 7));
    weeks.push(getWeekInfo(d));
  }

  return weeks;
}
