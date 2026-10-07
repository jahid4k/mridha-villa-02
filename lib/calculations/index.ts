// Centralized calculation utilities for Mridha Villa 2
// All financial formulas live here — never duplicate in components

export interface RentCalculationInput {
  baseRent: number;
  previousDue?: number;
  extraCharges?: number;
  discount?: number;
  advanceAdjustment?: number;
  collectedAmount?: number;
}

export interface RentCalculationResult {
  baseRent: number;
  previousDue: number;
  extraCharges: number;
  discount: number;
  advanceAdjustment: number;
  totalPayable: number;
  collectedAmount: number;
  dueAmount: number;
  advanceCreated: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'advance' | 'adjusted';
}

/**
 * Calculate rent record values
 * totalPayable = baseRent + previousDue + extraCharges - discount - advanceAdjustment
 * dueAmount = totalPayable - collectedAmount
 * If collected > totalPayable → extra becomes advanceCreated
 */
export function calculateRent(input: RentCalculationInput): RentCalculationResult {
  const baseRent = Math.max(0, input.baseRent || 0);
  const previousDue = Math.max(0, input.previousDue || 0);
  const extraCharges = Math.max(0, input.extraCharges || 0);
  const discount = Math.max(0, input.discount || 0);
  const advanceAdjustment = Math.max(0, input.advanceAdjustment || 0);
  const collectedAmount = Math.max(0, input.collectedAmount || 0);

  const totalPayable = Math.max(0, baseRent + previousDue + extraCharges - discount - advanceAdjustment);
  const rawDue = totalPayable - collectedAmount;

  let dueAmount = 0;
  let advanceCreated = 0;

  if (rawDue > 0) {
    dueAmount = rawDue;
  } else if (rawDue < 0) {
    advanceCreated = Math.abs(rawDue);
  }

  let status: RentCalculationResult['status'];
  if (totalPayable === 0 && advanceAdjustment > 0) {
    status = 'adjusted';
  } else if (collectedAmount === 0 && totalPayable > 0) {
    status = 'unpaid';
  } else if (dueAmount === 0 && advanceCreated === 0) {
    status = 'paid';
  } else if (dueAmount === 0 && advanceCreated > 0) {
    status = 'advance';
  } else if (collectedAmount > 0 && dueAmount > 0) {
    status = 'partial';
  } else {
    status = 'unpaid';
  }

  return {
    baseRent,
    previousDue,
    extraCharges,
    discount,
    advanceAdjustment,
    totalPayable,
    collectedAmount,
    dueAmount,
    advanceCreated,
    status,
  };
}

/**
 * Calculate advance adjustment for a new rent record
 * Given existing advance balance, how much to apply
 */
export function calculateAdvanceAdjustment(
  totalPayable: number,
  availableAdvance: number
): { advanceAdjustment: number; remainingAdvance: number; newTotalPayable: number } {
  if (availableAdvance <= 0 || totalPayable <= 0) {
    return {
      advanceAdjustment: 0,
      remainingAdvance: availableAdvance,
      newTotalPayable: totalPayable,
    };
  }

  const advanceAdjustment = Math.min(availableAdvance, totalPayable);
  const remainingAdvance = availableAdvance - advanceAdjustment;
  const newTotalPayable = totalPayable - advanceAdjustment;

  return { advanceAdjustment, remainingAdvance, newTotalPayable };
}

/**
 * Calculate electricity bill
 * consumedUnits = currentReading - previousReading
 * calculatedAmount = consumedUnits * globalRatePerUnit
 * finalAmount = calculatedAmount + manualAdjustment
 */
export interface ElectricityCalcInput {
  previousReading: number;
  currentReading: number;
  globalRatePerUnit: number;
  manualAdjustment?: number;
  paidAmount?: number;
}

export interface ElectricityCalcResult {
  consumedUnits: number;
  calculatedAmount: number;
  manualAdjustment: number;
  finalAmount: number;
  paidAmount: number;
  dueAmount: number;
}

export function calculateElectricityBill(input: ElectricityCalcInput): ElectricityCalcResult {
  const previousReading = Math.max(0, input.previousReading || 0);
  const currentReading = Math.max(previousReading, input.currentReading || 0);
  const globalRatePerUnit = Math.max(0, input.globalRatePerUnit || 0);
  const manualAdjustment = input.manualAdjustment || 0;
  const paidAmount = Math.max(0, input.paidAmount || 0);

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const consumedUnits = round2(currentReading - previousReading);
  const calculatedAmount = round2(consumedUnits * globalRatePerUnit);
  const finalAmount = round2(Math.max(0, calculatedAmount + manualAdjustment));
  const dueAmount = Math.max(0, finalAmount - paidAmount);

  return {
    consumedUnits,
    calculatedAmount,
    manualAdjustment,
    finalAmount,
    paidAmount,
    dueAmount,
  };
}

/**
 * Due amount and status of a utility bill (electricity, gas) after payments.
 */
export function billStatus(finalAmount: number, paidAmount: number) {
  const dueAmount = Math.max(0, Math.round((finalAmount - paidAmount) * 100) / 100);
  const status = dueAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
  return { dueAmount, status } as const;
}

/**
 * A month's rent is late once today (Dhaka date, "YYYY-MM-DD") is past the
 * lease's due day in that month. Deed clause ৩.২: due between the 1st and the 7th.
 */
export function isRentLate(month: number, year: number, dueDay: number | undefined, today: string): boolean {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(dueDay || 7, lastDay);
  return today > `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Format BDT currency
 */
export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Get month name
 */
export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}

/**
 * Get current month and year (Dhaka time)
 */
export { getCurrentMonthYear } from '@/lib/formatters';

/**
 * Determine rent record status based on amounts
 */
export function determineRentStatus(
  totalPayable: number,
  collectedAmount: number
): 'unpaid' | 'partial' | 'paid' | 'advance' | 'adjusted' {
  if (totalPayable === 0) return 'adjusted';
  if (collectedAmount === 0) return 'unpaid';
  if (collectedAmount >= totalPayable) {
    return collectedAmount > totalPayable ? 'advance' : 'paid';
  }
  return 'partial';
}
