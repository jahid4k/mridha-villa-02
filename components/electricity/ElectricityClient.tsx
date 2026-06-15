'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Zap, Settings } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, Th, Td, TableRow, EmptyState } from '@/components/ui/Table';
import { formatBDT, getMonthName } from '@/lib/formatters';
import { calculateElectricityBill } from '@/lib/calculations';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: getMonthName(i + 1),
}));
const YEARS = Array.from({ length: 4 }, (_, i) => ({
  value: String(new Date().getFullYear() - 1 + i),
  label: String(new Date().getFullYear() - 1 + i),
}));

export default function ElectricityClient({
  initialBills,
  currentRate,
  leases,
  units,
  defaultMonth,
  defaultYear,
}: {
  initialBills: any[];
  currentRate: number;
  leases: any[];
  units: any[];
  defaultMonth: number;
  defaultYear: number;
}) {
  const [bills, setBills] = useState(initialBills);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState<any>(null);
  const [showRateModal, setShowRateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState(currentRate);

  const [form, setForm] = useState({
    leaseId: '',
    unitId: '',
    tenantId: '',
    previousReading: '',
    currentReading: '',
    manualAdjustment: '0',
    notes: '',
  });

  const [payForm, setPayForm] = useState({
    paidAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  const [newRate, setNewRate] = useState(String(currentRate));

  const fetchBills = async (m = month, y = year) => {
    const res = await fetch(`/api/electricity?month=${m}&year=${y}`);
    if (res.ok) {
      const data = await res.json();
      setBills(data.bills);
    }
  };

  const preview = form.previousReading && form.currentReading
    ? calculateElectricityBill({
        previousReading: Number(form.previousReading),
        currentReading: Number(form.currentReading),
        globalRatePerUnit: rate,
        manualAdjustment: Number(form.manualAdjustment) || 0,
      })
    : null;

  const handleAdd = async () => {
    if (!form.leaseId || !form.unitId || !form.previousReading || !form.currentReading) {
      toast.error('Fill all required fields');
      return;
    }
    setLoading(true);
    try {
      const selectedLease = leases.find((l) => l._id === form.leaseId);
      const res = await fetch('/api/electricity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedLease?.tenantId?._id,
          leaseId: form.leaseId,
          unitId: form.unitId,
          month,
          year,
          previousReading: Number(form.previousReading),
          currentReading: Number(form.currentReading),
          globalRatePerUnit: rate,
          manualAdjustment: Number(form.manualAdjustment) || 0,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Electricity bill created');
      setShowAddModal(false);
      setForm({ leaseId: '', unitId: '', tenantId: '', previousReading: '', currentReading: '', manualAdjustment: '0', notes: '' });
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
      const res = await fetch(`/api/electricity/${showPayModal._id}`, {
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

  const handleSetRate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/electricity/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, globalRatePerUnit: Number(newRate) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRate(Number(newRate));
      toast.success(`Rate set to ৳${newRate}/unit for ${getMonthName(month)} ${year}`);
      setShowRateModal(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const totalDue = bills.reduce((s, b) => s + b.dueAmount, 0);
  const totalBilled = bills.reduce((s, b) => s + b.finalAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => { setMonth(Number(e.target.value)); fetchBills(Number(e.target.value), year); }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select
            value={year}
            onChange={(e) => { setYear(Number(e.target.value)); fetchBills(month, Number(e.target.value)); }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {YEARS.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Settings className="w-3.5 h-3.5" />}
            onClick={() => setShowRateModal(true)}
          >
            Rate: ৳{rate}/unit
          </Button>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
            Add Bill
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xl font-bold text-slate-800">{formatBDT(totalBilled)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Billed</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xl font-bold text-green-600">{formatBDT(totalBilled - totalDue)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Collected</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xl font-bold text-red-500">{formatBDT(totalDue)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Outstanding</p>
        </Card>
      </div>

      <Card>
        {bills.length === 0 ? (
          <EmptyState
            title="No electricity bills this month"
            description="Add sub-meter readings to generate electricity bills"
            action={<Button onClick={() => setShowAddModal(true)} leftIcon={<Zap className="w-4 h-4" />}>Add Bill</Button>}
          />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>Tenant</Th>
                <Th>Unit</Th>
                <Th>Reading</Th>
                <Th>Units Used</Th>
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
                  <Td>
                    <p className="font-medium">{bill.unitId?.unitName}</p>
                    <p className="text-xs text-slate-400">{bill.unitId?.electricityMeterNumber}</p>
                  </Td>
                  <Td className="text-xs">
                    <span className="text-slate-500">{bill.previousReading}</span>
                    <span className="mx-1 text-slate-300">→</span>
                    <span className="font-medium">{bill.currentReading}</span>
                  </Td>
                  <Td className="font-medium">{bill.consumedUnits} units</Td>
                  <Td className="font-semibold">{formatBDT(bill.finalAmount)}</Td>
                  <Td className="text-green-600">{formatBDT(bill.paidAmount)}</Td>
                  <Td className={bill.dueAmount > 0 ? 'text-red-500 font-medium' : 'text-slate-400'}>
                    {formatBDT(bill.dueAmount)}
                  </Td>
                  <Td><StatusBadge status={bill.status} /></Td>
                  <Td>
                    {bill.status !== 'paid' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPayForm({ paidAmount: String(bill.dueAmount), paymentDate: new Date().toISOString().split('T')[0] });
                          setShowPayModal(bill);
                        }}
                      >
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

      {/* Add Bill Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Electricity Bill" size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAdd} loading={loading}>Create Bill</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Lease"
            required
            options={leases.map((l) => ({
              value: l._id,
              label: `${l.tenantId?.name} — ${l.unitIds?.map((u: any) => u.unitName).join(', ')}`,
            }))}
            placeholder="Select lease"
            value={form.leaseId}
            onChange={(e) => setForm({ ...form, leaseId: e.target.value })}
          />
          <Select
            label="Unit (with sub-meter)"
            required
            options={units.map((u) => ({
              value: u._id,
              label: `${u.unitName} — Meter: ${u.electricityMeterNumber || 'No meter no.'}`,
            }))}
            placeholder="Select unit"
            value={form.unitId}
            onChange={(e) => setForm({ ...form, unitId: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Previous Reading"
              type="number"
              required
              value={form.previousReading}
              onChange={(e) => setForm({ ...form, previousReading: e.target.value })}
            />
            <Input
              label="Current Reading"
              type="number"
              required
              value={form.currentReading}
              onChange={(e) => setForm({ ...form, currentReading: e.target.value })}
            />
          </div>
          <Input
            label="Manual Adjustment (৳)"
            type="number"
            value={form.manualAdjustment}
            onChange={(e) => setForm({ ...form, manualAdjustment: e.target.value })}
            hint="Positive to add, negative to deduct"
          />
          {preview && (
            <div className="bg-indigo-50 rounded-lg p-3 text-xs space-y-1">
              <p><span className="text-slate-600">Units consumed:</span> <strong>{preview.consumedUnits}</strong></p>
              <p><span className="text-slate-600">Rate:</span> ৳{rate}/unit</p>
              <p><span className="text-slate-600">Calculated:</span> <strong>{formatBDT(preview.calculatedAmount)}</strong></p>
              {preview.manualAdjustment !== 0 && <p><span className="text-slate-600">Adjustment:</span> {formatBDT(preview.manualAdjustment)}</p>}
              <p className="text-indigo-700 font-semibold"><span>Final Amount:</span> {formatBDT(preview.finalAmount)}</p>
            </div>
          )}
          <Textarea label="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>

      {/* Pay Modal */}
      <Modal isOpen={!!showPayModal} onClose={() => setShowPayModal(null)} title="Record Payment" size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowPayModal(null)}>Cancel</Button>
            <Button onClick={handlePay} loading={loading} variant="success">Save</Button>
          </div>
        }
      >
        <div className="space-y-3">
          {showPayModal && (
            <div className="bg-slate-50 rounded p-3 text-xs">
              <p><strong>Bill Amount:</strong> {formatBDT(showPayModal.finalAmount)}</p>
              <p><strong>Already Paid:</strong> {formatBDT(showPayModal.paidAmount)}</p>
              <p className="text-red-600"><strong>Due:</strong> {formatBDT(showPayModal.dueAmount)}</p>
            </div>
          )}
          <Input label="Amount Paid (৳)" type="number" leftAddon="৳"
            value={payForm.paidAmount}
            onChange={(e) => setPayForm({ ...payForm, paidAmount: e.target.value })}
          />
          <Input label="Payment Date" type="date"
            value={payForm.paymentDate}
            onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
          />
        </div>
      </Modal>

      {/* Rate Modal */}
      <Modal isOpen={showRateModal} onClose={() => setShowRateModal(false)} title="Set Electricity Rate" size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowRateModal(false)}>Cancel</Button>
            <Button onClick={handleSetRate} loading={loading}>Save Rate</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label={`Rate for ${getMonthName(month)} ${year}`}
            type="number"
            leftAddon="৳"
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
            hint="BDT per unit of electricity consumed"
          />
        </div>
      </Modal>
    </div>
  );
}
