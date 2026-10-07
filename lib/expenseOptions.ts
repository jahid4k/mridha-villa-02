// Single list of expense categories and payers, shared by the model, the
// validator and the form so they can't drift apart again.
// Values are what's stored; keep existing ones unchanged so old data still matches.

export const EXPENSE_CATEGORIES = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'cleaner', label: 'Cleaning' },
  { value: 'common_electricity', label: 'Electricity (Building)' },
  { value: 'water', label: 'Water' },
  { value: 'security', label: 'Security' },
  { value: 'staff', label: 'Staff / Labor' },
  { value: 'legal', label: 'Legal' },
  { value: 'tax', label: 'Tax / Govt' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'other', label: 'Other' },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]['value'];

export const EXPENSE_CATEGORY_VALUES = EXPENSE_CATEGORIES.map((c) => c.value) as [
  ExpenseCategory,
  ...ExpenseCategory[],
];

export const EXPENSE_PAYERS = [
  { value: 'jahid', label: 'Jahid' },
  { value: 'jony', label: 'Jony' },
  { value: 'joint', label: 'Joint / Both' },
] as const;

export type ExpensePayer = (typeof EXPENSE_PAYERS)[number]['value'];

export const EXPENSE_PAYER_VALUES = EXPENSE_PAYERS.map((p) => p.value) as [
  ExpensePayer,
  ...ExpensePayer[],
];
