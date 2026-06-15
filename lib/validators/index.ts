import { z } from 'zod';

// Bangladeshi phone number validation (loose but practical)
const bdPhone = z.string().min(1, 'Phone is required').refine(
  (val) => /^(\+?880|0)?1[3-9]\d{8}$/.test(val.replace(/[\s-]/g, '')),
  'Enter a valid Bangladeshi phone number'
);

// ========== Unit Validators ==========
export const createUnitSchema = z.object({
  unitName: z.string().min(1, 'Unit name is required').max(100),
  unitNumber: z.string().min(1, 'Unit number is required').max(50),
  unitType: z.enum(['shop', 'room', 'flat', 'garage', 'storage', 'rooftop', 'other']),
  floorOrLocation: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  defaultMonthlyRent: z.coerce.number().min(0, 'Rent cannot be negative'),
  assignedCollector: z.enum(['jahid', 'jony']),
  status: z.enum(['vacant', 'occupied', 'maintenance', 'archived']).default('vacant'),
  hasElectricitySubMeter: z.boolean().default(false),
  electricityMeterNumber: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

export const updateUnitSchema = createUnitSchema.partial();

// ========== Tenant Validators ==========
export const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  phone: bdPhone,
  alternativePhone: z.string().optional().refine(
    (val) => !val || /^(\+?880|0)?1[3-9]\d{8}$/.test(val.replace(/[\s-]/g, '')),
    'Enter a valid Bangladeshi phone number'
  ),
  businessName: z.string().max(200).optional(),
  nidNumber: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  emergencyContact: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['active', 'previous', 'archived']).default('active'),
});

export const updateTenantSchema = createTenantSchema.partial();

// ========== Lease Validators ==========
export const createLeaseSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  unitIds: z.array(z.string()).min(1, 'At least one unit required'),
  leaseName: z.string().max(200).optional(),
  monthlyRentAmount: z.coerce.number().min(0, 'Rent cannot be negative'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  rentDueDay: z.coerce.number().min(1).max(31).default(5),
  securityDepositAmount: z.coerce.number().min(0).default(0),
  advanceBalance: z.coerce.number().min(0).default(0),
  collector: z.enum(['jahid', 'jony']),
  notes: z.string().max(1000).optional(),
});

export const updateLeaseSchema = createLeaseSchema.partial();

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

// ========== Electricity Validators ==========
export const createElectricityBillSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  leaseId: z.string().min(1, 'Lease is required'),
  unitId: z.string().min(1, 'Unit is required'),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
  previousReading: z.coerce.number().min(0),
  currentReading: z.coerce.number().min(0),
  globalRatePerUnit: z.coerce.number().min(0),
  manualAdjustment: z.coerce.number().default(0),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => data.currentReading >= data.previousReading,
  {
    message: 'Current reading must be >= previous reading',
    path: ['currentReading'],
  }
);

export const updateElectricityBillSchema = z.object({
  paidAmount: z.coerce.number().min(0),
  paymentDate: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// ========== Electricity Settings Validators ==========
export const createElectricitySettingSchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
  globalRatePerUnit: z.coerce.number().min(0, 'Rate cannot be negative'),
  notes: z.string().max(500).optional(),
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

export const updateGasBillSchema = z.object({
  paidAmount: z.coerce.number().min(0),
  paymentDate: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// ========== Expense Validators ==========
export const createExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  category: z.enum(['water', 'repair', 'maintenance', 'cleaner', 'security', 'tax', 'common_electricity', 'legal', 'renovation', 'other']),
  amount: z.coerce.number().min(0, 'Amount cannot be negative'),
  paidBy: z.enum(['jahid', 'jony']),
  expenseDate: z.string().min(1, 'Date is required'),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
  relatedUnitId: z.string().optional(),
  expenseTreatment: z.enum(['brotherMaintained', 'shared50_50', 'assignedToJahid', 'assignedToJony', 'custom']).default('brotherMaintained'),
  customShare: z.object({
    jahid: z.coerce.number().min(0),
    jony: z.coerce.number().min(0),
  }).optional(),
  notes: z.string().max(1000).optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

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
