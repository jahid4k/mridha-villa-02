import { parseISO } from 'date-fns';
import { EXPENSE_CATEGORIES } from '@/lib/expenseOptions';

// All dates are shown and "today"/"this month" are decided in Bangladesh time,
// whatever timezone the server (UTC on Vercel) or browser is in.
export const APP_TIMEZONE = 'Asia/Dhaka';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const dhakaFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h12',
});

/** Calendar parts of a moment as seen in Dhaka. */
export function dhakaParts(d: Date) {
  const p: Record<string, string> = {};
  for (const { type, value } of dhakaFormatter.formatToParts(d)) p[type] = value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: p.day,
    hour: p.hour,
    minute: p.minute,
    dayPeriod: (p.dayPeriod || '').toUpperCase(),
  };
}

function toDate(date: string | Date): Date {
  return typeof date === 'string' ? parseISO(date) : date;
}

export function formatBDT(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '৳0';
  return `৳${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** "01 Oct 2026" */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = toDate(date);
  if (isNaN(d.getTime())) return '-';
  const p = dhakaParts(d);
  return `${p.day} ${SHORT_MONTHS[p.month - 1]} ${p.year}`;
}

/** "01 Oct 2026, 09:30 AM" */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = toDate(date);
  if (isNaN(d.getTime())) return '-';
  const p = dhakaParts(d);
  return `${p.day} ${SHORT_MONTHS[p.month - 1]} ${p.year}, ${p.hour}:${p.minute} ${p.dayPeriod}`;
}

/** A moment's date in Dhaka as "YYYY-MM-DD". */
export function dayInDhaka(d: Date): string {
  const p = dhakaParts(d);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${p.day}`;
}

/** Today's date in Dhaka as "YYYY-MM-DD", for date inputs. */
export function todayInDhaka(): string {
  return dayInDhaka(new Date());
}

export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}

export function getMonthYearLabel(month: number, year: number): string {
  return `${getMonthName(month)} ${year}`;
}

/** The current month in Dhaka. On a UTC server, new Date().getMonth() is 6 hours behind. */
export function getCurrentMonthYear(): { month: number; year: number } {
  return monthYearInDhaka(new Date());
}

/** The calendar month a moment falls in, in Dhaka. */
export function monthYearInDhaka(date: Date): { month: number; year: number } {
  const { month, year } = dhakaParts(date);
  return { month, year };
}

/** Month as a sortable number: October 2026 -> 202610. */
export function toYearMonth(month: number, year: number): number {
  return year * 100 + month;
}

/** 202610 -> 202611; 202612 -> 202701. */
export function nextYearMonth(ym: number): number {
  const year = Math.floor(ym / 100);
  const month = ym % 100;
  return month === 12 ? (year + 1) * 100 + 1 : ym + 1;
}

export function fromYearMonth(ym: number): { month: number; year: number } {
  return { month: ym % 100, year: Math.floor(ym / 100) };
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    paid: 'text-green-600 bg-green-50',
    partial: 'text-yellow-600 bg-yellow-50',
    unpaid: 'text-red-600 bg-red-50',
    overdue: 'text-red-700 bg-red-100',
    advance: 'text-blue-600 bg-blue-50',
    adjusted: 'text-purple-600 bg-purple-50',
    active: 'text-green-600 bg-green-50',
    vacant: 'text-gray-600 bg-gray-100',
    occupied: 'text-blue-600 bg-blue-50',
    maintenance: 'text-orange-600 bg-orange-50',
    archived: 'text-gray-500 bg-gray-100',
    ended: 'text-gray-600 bg-gray-100',
    previous: 'text-gray-600 bg-gray-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function getCollectorColor(collector: string): string {
  return collector === 'jahid'
    ? 'text-indigo-700 bg-indigo-50'
    : 'text-emerald-700 bg-emerald-50';
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function generateReceiptNumber(): string {
  const now = new Date();
  const prefix = 'MV2';
  const ts = now.getTime().toString(36).toUpperCase();
  return `${prefix}-${ts}`;
}

export function formatPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    bank: 'Bank Transfer',
    bkash: 'bKash',
    nagad: 'Nagad',
    rocket: 'Rocket',
    other: 'Other',
  };
  return labels[method] || method;
}

export function formatExpenseCategory(category: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label || category;
}

export function formatUnitType(type: string): string {
  const labels: Record<string, string> = {
    shop: 'Shop',
    room: 'Room',
    flat: 'Flat',
    garage: 'Garage',
    storage: 'Storage',
    rooftop: 'Rooftop',
    other: 'Other',
  };
  return labels[type] || type;
}
