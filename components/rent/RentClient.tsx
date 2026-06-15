'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, CreditCard, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { StatusBadge, CollectorBadge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, Th, Td, TableRow, EmptyState } from '@/components/ui/Table';
import { formatBDT, formatDate, getMonthName } from '@/lib/formatters';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: getMonthName(i + 1),
}));
const YEARS = Array.from({ length: 5 }, (_, i) => ({
  value: String(new Date().getFullYear() - 2 + i),
  label: String(new Date().getFullYear() - 2 + i),
}));

export default function RentClient({
  initialRecords,
  activeLeases,
  defaultMonth,
  defaultYear,
  currentUser,
}: {
  initialRecords: any[];
  activeLeases: any[];
  defaultMonth: number;
  defaultYear: number;
  currentUser: string;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [showGenModal, setShowGenModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  // Generate form state
  const [genForm, setGenForm] = useState({
    leaseId: '',
    extraCharges: 0,
    discount: 0,
    notes: '',
  });

  // Payment form state
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    receivedBy: currentUser === 'jahid' || currentUser === 'jony' ? currentUser : 'jahid',
    paymentType: 'rent',
    notes: '',
  });

  const fetchRecords = async (m = month, y = year) => {
    const res = await fetch(`/api/rent?month=${m}&year=${y}`);
    if (res.ok) {
      const data = await res.json();
      setRecords(data.records);
    }
  };

  const handleMonthYearChange = (m: number, y: number) => {
    setMonth(m);
    setYear(y);
    fetchRecords(m, y);
  };

  const handleGenerateAll = async () => {
    setLoading(true);
    let created = 0;
    let skipped = 0;
    for (const lease of activeLeases) {
      const existing = records.find((r) => r.leaseId?._id === lease._id || r.leaseId === lease._id);
      if (existing) { skipped++; continue; }
      try {
        const res = await fetch('/api/rent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leaseId: lease._id, month, year }),
        });
        if (res.ok) created++;
      } catch {}
    }
    toast.success(`Generated ${created} records${skipped > 0 ? `, ${skipped} skipped` : ''}`);
    await fetchRecords();
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!genForm.leaseId) { toast.error('Select a lease'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...genForm, month, year }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Rent record generated');
      setShowGenModal(false);
      await fetchRecords();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!showPayModal || !payForm.amount) { toast.error('Enter amount'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/rent/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: showPayModal.tenantId?._id || showPayModal.tenantId,
          leaseId: showPayModal.leaseId?._id || showPayModal.leaseId,
          monthlyRentRecordId: showPayModal._id,
          amount: Number(payForm.amount),
          paymentDate: payForm.paymentDate,
          paymentMethod: payForm.paymentMethod,
          receivedBy: payForm.receivedBy,
          paymentType: payForm.paymentType,
          notes: payForm.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Payment recorded');
      setShowPayModal(null);
      await fetchRecords();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const totalExpected = records.reduce((s, r) => s + r.totalPayable, 0);
  const totalCollected = records.reduce((s, r) => s + r.collectedAmount, 0);
  const totalDue = records.reduce((s, r) => s + r.dueAmount, 0);

  const leasesWithoutRecord = activeLeases.filter(
    (l) => !records.find((r) => (r.leaseId?._id || r.leaseId) === l._id)
  );

  return (
    <div className="space-y-4">
      {/* Month/Year Selector + Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => handleMonthYearChange(Number(e.target.value), year)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select
            value={year}
            onChange={(e) => handleMonthYearChange(month, Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {YEARS.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          {leasesWithoutRecord.length > 0 && (
            <Button
              variant="outline"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={handleGenerateAll}
              loading={loading}
            >
              Generate All ({leasesWithoutRecord.length})
            </Button>
          )}
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowGenModal(true)}
          >
            Generate Record
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xl font-bold text-slate-800">{formatBDT(totalExpected)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Expected</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xl font-bold text-green-600">{formatBDT(totalCollected)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Collected</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xl font-bold text-red-500">{formatBDT(totalDue)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Due</p>
        </Card>
      </div>

      {/* Records */}
      <Card>
        {records.length === 0 ? (
          <EmptyState
            title="No rent records for this month"
            description={`Generate rent records for ${getMonthName(month)} ${year}`}
            action={
              <Button onClick={handleGenerateAll} loading={loading} leftIcon={<RefreshCw className="w-4 h-4" />}>
                Generate All Records
              </Button>
            }
          />
        ) : (
          <div>
            {/* Mobile card view */}
            <div className="divide-y divide-slate-100">
              {records.map((record) => (
                <div key={record._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-800">{record.tenantId?.name}</p>
                        <StatusBadge status={record.status} />
                        <CollectorBadge collector={record.collector} />
                      </div>
                      <p className="text-xs text-slate-500">
                        {record.unitIds?.map((u: any) => u.unitName).join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{formatBDT(record.totalPayable)}</p>
                      {record.dueAmount > 0 && (
                        <p className="text-xs text-red-500">Due: {formatBDT(record.dueAmount)}</p>
                      )}
                      {record.collectedAmount > 0 && (
                        <p className="text-xs text-green-600">Paid: {formatBDT(record.collectedAmount)}</p>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedRecord === record._id && (
                    <div className="mt-3 bg-slate-50 rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-slate-500">Base Rent:</span> <span className="font-medium">{formatBDT(record.baseRent)}</span></div>
                      <div><span className="text-slate-500">Prev Due:</span> <span className="font-medium text-orange-600">{formatBDT(record.previousDue)}</span></div>
                      <div><span className="text-slate-500">Extra:</span> <span className="font-medium">{formatBDT(record.extraCharges)}</span></div>
                      <div><span className="text-slate-500">Discount:</span> <span className="font-medium text-green-600">-{formatBDT(record.discount)}</span></div>
                      <div><span className="text-slate-500">Advance Adj:</span> <span className="font-medium text-blue-600">-{formatBDT(record.advanceAdjustment)}</span></div>
                      <div><span className="text-slate-500">Total Payable:</span> <span className="font-bold">{formatBDT(record.totalPayable)}</span></div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => setExpandedRecord(expandedRecord === record._id ? null : record._id)}
                      className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                    >
                      {expandedRecord === record._id ? (
                        <><ChevronUp className="w-3 h-3" />Hide details</>
                      ) : (
                        <><ChevronDown className="w-3 h-3" />Show details</>
                      )}
                    </button>
                    {record.status !== 'paid' && record.status !== 'archived' && (
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<CreditCard className="w-3 h-3" />}
                        onClick={() => {
                          setPayForm({
                            amount: String(record.dueAmount || record.totalPayable),
                            paymentDate: new Date().toISOString().split('T')[0],
                            paymentMethod: 'cash',
                            receivedBy: record.collector,
                            paymentType: 'rent',
                            notes: '',
                          });
                          setShowPayModal(record);
                        }}
                      >
                        Record Payment
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Generate Modal */}
      <Modal
        isOpen={showGenModal}
        onClose={() => setShowGenModal(false)}
        title={`Generate Rent Record — ${getMonthName(month)} ${year}`}
        size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowGenModal(false)}>Cancel</Button>
            <Button onClick={handleGenerate} loading={loading}>Generate</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Lease"
            required
            options={activeLeases.map((l) => ({
              value: l._id,
              label: `${l.tenantId?.name} — ${l.unitIds?.map((u: any) => u.unitName).join(', ')} — ৳${l.monthlyRentAmount}`,
            }))}
            placeholder="Select lease"
            value={genForm.leaseId}
            onChange={(e) => setGenForm({ ...genForm, leaseId: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Extra Charges (৳)"
              type="number"
              value={genForm.extraCharges}
              onChange={(e) => setGenForm({ ...genForm, extraCharges: Number(e.target.value) })}
              leftAddon="৳"
            />
            <Input
              label="Discount (৳)"
              type="number"
              value={genForm.discount}
              onChange={(e) => setGenForm({ ...genForm, discount: Number(e.target.value) })}
              leftAddon="৳"
            />
          </div>
          <Textarea
            label="Notes"
            rows={2}
            value={genForm.notes}
            onChange={(e) => setGenForm({ ...genForm, notes: e.target.value })}
          />
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={!!showPayModal}
        onClose={() => setShowPayModal(null)}
        title={`Record Payment — ${showPayModal?.tenantId?.name}`}
        size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowPayModal(null)}>Cancel</Button>
            <Button onClick={handlePayment} loading={loading} variant="success">Save Payment</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {showPayModal && (
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
              <p><strong>Total Payable:</strong> {formatBDT(showPayModal.totalPayable)}</p>
              <p><strong>Already Paid:</strong> {formatBDT(showPayModal.collectedAmount)}</p>
              <p className="text-red-600 font-semibold"><strong>Remaining Due:</strong> {formatBDT(showPayModal.dueAmount)}</p>
            </div>
          )}
          <Input
            label="Amount (৳)"
            type="number"
            required
            leftAddon="৳"
            value={payForm.amount}
            onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Payment Date"
              type="date"
              value={payForm.paymentDate}
              onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
            />
            <Select
              label="Method"
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'bank', label: 'Bank Transfer' },
                { value: 'bkash', label: 'bKash' },
                { value: 'nagad', label: 'Nagad' },
                { value: 'rocket', label: 'Rocket' },
              ]}
              value={payForm.paymentMethod}
              onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Received By"
              options={[
                { value: 'jahid', label: 'Jahid' },
                { value: 'jony', label: 'Jony' },
              ]}
              value={payForm.receivedBy}
              onChange={(e) => setPayForm({ ...payForm, receivedBy: e.target.value })}
            />
            <Select
              label="Payment Type"
              options={[
                { value: 'rent', label: 'Rent' },
                { value: 'advance', label: 'Advance' },
                { value: 'due', label: 'Due' },
                { value: 'adjustment', label: 'Adjustment' },
              ]}
              value={payForm.paymentType}
              onChange={(e) => setPayForm({ ...payForm, paymentType: e.target.value })}
            />
          </div>
          <Textarea
            label="Notes"
            rows={2}
            value={payForm.notes}
            onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
