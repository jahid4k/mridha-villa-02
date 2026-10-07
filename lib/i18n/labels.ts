// Readable names for the activity history (audit log), passed through t().

export const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  archive: 'Archived',
  restore: 'Restored',
  payment: 'Payment',
  adjustment: 'Adjusted',
  delete: 'Deleted',
  login: 'Login',
  generate: 'Generated',
};

export const ENTITY_LABELS: Record<string, string> = {
  user: 'User',
  unit: 'Unit',
  tenant: 'Tenant',
  lease: 'Lease',
  rentRecord: 'Rent record',
  payment: 'Payment',
  electricityBill: 'Electricity bill',
  gasBill: 'Gas bill',
  expense: 'Expense',
  setting: 'Setting',
  document: 'Document',
};

export const PERSON_LABELS: Record<string, string> = {
  jahid: 'Jahid',
  jony: 'Jony',
  system: 'System',
};
