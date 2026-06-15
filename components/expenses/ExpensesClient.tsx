'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Archive, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Table, TableHead, TableBody, Th, Td, TableRow, EmptyState } from '@/components/ui/Table';
import { formatBDT, formatDate, getMonthName } from '@/lib/formatters';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: getMonthName(i + 1) }));
const YEARS = Array.from({ length: 4 }, (_, i) => ({ value: String(new Date().getFullYear() - 1 + i), label: String(new Date().getFullYear() - 1 + i) }));

const categoryOptions = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'electricity', label: 'Electricity (Building)' },
  { value: 'water', label: 'Water' },
  { value: 'security', label: 'Security' },
  { value: 'staff', label: 'Staff / Labor' },
  { value: 'legal', label: 'Legal' },
  { value: 'tax', label: 'Tax / Govt' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'other', label: 'Other' },
];

const treatmentOptions = [
  { value: 'brotherMaintained', label: 'Maintained by a brother (not split)' },
  { value: 'shared50_50', label: 'Split 50/50 between Jahid & Jony' },
  { value: 'custom', label: 'Custom split' },
];

const paidByOptions = [
  { value: 'jahid', label: 'Jahid' },
  { value: 'jony', label: 'Jony' },
  { value: 'joint', label: 'Joint / Both' },
];

