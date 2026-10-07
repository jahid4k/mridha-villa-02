import { z } from 'zod';
import { EXPENSE_CATEGORY_VALUES, EXPENSE_PAYER_VALUES } from '@/lib/expenseOptions';
import { fromBnDigits } from '@/lib/i18n';

// Bangladeshi phone number validation (loose but practical). Bengali digits
// (typed with Avro) are accepted and saved as 0-9.
const bdPhone = z.string().overwrite(fromBnDigits).min(1, 'Phone is required').refine(
  (val) => /^(\+?880|0)?1[3-9]\d{8}$/.test(val.replace(/[\s-]/g, '')),
  'Enter a valid Bangladeshi phone number'
);

// ========== Unit Validators ==========
// Field definitions without defaults. Update schemas use these with .partial(),
// because a default would silently reset any field the request leaves out.
const unitFields = {
  unitName: z.string().min(1, 'Unit name is required').max(100),
  unitNumber: z.string().min(1, 'Unit number is required').max(50),
  unitType: z.enum(['shop', 'room', 'flat', 'garage', 'storage', 'rooftop', 'other']),
  floorOrLocation: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  defaultMonthlyRent: z.coerce.number().min(0, 'Rent cannot be negative'),
  assignedCollector: z.enum(['jahid', 'jony']),
  status: z.enum(['vacant', 'occupied', 'maintenance', 'archived']),
  hasElectricitySubMeter: z.boolean(),
  electricityMeterNumber: z.string().max(50).optional(),
  gasMonthlyCharge: z.coerce.number().min(0, 'Gas charge cannot be negative'),
  notes: z.string().max(500).optional(),
};

export const createUnitSchema = z.object({
  ...unitFields,
  status: unitFields.status.default('vacant'),
  hasElectricitySubMeter: unitFields.hasElectricitySubMeter.default(false),
  gasMonthlyCharge: unitFields.gasMonthlyCharge.default(0),
});

export const updateUnitSchema = z.object(unitFields).partial();

// ========== Tenant Validators ==========
export const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  phone: bdPhone,
  alternativePhone: z.string().overwrite(fromBnDigits).optional().refine(
    (val) => !val || /^(\+?880|0)?1[3-9]\d{8}$/.test(val.replace(/[\s-]/g, '')),
    'Enter a valid Bangladeshi phone number'
  ),
  businessName: z.string().max(200).optional(),
  nidNumber: z.string().overwrite(fromBnDigits).max(50).optional(),
  dateOfBirth: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Pick a valid date').optional(),
  presentAddress: z.string().max(500).optional(),
  permanentAddress: z.string().max(500).optional(),
  guardianName: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  emergencyContact: z.string().max(200).optional(),
  emergencyContactName: z.string().max(200).optional(),
  emergencyContactPhone: z.string().overwrite(fromBnDigits).max(20).optional(),
  emergencyContactRelation: z.string().max(100).optional(),
  tradeLicenseNumber: z.string().max(100).optional(),
  businessType: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().max(1000).optional(),
  status: z.enum(['active', 'previous', 'archived']).default('active'),
});

export const updateTenantSchema = createTenantSchema.partial();

// ========== Lease Validators ==========
const leaseFields = {
  tenantId: z.string().min(1, 'Tenant is required'),
  unitIds: z.array(z.string()).min(1, 'At least one unit required'),
  leaseName: z.string().max(200).optional(),
  monthlyRentAmount: z.coerce.number().min(0, 'Rent cannot be negative'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  rentDueDay: z.coerce.number().min(1).max(31),
  securityDepositAmount: z.coerce.number().min(0),
  advanceBalance: z.coerce.number().min(0),
  advanceMode: z.enum(['monthly', 'final']),
  advancePerMonth: z.coerce.number().min(0),
  collector: z.enum(['jahid', 'jony']),
  notes: z.string().max(1000).optional(),
};

// "Deduct monthly" needs an amount to deduct.
const advanceModeComplete = (d: { advanceMode?: string; advancePerMonth?: number; advanceBalance?: number }) =>
  d.advanceMode !== 'monthly' || !d.advanceBalance || (d.advancePerMonth ?? 0) > 0;
const advanceModeError = {
  message: 'Enter how much advance to deduct each month',
  path: ['advancePerMonth'],
};

export const createLeaseSchema = z.object({
  ...leaseFields,
  rentDueDay: leaseFields.rentDueDay.default(7),
  securityDepositAmount: leaseFields.securityDepositAmount.default(0),
  advanceBalance: leaseFields.advanceBalance.default(0),
  advanceMode: leaseFields.advanceMode.default('final'),
  advancePerMonth: leaseFields.advancePerMonth.default(0),
}).refine(advanceModeComplete, advanceModeError);

export const updateLeaseSchema = z.object(leaseFields).partial().refine(advanceModeComplete, advanceModeError);

// ========== Rent Record Validators ==========
export const generateRentRecordSchema = z.object({
  leaseId: z.string().min(1, 'Lease is required'),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
  extraCharges: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().max(500).optional(),
});

export const recordPaymentSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  leaseId: z.string().min(1, 'Lease is required'),
  monthlyRentRecordId: z.string().optional(),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  paymentMethod: z.enum(['cash', 'bank', 'bkash', 'nagad', 'rocket', 'other']),
  receivedBy: z.enum(['jahid', 'jony']),
  paymentType: z.enum(['rent', 'advance', 'due', 'adjustment', 'other']).default('rent'),
  notes: z.string().max(500).optional(),
  receiptNumber: z.string().max(100).optional(),
});

