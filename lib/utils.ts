import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Tunisian Dinar. */
export function formatCurrency(value: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
  return `${formatted} DT`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthName(month: number): string {
  return MONTH_NAMES[Math.max(0, Math.min(11, month - 1))];
}

/** Inclusive-exclusive range for a given month: [start, nextMonthStart). */
export function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);
  return { start, end };
}

export function yearRange(year: number) {
  return {
    start: new Date(year, 0, 1, 0, 0, 0, 0),
    end: new Date(year + 1, 0, 1, 0, 0, 0, 0),
  };
}

export function dayRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
  return { start, end };
}

/** Monday-based (ISO) week containing `date`: [Monday 00:00, next Monday 00:00). */
export function weekRange(date: Date) {
  const day = date.getDay(); // 0=Sun..6=Sat
  const diffToMonday = (day + 6) % 7; // days since Monday
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - diffToMonday, 0, 0, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7, 0, 0, 0, 0);
  return { start, end };
}

/** "21–27 Jul" style label for a week starting at `start`. */
export function formatWeekRange(start: Date): string {
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const endDay = end.getDate();
  const startDay = start.getDate();
  const month = MONTH_NAMES[end.getMonth()].slice(0, 3);
  const startMonth = MONTH_NAMES[start.getMonth()].slice(0, 3);
  if (start.getMonth() === end.getMonth()) return `${startDay}–${endDay} ${month}`;
  return `${startDay} ${startMonth} – ${endDay} ${month}`;
}

/** Median of a numeric list (0 for empty). */
export function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Number(value.toFixed(2));
}

export function toDateInputValue(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60 * 1000);
  return local.toISOString().slice(0, 10);
}