function ExpenseForm({
  defaultValues,
  units,
  onSubmit,
  loading,
}: {
  defaultValues?: any;
  units: any[];
  onSubmit: (data: any) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    title: '',
    category: 'maintenance',
    paidBy: 'jahid',
    expenseTreatment: 'brotherMaintained',
    paidByJahid: '',
    paidByJony: '',
    relatedUnitId: '',
    notes: '',
    ...defaultValues,
    amount: defaultValues?.amount != null ? String(defaultValues.amount) : '',
    expenseDate: defaultValues?.expenseDate
      ? String(defaultValues.expenseDate).split('T')[0]
      : new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.amount) { toast.error('Title and amount are required'); return; }
    onSubmit({
      ...form,
      amount: Number(form.amount),
      paidByJahid: form.expenseTreatment === 'custom' ? Number(form.paidByJahid) : undefined,
      paidByJony: form.expenseTreatment === 'custom' ? Number(form.paidByJony) : undefined,
      relatedUnitId: form.relatedUnitId || undefined,
      month: new Date(form.expenseDate).getMonth() + 1,
      year: new Date(form.expenseDate).getFullYear(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Title" required placeholder="e.g. Roof repair" value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Amount (৳)" type="number" required leftAddon="৳" value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <Input label="Date" type="date" required value={form.expenseDate}
          onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Category" options={categoryOptions} value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <Select label="Paid By" options={paidByOptions} value={form.paidBy}
          onChange={(e) => setForm({ ...form, paidBy: e.target.value })} />
      </div>
      <Select label="Expense Treatment" options={treatmentOptions} value={form.expenseTreatment}
        onChange={(e) => setForm({ ...form, expenseTreatment: e.target.value })} />
      {form.expenseTreatment === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Jahid's Share (৳)" type="number" leftAddon="৳" value={form.paidByJahid}
            onChange={(e) => setForm({ ...form, paidByJahid: e.target.value })} />
          <Input label="Jony's Share (৳)" type="number" leftAddon="৳" value={form.paidByJony}
            onChange={(e) => setForm({ ...form, paidByJony: e.target.value })} />
        </div>
      )}
      <Select label="Related Unit (Optional)"
        options={[{ value: '', label: 'None' }, ...units.map((u) => ({ value: u._id, label: u.unitName }))]}
        value={form.relatedUnitId}
        onChange={(e) => setForm({ ...form, relatedUnitId: e.target.value })} />
      <Textarea label="Notes" rows={2} value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <Button type="submit" loading={loading} className="w-full">Save Expense</Button>
    </form>
  );
}

export default function ExpensesClient({
  initialExpenses,
  units,
  defaultMonth,
  defaultYear,
  currentUser,
}: {
  initialExpenses: any[];
  units: any[];
  defaultMonth: number;
  defaultYear: number;
  currentUser: string;
}) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [archiveTarget, setArchiveTarget] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const fetchExpenses = async (m = month, y = year) => {
    const params = new URLSearchParams({ month: String(m), year: String(y) });
    if (showArchived) params.set('includeArchived', 'true');
    const res = await fetch(`/api/expenses?${params}`);
    if (res.ok) {
      const data = await res.json();
      setExpenses(data.expenses);
    }
  };

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      const method = editingExpense ? 'PUT' : 'POST';
      const url = editingExpense ? `/api/expenses/${editingExpense._id}` : '/api/expenses';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success(editingExpense ? 'Expense updated' : 'Expense recorded');
      setShowModal(false);
      setEditingExpense(null);
      await fetchExpenses();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setLoading(true);
    try {
      const action = archiveTarget.status === 'archived' ? 'restore' : 'archive';
      const res = await fetch(`/api/expenses/${archiveTarget._id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success(action === 'archive' ? 'Expense archived' : 'Expense restored');
      setArchiveTarget(null);
      await fetchExpenses();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = expenses.filter(e => e.status !== 'archived').reduce((s, e) => s + e.amount, 0);
  const jahidTotal = expenses.filter(e => e.status !== 'archived' && e.paidBy === 'jahid').reduce((s, e) => s + e.amount, 0);
  const jonyTotal = expenses.filter(e => e.status !== 'archived' && e.paidBy === 'jony').reduce((s, e) => s + e.amount, 0);

  const treatmentLabel: Record<string, string> = {
    brotherMaintained: 'Brother',
    shared50_50: '50/50',
    custom: 'Custom',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-2">
          <select value={month} onChange={(e) => { setMonth(Number(e.target.value)); fetchExpenses(Number(e.target.value), year); }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={year} onChange={(e) => { setYear(Number(e.target.value)); fetchExpenses(month, Number(e.target.value)); }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            {YEARS.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <button onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${showArchived ? 'bg-slate-800 text-white' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}>
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setEditingExpense(null); setShowModal(true); }}>
            Add Expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xl font-bold text-slate-800">{formatBDT(totalAmount)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Expenses</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xl font-bold text-indigo-600">{formatBDT(jahidTotal)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Paid by Jahid</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xl font-bold text-emerald-600">{formatBDT(jonyTotal)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Paid by Jony</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        {expenses.length === 0 ? (
          <EmptyState title="No expenses this month" description="Record building expenses and maintenance costs"
            action={<Button onClick={() => setShowModal(true)} leftIcon={<Plus className="w-4 h-4" />}>Add Expense</Button>} />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>Title</Th>
                <Th>Category</Th>
                <Th>Date</Th>
                <Th>Amount</Th>
                <Th>Paid By</Th>
                <Th>Treatment</Th>
                <Th>Unit</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </TableHead>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense._id}>
                  <Td>
                    <p className="font-medium text-slate-800">{expense.title}</p>
                    {expense.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-32">{expense.notes}</p>}
                  </Td>
                  <Td className="capitalize text-sm">{expense.category}</Td>
                  <Td className="text-sm">{formatDate(expense.expenseDate)}</Td>
                  <Td className="font-semibold text-orange-600">{formatBDT(expense.amount)}</Td>
                  <Td className="capitalize text-sm">{expense.paidBy}</Td>
                  <Td><span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{treatmentLabel[expense.expenseTreatment] || expense.expenseTreatment}</span></Td>
                  <Td className="text-xs text-slate-500">{expense.relatedUnitId?.unitName || '—'}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      {expense.status !== 'archived' && (
                        <button onClick={() => { setEditingExpense(expense); setShowModal(true); }}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => setArchiveTarget(expense)}
                        className={`p-1.5 rounded text-slate-500 ${expense.status === 'archived' ? 'hover:bg-green-50 hover:text-green-600' : 'hover:bg-red-50 hover:text-red-600'}`}>
                        {expense.status === 'archived' ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingExpense(null); }}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'} size="lg">
        <ExpenseForm defaultValues={editingExpense} units={units} onSubmit={handleSubmit} loading={loading} />
      </Modal>

      <ConfirmDialog isOpen={!!archiveTarget} onClose={() => setArchiveTarget(null)} onConfirm={handleArchive}
        title={archiveTarget?.status === 'archived' ? 'Restore Expense' : 'Archive Expense'}
        message={archiveTarget?.status === 'archived'
          ? `Restore "${archiveTarget?.title}"?`
          : `Archive "${archiveTarget?.title}"? It will be excluded from totals.`}
        confirmLabel={archiveTarget?.status === 'archived' ? 'Restore' : 'Archive'}
        confirmVariant={archiveTarget?.status === 'archived' ? 'primary' : 'danger'}
        loading={loading} />
    </div>
  );
}
