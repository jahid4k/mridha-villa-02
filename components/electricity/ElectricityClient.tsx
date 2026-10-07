'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Zap, Settings, Pencil, Archive } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, toNumberText } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, Th, Td, TableRow, EmptyState } from '@/components/ui/Table';
import { todayInDhaka } from '@/lib/formatters';
import { useI18n } from '@/components/providers/LanguageProvider';
import { calculateElectricityBill } from '@/lib/calculations';
import { cn } from '@/lib/utils';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i);

const today = todayInDhaka;

const cellInputCls =
  'w-24 border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

interface Sheet {
  month: number;
  year: number;
  rate: { rate: number; source: 'set' | 'carried' | 'default'; month?: number; year?: number } | null;
  rows: any[];
}

type Draft = { previousReading: string; currentReading: string };

// Unbilled rows start with last month's closing reading as the previous reading.
function draftsFor(rows: any[], keep: Record<string, Draft> = {}): Record<string, Draft> {
  const drafts: Record<string, Draft> = {};
  for (const row of rows) {
    if (row.bill) continue;
    drafts[row.key] = keep[row.key] ?? {
      previousReading: row.lastReading ? String(row.lastReading.reading) : '',
      currentReading: '',
    };
  }
  return drafts;
}

function evaluate(draft: Draft | undefined, rate: number | null) {
  if (!draft || draft.previousReading === '' || draft.currentReading === '') return { state: 'empty' as const };
  const previousReading = Number(draft.previousReading);
  const currentReading = Number(draft.currentReading);
  if (!Number.isFinite(previousReading) || !Number.isFinite(currentReading) || previousReading < 0) {
    return { state: 'invalid' as const, message: 'Enter valid numbers' };
  }
  if (currentReading < previousReading) {
    return { state: 'invalid' as const, message: 'Lower than previous' };
  }
  const calc = calculateElectricityBill({ previousReading, currentReading, globalRatePerUnit: rate ?? 0 });
  return { state: 'ready' as const, previousReading, currentReading, calc };
}

