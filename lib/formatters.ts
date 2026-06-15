import { format, parseISO } from 'date-fns';

export function formatBDT(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '৳0';
  return `৳${Number(amount).toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy');
  } catch {
    return '-';
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy, hh:mm a');
  } catch {
    return '-';
  }
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

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
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
  const labels: Record<string, string> = {
    water: 'Water Bill',
    repair: 'Repair',
    maintenance: 'Maintenance',
    cleaner: 'Cleaner',
    security: 'Security',
    tax: 'Tax / Govt',
    common_electricity: 'Common Electricity',
    legal: 'Legal',
    renovation: 'Renovation',
    other: 'Other',
  };
  return labels[category] || category;
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