// One amount received from a tenant. With no targets it pays their oldest
// charges first; extra money becomes credit for the next months.
export const collectPaymentSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  amount: z.coerce.number().positive('Amount must be more than 0'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  paymentMethod: z.enum(['cash', 'bank', 'bkash', 'nagad', 'rocket', 'other']).default('cash'),
  receivedBy: z.enum(['jahid', 'jony']),
  notes: z.string().max(500).optional(),
  targets: z.array(z.object({
    kind: z.enum(['rent', 'electricity', 'gas']),
    id: z.string().min(1),
  })).optional(),
});

// ========== Electricity Validators ==========
// The rate and tenant are not accepted from the client: the server resolves
// the rate for the bill's month and takes the tenant from the lease.
const electricityReadings = {
  previousReading: z.coerce.number().min(0),
  currentReading: z.coerce.number().min(0),
  manualAdjustment: z.coerce.number().default(0),
  notes: z.string().max(500).optional(),
};

const readingsInOrder = (data: { previousReading: number; currentReading: number }) =>
  data.currentReading >= data.previousReading;
const readingsOrderError = {
  message: 'Current reading must be >= previous reading',
  path: ['currentReading'],
};

export const electricityReadingSchema = z.object({
  leaseId: z.string().min(1, 'Lease is required'),
  unitId: z.string().min(1, 'Unit is required'),
  ...electricityReadings,
}).refine(readingsInOrder, readingsOrderError);

export const createElectricityBillSchema = z.object({
  leaseId: z.string().min(1, 'Lease is required'),
  unitId: z.string().min(1, 'Unit is required'),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
  ...electricityReadings,
}).refine(readingsInOrder, readingsOrderError);

export const bulkElectricityBillSchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
  entries: z.array(electricityReadingSchema).min(1, 'No readings to save').max(200),
});

export const editElectricityBillSchema = z.object(electricityReadings).refine(readingsInOrder, readingsOrderError);

// One payment towards a utility bill (electricity or gas); added to what's already paid.
export const payBillSchema = z.object({
  amount: z.coerce.number().positive('Amount must be more than 0'),
  paymentDate: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// ========== Electricity Settings Validators ==========
export const createElectricitySettingSchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
  globalRatePerUnit: z.coerce.number().min(0, 'Rate cannot be negative'),
  notes: z.string().max(500).optional(),
  // Re-price this month's unpaid/partly paid bills at the new rate.
  applyToExisting: z.boolean().optional(),
});

// ========== Gas Bill Validators ==========
export const createGasBillSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  leaseId: z.string().min(1, 'Lease is required'),
  unitIds: z.array(z.string()).min(1, 'At least one unit required'),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
  amount: z.coerce.number().min(0, 'Amount cannot be negative'),
  notes: z.string().max(500).optional(),
});

// ========== Expense Validators ==========
const expenseFields = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  category: z.enum(EXPENSE_CATEGORY_VALUES),
  amount: z.coerce.number().min(0, 'Amount cannot be negative'),
  paidBy: z.enum(EXPENSE_PAYER_VALUES),
  expenseDate: z.string().min(1, 'Date is required'),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
  // null clears the link when editing.
  relatedUnitId: z.string().min(1).nullable().optional(),
  expenseTreatment: z.enum(['brotherMaintained', 'shared50_50', 'assignedToJahid', 'assignedToJony', 'custom']).default('brotherMaintained'),
  customShare: z.object({
    jahid: z.coerce.number().min(0),
    jony: z.coerce.number().min(0),
  }).optional(),
  notes: z.string().max(1000).optional(),
});

// A custom split must say each brother's share, and the shares must add up to the amount.
const checkCustomShare = (
  data: { expenseTreatment?: string; customShare?: { jahid: number; jony: number }; amount?: number },
  ctx: z.RefinementCtx,
) => {
  if (data.expenseTreatment !== 'custom') return;
  if (!data.customShare) {
    ctx.addIssue({ code: 'custom', path: ['customShare'], message: "Enter Jahid's and Jony's shares" });
    return;
  }
  const total = data.customShare.jahid + data.customShare.jony;
  if (data.amount !== undefined && Math.abs(total - data.amount) > 0.01) {
    ctx.addIssue({ code: 'custom', path: ['customShare'], message: 'Shares must add up to the amount' });
  }
};

export const createExpenseSchema = expenseFields.superRefine(checkCustomShare);

export const updateExpenseSchema = expenseFields.partial().superRefine(checkCustomShare);

// ========== Settings Validators ==========
export const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
});

// ========== Login Validator ==========
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// Type exports
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;
export type GenerateRentRecordInput = z.infer<typeof generateRentRecordSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type CreateElectricityBillInput = z.infer<typeof createElectricityBillSchema>;
export type CreateGasBillInput = z.infer<typeof createGasBillSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