export default function ElectricityClient({ initialSheet }: { initialSheet: Sheet }) {
  const [sheet, setSheet] = useState<Sheet>(initialSheet);
  const [drafts, setDrafts] = useState(() => draftsFor(initialSheet.rows));
  const [month, setMonth] = useState(initialSheet.month);
  const [year, setYear] = useState(initialSheet.year);
  const [saving, setSaving] = useState(false);

  const [payBill, setPayBill] = useState<any>(null);
  const [payForm, setPayForm] = useState({ amount: '', paymentDate: today() });

  const [editBill, setEditBill] = useState<any>(null);
  const [editForm, setEditForm] = useState({ previousReading: '', currentReading: '', manualAdjustment: '0', notes: '' });

  const [showRateModal, setShowRateModal] = useState(false);
  const [rateForm, setRateForm] = useState({ rate: '', applyToExisting: true });
  const { t, f } = useI18n();
  const monthLabel = (m: number, y: number) => f.shortMonthYear(m, y);

  const rate = sheet.rate?.rate ?? null;
  const billedRows = sheet.rows.filter((r) => r.bill);
  const pendingRows = sheet.rows.filter((r) => !r.bill);
  const readyRows = pendingRows
    .map((row) => ({ row, result: evaluate(drafts[row.key], rate) }))
    .filter((x) => x.result.state === 'ready');
  const repriceable = billedRows.filter((r) => r.bill.status === 'unpaid' || r.bill.status === 'partial');

  const totalBilled = billedRows.reduce((s, r) => s + r.bill.finalAmount, 0);
  const totalPaid = billedRows.reduce((s, r) => s + r.bill.paidAmount, 0);
  const totalDue = billedRows.reduce((s, r) => s + r.bill.dueAmount, 0);

  const loadSheet = async (m: number, y: number, keepDrafts: boolean) => {
    const res = await fetch(`/api/electricity/sheet?month=${m}&year=${y}`);
    const data = await res.json();
    if (!res.ok) {
      toast.error(t(data.error || 'Could not load bills'));
      return;
    }
    setSheet(data);
    setDrafts((prev) => draftsFor(data.rows, keepDrafts ? prev : {}));
  };

  const changeMonth = (m: number, y: number) => {
    setMonth(m);
    setYear(y);
    loadSheet(m, y, false);
  };

  const setDraft = (key: string, field: keyof Draft, value: string) =>
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  const handleCreateAll = async () => {
    if (rate === null) {
      toast.error(t('Set an electricity rate first'));
      return;
    }
    setSaving(true);
    try {
      const entries = readyRows.map(({ row, result }) => ({
        leaseId: row.leaseId,
        unitId: row.unit._id,
        previousReading: result.state === 'ready' ? result.previousReading : 0,
        currentReading: result.state === 'ready' ? result.currentReading : 0,
      }));
      const res = await fetch('/api/electricity/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, entries }),
      });
      const data = await res.json();
      if (data.created > 0) toast.success(t('Created {count} bill(s)', { count: data.created }));
      for (const err of data.errors ?? []) {
        const unitName = sheet.rows.find((r) => r.unit?._id === err.unitId)?.unit?.unitName ?? 'Unit';
        toast.error(`${unitName}: ${t(err.error)}`);
      }
      if (!res.ok && !data.errors) toast.error(t(data.error || 'Could not create bills'));
      await loadSheet(month, year, true);
    } finally {
      setSaving(false);
    }
  };

  const openPay = (bill: any) => {
    setPayForm({ amount: String(bill.dueAmount), paymentDate: today() });
    setPayBill(bill);
  };

  const handlePay = async () => {
    if (!payBill || !(Number(payForm.amount) > 0)) {
      toast.error(t('Enter the amount received'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/electricity/${payBill._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(payForm.amount), paymentDate: payForm.paymentDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(t(data.error));
      toast.success(t('Payment recorded'));
      setPayBill(null);
      await loadSheet(month, year, true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (bill: any) => {
    setEditForm({
      previousReading: String(bill.previousReading),
      currentReading: String(bill.currentReading),
      manualAdjustment: String(bill.manualAdjustment ?? 0),
      notes: bill.notes ?? '',
    });
    setEditBill(bill);
  };

  const editPreview = editBill
    ? evaluate(editForm, editBill.globalRatePerUnit)
    : null;
  const editFinal = editPreview?.state === 'ready'
    ? calculateElectricityBill({
        previousReading: editPreview.previousReading,
        currentReading: editPreview.currentReading,
        globalRatePerUnit: editBill.globalRatePerUnit,
        manualAdjustment: Number(editForm.manualAdjustment) || 0,
      })
    : null;

  const handleEdit = async () => {
    if (!editBill || editPreview?.state !== 'ready') {
      toast.error(t(editPreview?.state === 'invalid' ? editPreview.message : 'Enter both readings'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/electricity/${editBill._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          previousReading: editPreview.previousReading,
          currentReading: editPreview.currentReading,
          manualAdjustment: Number(editForm.manualAdjustment) || 0,
          notes: editForm.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(t(data.error));
      toast.success(t('Bill corrected'));
      setEditBill(null);
      await loadSheet(month, year, true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (row: any) => {
    const bill = row.bill;
    const paidNote = bill.paidAmount > 0 ? ` ${t('{amount} has already been paid on it.', { amount: f.bdt(bill.paidAmount) })}` : '';
    if (!confirm(`${t('Archive the {unit} bill for {month}?', { unit: row.unit?.unitName, month: monthLabel(month, year) })}${paidNote} ${t('You can then enter the reading again.')}`)) {
      return;
    }
    const res = await fetch(`/api/electricity/${bill._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'archive' }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(t(data.error));
      return;
    }
    toast.success(t('Bill archived'));
    await loadSheet(month, year, true);
  };

  const openRateModal = () => {
    setRateForm({ rate: rate !== null ? String(rate) : '', applyToExisting: true });
    setShowRateModal(true);
  };

  const handleSetRate = async () => {
    const value = Number(rateForm.rate);
    if (rateForm.rate === '' || !Number.isFinite(value) || value < 0) {
      toast.error(t('Enter a valid rate'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/electricity/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          year,
          globalRatePerUnit: value,
          applyToExisting: repriceable.length > 0 && rateForm.applyToExisting,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(t(data.error));
      let msg = t('Rate set to {rate}/unit for {month}', { rate: f.bdt(value), month: monthLabel(month, year) });
      if (data.repriced) msg += `; ${t('re-priced {count} bill(s)', { count: data.repriced })}`;
      toast.success(msg);
      if (data.skipped) {
        toast.warning(t('{count} bill(s) kept their old rate: already paid more than the new amount', { count: data.skipped }));
      }
      setShowRateModal(false);
      await loadSheet(month, year, true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const rateCaption = !sheet.rate
    ? t('No rate set')
    : sheet.rate.source === 'set'
      ? t('Set for {month}', { month: monthLabel(month, year) })
      : sheet.rate.source === 'carried'
        ? t('Carried from {month}', { month: monthLabel(sheet.rate.month!, sheet.rate.year!) })
        : t('Default from Settings');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => changeMonth(Number(e.target.value), year)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {MONTHS.map((m) => <option key={m} value={m}>{f.month(m)}</option>)}
          </select>
          <select
            value={year}
            onChange={(e) => changeMonth(month, Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {YEARS.map((y) => <option key={y} value={y}>{f.digits(y)}</option>)}
          </select>
        </div>
        <div className="flex gap-2 items-center sm:ml-auto">
          <button
            onClick={openRateModal}
            className={cn(
              'flex items-center gap-2 border rounded-lg px-3 py-1.5 text-left hover:bg-slate-50',
              sheet.rate ? 'border-slate-300' : 'border-red-300 bg-red-50',
            )}
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>
              <span className="block text-sm font-medium text-slate-800">
                {sheet.rate ? t('{rate}/unit', { rate: f.bdt(sheet.rate.rate) }) : t('Set rate')}
              </span>
              <span className={cn('block text-[11px]', sheet.rate ? 'text-slate-400' : 'text-red-600')}>
                {rateCaption}
              </span>
            </span>
          </button>
          <Button
            leftIcon={<Zap className="w-4 h-4" />}
            onClick={handleCreateAll}
            loading={saving}
            disabled={readyRows.length === 0 || rate === null}
          >
            {readyRows.length ? t('Create {count} bill(s)', { count: readyRows.length }) : t('Create bills')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xl font-bold text-slate-800">{f.bdt(totalBilled)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t('Total Billed')}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xl font-bold text-green-600">{f.bdt(totalPaid)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t('Collected')}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xl font-bold text-red-500">{f.bdt(totalDue)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t('Outstanding')}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xl font-bold text-amber-600">{f.digits(pendingRows.length)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t('Readings Pending')}</p>
        </Card>
      </div>

      <Card>
        {sheet.rows.length === 0 ? (
          <EmptyState
            title={t('No metered units')}
            description={t('Units with an electricity sub-meter on an active lease appear here automatically')}
          />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>{t('Unit')}</Th>
                <Th>{t('Tenant')}</Th>
                <Th>{t('Previous')}</Th>
                <Th>{t('Current')}</Th>
                <Th>{t('Units used')}</Th>
                <Th>{t('Amount')}</Th>
                <Th>{t('Paid / Due')}</Th>
                <Th>{t('Status')}</Th>
                <Th>{t('Actions')}</Th>
              </tr>
            </TableHead>
            <TableBody>
              {sheet.rows.map((row) => {
                const bill = row.bill;
                const unitCell = (
                  <Td>
                    <p className="font-medium">{row.unit?.unitName}</p>
                    <p className="text-xs text-slate-400">{row.unit?.electricityMeterNumber || t('No meter no.')}</p>
                  </Td>
                );
                const tenantCell = (
                  <Td>
                    <p className="font-medium">{row.tenant?.name}</p>
                    <p className="text-xs text-slate-400">{row.tenant?.phone}</p>
                  </Td>
                );

                if (bill) {
                  return (
                    <TableRow key={row.key}>
                      {unitCell}
                      {tenantCell}
                      <Td className="text-slate-500">{f.num(bill.previousReading)}</Td>
                      <Td className="font-medium">{f.num(bill.currentReading)}</Td>
                      <Td>{f.num(bill.consumedUnits)}</Td>
                      <Td>
                        <p className="font-semibold">{f.bdt(bill.finalAmount)}</p>
                        {bill.manualAdjustment !== 0 && (
                          <p className="text-[11px] text-slate-400">
                            {t('adj')} {bill.manualAdjustment > 0 ? '+' : ''}{f.bdt(bill.manualAdjustment)}
                          </p>
                        )}
                      </Td>
                      <Td>
                        <p className="text-green-600">{f.bdt(bill.paidAmount)}</p>
                        <p className={bill.dueAmount > 0 ? 'text-red-500 text-xs font-medium' : 'text-slate-400 text-xs'}>
                          {t('{amount} due', { amount: f.bdt(bill.dueAmount) })}
                        </p>
                      </Td>
                      <Td><StatusBadge status={bill.status} /></Td>
                      <Td>
                        <div className="flex items-center gap-1">
                          {bill.dueAmount > 0 && (
                            <Button size="sm" variant="outline" onClick={() => openPay(bill)}>{t('Pay')}</Button>
                          )}
                          <button
                            onClick={() => openEdit(bill)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                            aria-label={t('Edit bill')}
                            title={t('Correct readings')}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleArchive(row)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                            aria-label={t('Archive bill')}
                            title={t('Archive bill')}
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </Td>
                    </TableRow>
                  );
                }

                const draft = drafts[row.key];
                const result = evaluate(draft, rate);
                const last = row.lastReading;
                const prevDiffers = last && draft?.previousReading !== '' && Number(draft?.previousReading) !== last.reading;
                return (
                  <TableRow key={row.key} className="bg-amber-50/30">
                    {unitCell}
                    {tenantCell}
                    <Td>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={draft?.previousReading ?? ''}
                        onChange={(e) => setDraft(row.key, 'previousReading', toNumberText(e.target))}
                        // Skip on Tab when pre-filled, so Tab jumps between current readings.
                        tabIndex={last ? -1 : undefined}
                        className={cn(cellInputCls, prevDiffers ? 'border-amber-400' : 'border-slate-300')}
                        aria-label={`${row.unit?.unitName} ${t('previous reading')}`}
                      />
                      <p className={cn('text-[11px] mt-0.5', prevDiffers ? 'text-amber-600' : 'text-slate-400')}>
                        {last
                          ? t('{month} ended at {reading}', { month: monthLabel(last.month, last.year), reading: f.num(last.reading) })
                          : t('First bill: enter it')}
                      </p>
                    </Td>
                    <Td>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={draft?.currentReading ?? ''}
                        onChange={(e) => setDraft(row.key, 'currentReading', toNumberText(e.target))}
                        className={cn(cellInputCls, result.state === 'invalid' ? 'border-red-400' : 'border-slate-300')}
                        aria-label={`${row.unit?.unitName} ${t('current reading')}`}
                      />
                      {result.state === 'invalid' && (
                        <p className="text-[11px] mt-0.5 text-red-600">{t(result.message)}</p>
                      )}
                    </Td>
                    <Td>{result.state === 'ready' ? f.num(result.calc.consumedUnits) : '—'}</Td>
                    <Td className="font-semibold text-indigo-700">
                      {result.state === 'ready' && rate !== null ? f.bdt(result.calc.finalAmount) : '—'}
                    </Td>
                    <Td className="text-slate-300">—</Td>
                    <Td>
                      <span className="text-xs text-amber-700">
                        {result.state === 'ready' ? t('Ready') : t('Not billed')}
                      </span>
                    </Td>
                    <Td>{null}</Td>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pay Modal */}
      <Modal isOpen={!!payBill} onClose={() => setPayBill(null)} title={t('Record Payment')} size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setPayBill(null)}>{t('Cancel')}</Button>
            <Button onClick={handlePay} loading={saving} variant="success">{t('Save')}</Button>
          </div>
        }
      >
        <div className="space-y-3">
          {payBill && (
            <div className="bg-slate-50 rounded p-3 text-xs space-y-0.5">
              <p><strong>{t('Bill Amount:')}</strong> {f.bdt(payBill.finalAmount)}</p>
              <p><strong>{t('Already Paid:')}</strong> {f.bdt(payBill.paidAmount)}</p>
              <p className="text-red-600"><strong>{t('Due:')}</strong> {f.bdt(payBill.dueAmount)}</p>
              {payBill.payments?.length > 0 && (
                <div className="pt-2 mt-2 border-t border-slate-200 space-y-0.5">
                  {payBill.payments.map((p: any, i: number) => (
                    <p key={i} className="text-slate-500">
                      {f.date(p.paidAt)}: {f.bdt(p.amount)} ({t(p.receivedBy === 'jony' ? 'Jony' : 'Jahid')})
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          <Input label={t('Amount Received Now (৳)')} type="number" leftAddon="৳"
            value={payForm.amount}
            onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
            hint={t("Added to what's already been paid")}
          />
          <Input label={t('Payment Date')} type="date"
            value={payForm.paymentDate}
            onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
          />
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editBill} onClose={() => setEditBill(null)} title={t('Correct Electricity Bill')} size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setEditBill(null)}>{t('Cancel')}</Button>
            <Button onClick={handleEdit} loading={saving}>{t('Save')}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('Previous Reading')} type="number" required
              value={editForm.previousReading}
              onChange={(e) => setEditForm({ ...editForm, previousReading: e.target.value })}
            />
            <Input label={t('Current Reading')} type="number" required
              value={editForm.currentReading}
              onChange={(e) => setEditForm({ ...editForm, currentReading: e.target.value })}
              error={editPreview?.state === 'invalid' ? t(editPreview.message) : undefined}
            />
          </div>
          <Input label={t('Manual Adjustment (৳)')} type="number"
            value={editForm.manualAdjustment}
            onChange={(e) => setEditForm({ ...editForm, manualAdjustment: e.target.value })}
            hint={t('Positive to add, negative to deduct')}
          />
          {editBill && editFinal && (
            <div className="bg-indigo-50 rounded-lg p-3 text-xs space-y-1">
              <p><span className="text-slate-600">{t('Units consumed:')}</span> <strong>{f.num(editFinal.consumedUnits)}</strong></p>
              <p><span className="text-slate-600">{t('Rate:')}</span> {t('{rate}/unit', { rate: f.bdt(editBill.globalRatePerUnit) })}</p>
              <p className="text-indigo-700 font-semibold">{t('Final Amount:')} {f.bdt(editFinal.finalAmount)}</p>
              {editBill.paidAmount > 0 && (
                <p className="text-slate-600">{t('Already paid:')} {f.bdt(editBill.paidAmount)}</p>
              )}
            </div>
          )}
          <Textarea label={t('Notes')} rows={2} value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
          />
        </div>
      </Modal>

      {/* Rate Modal */}
      <Modal isOpen={showRateModal} onClose={() => setShowRateModal(false)} title={t('Set Electricity Rate')} size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowRateModal(false)}>{t('Cancel')}</Button>
            <Button onClick={handleSetRate} loading={saving}>{t('Save Rate')}</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label={t('Rate for {month}', { month: f.monthYear(month, year) })}
            type="number"
            leftAddon="৳"
            value={rateForm.rate}
            onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })}
            hint={t('BDT per unit. Later months use this rate until you set a new one.')}
          />
          {repriceable.length > 0 && (
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={rateForm.applyToExisting}
                onChange={(e) => setRateForm({ ...rateForm, applyToExisting: e.target.checked })}
              />
              <span>
                {t('Also re-price {count} bill(s) for this month that are not fully paid', { count: repriceable.length })}
              </span>
            </label>
          )}
        </div>
      </Modal>
    </div>
  );
}
