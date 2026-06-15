'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Flame } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, Th, Td, TableRow, EmptyState } from '@/components/ui/Table';
import { formatBDT, getMonthName } from '@/lib/formatters';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: getMonthName(i + 1) }));
const YEARS = Array.from({ length: 4 }, (_, i) => ({ value: String(new Date().getFullYear() - 1 + i), label: String(new Date().getFullYear() - 1 + i) }));

const gasTypeOptions = [
  { value: 'titas', label: 'Titas Gas' },
  { value: 'cylinder', label: 'Cylinder Gas' },
  { value: 'shared', label: 'Shared' },
  { value: 'other', label: 'Other' },
];

export default function GasClient({
  initialBills,
  leases,
  defaultMonth,
  defaultYear,
}: {
  initialBills: any[];
  leases: any[];
  defaultMonth: number;
  defaultYear: number;
}) {
  const [bills, setBills] = useState(initialBills);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    leaseId: '',
    amount: '',
    gasType: 'titas',
    billingPeriod: '',
    notes: '',
  });

  const [payForm, setPayForm] = useState({
    paidAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  const fetchBills = async (m = month, y = year) => {
    const res = await fetch(`/api/gas?month=${m}&year=${y}`);
    if (res.ok) {
      const data = await res.json();
      setBills(data.bills);
    }
  };

  const handleAdd = async () => {
    if (!form.leaseId || !form.amount) { toast.error('Fill required fields'); return; }
    setLoading(true);
    try {
      const selectedLease = leases.find((l) => l._id === form.leaseId);
      const res = await fetch('/api/gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedLease?.tenantId?._id,
          leaseId: form.leaseId,
          unitIds: selectedLease?.unitIds?.map((u: any) => u._id) || [],
          month,
          year,
          amount: Number(form.amount),
          gasType: form.gasType,
          billingPeriod: form.billingPeriod,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Gas bill created');
      setShowAddModal(false);
      setForm({ leaseId: '', amount: '', gasType: 'titas', billingPeriod: '', notes: '' });
      await fetchBills();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!showPayModal || !payForm.paidAmount) { toast.error('Enter amount'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/gas/${showPayModal._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidAmount: Number(payForm.paidAmount),
          paymentDate: payForm.paymentDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Payment recorded');
      setShowPayModal(null);
      await fetchBills();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const totalDue = bills.reduce((s, b) => s + b.dueAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-2">
          <select value={month} onChange={(e) => { setMonth(Number(e.target.value)); fetchBills(Number(e.target.value), year); }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={year} onChange={(e) => { setYear(Number(e.target.value)); fetchBills(month, Number(e.target.value)); }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            {YEARS.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
          </select>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)} className="sm:ml-auto">
          Add Gas Bill
        </Button>
      </div>

      {totalDue > 0 && (
        <Card className="p-4 border-orange-200 bg-orange-50">
          <p className="text-sm font-semibold text-orange-700">
            Outstanding gas dues: <span className="text-lg">{formatBDT(totalDue)}</span>
          </p>
        </Card>
      )}

      <Card>
        {bills.length === 0 ? (
          <EmptyState
            title="No gas bills this month"
            description="Add gas bills for your tenants"
            action={<Button onClick={() => setShowAddModal(true)} leftIcon={<Flame className="w-4 h-4" />}>Add Gas Bill</Button>}
          />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>Tenant</Th>
                <Th>Units</Th>
                <Th>Type</Th>
                <Th>Amount</Th>
                <Th>Paid</Th>
                <Th>Due</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </TableHead>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill._id}>
                  <Td>
                    <p className="font-medium">{bill.tenantId?.name}</p>
                    <p className="text-xs text-slate-400">{bill.tenantId?.phone}</p>
                  </Td>
                  <Td className="text-xs">
                    {bill.unitIds?.map((u: any) => u.unitName).join(', ')}
                  </Td>
                  <Td className="capitalize text-sm">{bill.gasType}</Td>
                  <Td className="font-semibold">{formatBDT(bill.amount)}</Td>
                  <Td className="text-green-600">{formatBDT(bill.paidAmount)}</Td>
                  <Td className={bill.dueAmount > 0 ? 'text-red-500 font-medium' : 'text-slate-400'}>
                    {formatBDT(bill.dueAmount)}
                  </Td>
                  <Td><StatusBadge status={bill.status} /></Td>
                  <Td>
                    {bill.status !== 'paid' && (
                      <Button size="sm" variant="outline"
                        onClick={() => { setPayForm({ paidAmount: String(bill.dueAmount), paymentDate: new Date().toISOString().split('T')[0] }); setShowPayModal(bill); }}>
                        Pay
                      </Button>
                    )}
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Gas Bill" size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAdd} loading={loading}>Create Bill</Button>
          </div>
        }>
        <div className="space-y-4">
          <Select label="Lease / Tenant" required
            options={leases.map((l) => ({ value: l._id, label: `${l.tenantId?.name} — ${l.unitIds?.map((u: any) => u.unitName).join(', ')}` }))}
            placeholder="Select lease"
            value={form.leaseId}
            onChange={(e) => setForm({ ...form, leaseId: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount (৳)" type="number" required leftAddon="৳"
              value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Select label="Gas Type" options={gasTypeOptions}
              value={form.gasType} onChange={(e) => setForm({ ...form, gasType: e.target.value })} />
          </div>
          <Input label="Billing Period" placeholder="e.g. Jun 1–30"
            value={form.billingPeriod} onChange={(e) => setForm({ ...form, billingPeriod: e.target.value })} />
          <Textarea label="Notes" rows={2}
            value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>

      <Modal isOpen={!!showPayModal} onClose={() => setShowPayModal(null)} title="Record Gas Payment" size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowPayModal(null)}>Cancel</Button>
            <Button onClick={handlePay} loading={loading} variant="success">Save</Button>
          </div>
        }>
        <div className="space-y-3">
          {showPayModal && (
            <div className="bg-slate-50 rounded p-3 text-xs">
              <p><strong>Bill Amount:</strong> {formatBDT(showPayModal.amount)}</p>
              <p className="text-red-600"><strong>Due:</strong> {formatBDT(showPayModal.dueAmount)}</p>
            </div>
          )}
          <Input label="Amount Paid (৳)" type="number" leftAddon="৳"
            value={payForm.paidAmount} onChange={(e) => setPayForm({ ...payForm, paidAmount: e.target.value })} />
          <Input label="Payment Date" type="date"
            value={payForm.paymentDate} onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
