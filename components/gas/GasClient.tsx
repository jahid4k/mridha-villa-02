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
import { todayInDhaka } from '@/lib/formatters';
import { useI18n } from '@/components/providers/LanguageProvider';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i);

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
  const { t, f } = useI18n();
  const [bills, setBills] = useState(initialBills);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ leaseId: '', amount: '', notes: '' });

  const [payForm, setPayForm] = useState({
    paidAmount: '',
    paymentDate: todayInDhaka(),
  });

  const fetchBills = async (m = month, y = year) => {
    const res = await fetch(`/api/gas?month=${m}&year=${y}`);
    if (res.ok) {
      const data = await res.json();
      setBills(data.bills);
    }
  };

  const handleAdd = async () => {
    if (!form.leaseId || !form.amount) { toast.error(t('Fill required fields')); return; }
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
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(t(data.error));
      toast.success(t('Gas bill created'));
      setShowAddModal(false);
      setForm({ leaseId: '', amount: '', notes: '' });
      await fetchBills();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!showPayModal || !(Number(payForm.paidAmount) > 0)) { toast.error(t('Enter the amount received')); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/gas/${showPayModal._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // The amount received now; the server adds it to what's already paid.
          amount: Number(payForm.paidAmount),
          paymentDate: payForm.paymentDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(t(data.error));
      toast.success(t('Payment recorded'));
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
            {MONTHS.map((m) => <option key={m} value={m}>{f.month(m)}</option>)}
          </select>
          <select value={year} onChange={(e) => { setYear(Number(e.target.value)); fetchBills(month, Number(e.target.value)); }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            {YEARS.map((y) => <option key={y} value={y}>{f.digits(y)}</option>)}
          </select>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)} className="sm:ml-auto">
          {t('Add Gas Bill')}
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        {t("Units with a fixed monthly gas charge are billed automatically on the 1st. Add a bill here only for anything extra.")}
      </p>

      {totalDue > 0 && (
        <Card className="p-4 border-orange-200 bg-orange-50">
          <p className="text-sm font-semibold text-orange-700">
            {t('Outstanding gas dues:')} <span className="text-lg">{f.bdt(totalDue)}</span>
          </p>
        </Card>
      )}

      <Card>
        {bills.length === 0 ? (
          <EmptyState
            title={t('No gas bills this month')}
            description={t('Set a fixed monthly gas charge on a unit to bill it automatically')}
            action={<Button onClick={() => setShowAddModal(true)} leftIcon={<Flame className="w-4 h-4" />}>{t('Add Gas Bill')}</Button>}
          />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>{t('Tenant')}</Th>
                <Th>{t('Units')}</Th>
                <Th>{t('Amount')}</Th>
                <Th>{t('Paid')}</Th>
                <Th>{t('Due')}</Th>
                <Th>{t('Status')}</Th>
                <Th>{t('Actions')}</Th>
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
                  <Td className="font-semibold">{f.bdt(bill.amount)}</Td>
                  <Td className="text-green-600">{f.bdt(bill.paidAmount)}</Td>
                  <Td className={bill.dueAmount > 0 ? 'text-red-500 font-medium' : 'text-slate-400'}>
                    {f.bdt(bill.dueAmount)}
                  </Td>
                  <Td><StatusBadge status={bill.status} /></Td>
                  <Td>
                    {bill.status !== 'paid' && (
                      <Button size="sm" variant="outline"
                        onClick={() => { setPayForm({ paidAmount: String(bill.dueAmount), paymentDate: todayInDhaka() }); setShowPayModal(bill); }}>
                        {t('Pay')}
                      </Button>
                    )}
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={t('Add Gas Bill')} size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>{t('Cancel')}</Button>
            <Button onClick={handleAdd} loading={loading}>{t('Create Bill')}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Select label={t('Lease / Tenant')} required
            options={leases.map((l) => ({ value: l._id, label: `${l.tenantId?.name} — ${l.unitIds?.map((u: any) => u.unitName).join(', ')}` }))}
            placeholder={t('Select lease')}
            value={form.leaseId}
            onChange={(e) => setForm({ ...form, leaseId: e.target.value })}
          />
          <Input label={t('Amount (৳)')} type="number" required leftAddon="৳"
            value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Textarea label={t('Notes')} rows={2}
            value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>

      <Modal isOpen={!!showPayModal} onClose={() => setShowPayModal(null)} title={t('Record Gas Payment')} size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowPayModal(null)}>{t('Cancel')}</Button>
            <Button onClick={handlePay} loading={loading} variant="success">{t('Save')}</Button>
          </div>
        }>
        <div className="space-y-3">
          {showPayModal && (
            <div className="bg-slate-50 rounded p-3 text-xs">
              <p><strong>{t('Bill Amount:')}</strong> {f.bdt(showPayModal.amount)}</p>
              <p><strong>{t('Already Paid:')}</strong> {f.bdt(showPayModal.paidAmount)}</p>
              <p className="text-red-600"><strong>{t('Due:')}</strong> {f.bdt(showPayModal.dueAmount)}</p>
            </div>
          )}
          <Input label={t('Amount Received Now (৳)')} type="number" leftAddon="৳"
            value={payForm.paidAmount} onChange={(e) => setPayForm({ ...payForm, paidAmount: e.target.value })}
            hint={t("Added to what's already been paid")} />
          <Input label={t('Payment Date')} type="date"
            value={payForm.paymentDate} onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
