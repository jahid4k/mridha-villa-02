'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Wallet, ChevronDown, ChevronUp, Printer, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { StatusBadge, CollectorBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Table';
import { todayInDhaka } from '@/lib/formatters';
import { useI18n } from '@/components/providers/LanguageProvider';
import { isRentLate } from '@/lib/calculations';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

const METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
];

const KIND_LABEL: Record<string, string> = { rent: 'Rent', electricity: 'Electricity', gas: 'Gas' };
const round2 = (n: number) => Math.round(n * 100) / 100;

interface CollectTarget {
  tenantId: string;
  name: string;
  /** Pre-tick only this charge (e.g. "Collect" pressed on one month's record). */
  preselect?: { kind: string; id: string };
}

interface ReceiptInfo {
  paymentId: string;
  receiptNumber: string;
  name: string;
  amount: number;
  allocations: any[];
  creditAdded: number;
}

export default function RentClient({
  initialRecords,
  initialAccounts,
  defaultMonth,
  defaultYear,
  currentUser,
}: {
  initialRecords: any[];
  initialAccounts: any[];
  defaultMonth: number;
  defaultYear: number;
  currentUser: string;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [showPaidUp, setShowPaidUp] = useState(false);
  const [collectFor, setCollectFor] = useState<CollectTarget | null>(null);
  const [receipt, setReceipt] = useState<ReceiptInfo | null>(null);
  const { t, f } = useI18n();

  const today = todayInDhaka();

  const fetchRecords = async (m = month, y = year) => {
    const res = await fetch(`/api/rent?month=${m}&year=${y}`);
    if (res.ok) setRecords((await res.json()).records);
  };

  const fetchAccounts = async () => {
    const res = await fetch('/api/accounts');
    if (res.ok) setAccounts((await res.json()).accounts);
  };

  const handleMonthYearChange = (m: number, y: number) => {
    setMonth(m);
    setYear(y);
    fetchRecords(m, y);
  };

  const handleCollected = async (info: ReceiptInfo) => {
    setCollectFor(null);
    setReceipt(info);
    await Promise.all([fetchAccounts(), fetchRecords()]);
  };

  const owing = accounts.filter((a) => a.due > 0);
  const paidUp = accounts.filter((a) => a.due <= 0);
  const totalOwed = owing.reduce((s, a) => s + a.due, 0);
  const totalLate = owing.reduce((s, a) => s + a.lateDue, 0);

  const totalExpected = records.reduce((s, r) => s + r.totalPayable, 0);
  const totalCollected = records.reduce((s, r) => s + r.collectedAmount, 0);
  const totalDue = records.reduce((s, r) => s + r.dueAmount, 0);

  const accountRow = (a: any) => (
    <div key={a.tenantId} className="flex items-center gap-3 p-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-slate-800">{a.name}</p>
          {a.collectors.map((c: string) => <CollectorBadge key={c} collector={c} />)}
          {!a.hasActiveLease && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{t('Moved out')}</span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate">
          {a.units.join(', ') || '—'}{a.phone ? ` · ${a.phone}` : ''}
        </p>
      </div>
      <div className="text-right">
        {a.due > 0 ? (
          <>
            <p className="text-sm font-bold text-red-600">{f.bdt(a.due)}</p>
            {a.lateDue > 0 && <p className="text-[11px] text-red-500">{t('{amount} late', { amount: f.bdt(a.lateDue) })}</p>}
          </>
        ) : (
          <p className="text-sm font-medium text-green-600">{t('Paid up')}</p>
        )}
        {a.credit > 0 && <p className="text-[11px] text-blue-600">{t('Credit {amount}', { amount: f.bdt(a.credit) })}</p>}
      </div>
      <Button
        size="sm"
        variant={a.due > 0 ? 'primary' : 'outline'}
        leftIcon={<Wallet className="w-3.5 h-3.5" />}
        onClick={() => setCollectFor({ tenantId: a.tenantId, name: a.name })}
      >
        {t('Collect')}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Who owes: across all months, rent + electricity + gas */}
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{t('Who owes')}</h2>
            <p className="text-xs text-slate-500">{t('All months, including electricity and gas')}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-red-600">{f.bdt(totalOwed)}</p>
            {totalLate > 0 && <p className="text-xs text-red-500">{t('{amount} late', { amount: f.bdt(totalLate) })}</p>}
          </div>
        </div>
        <Card>
          {accounts.length === 0 ? (
            <EmptyState title={t('No tenants yet')} description={t('Tenants with an active lease appear here automatically')} />
          ) : (
            <div className="divide-y divide-slate-100">
              {owing.length === 0 && (
                <p className="p-4 text-sm text-green-700">{t('Everyone is paid up.')}</p>
              )}
              {owing.map(accountRow)}
              {paidUp.length > 0 && (
                <>
                  <button
                    onClick={() => setShowPaidUp(!showPaidUp)}
                    className="w-full px-4 py-2.5 text-xs text-slate-500 hover:bg-slate-50 flex items-center gap-1"
                  >
                    {showPaidUp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {t('Paid up ({count})', { count: paidUp.length })}
                  </button>
                  {showPaidUp && paidUp.map(accountRow)}
                </>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* One month's rent records */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <h2 className="text-lg font-semibold text-slate-800">{t('Rent by month')}</h2>
          <div className="flex gap-2 sm:ml-auto">
            <select
              value={month}
              onChange={(e) => handleMonthYearChange(Number(e.target.value), year)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {MONTHS.map((m) => <option key={m} value={m}>{f.month(m)}</option>)}
            </select>
            <select
              value={year}
              onChange={(e) => handleMonthYearChange(month, Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {YEARS.map((y) => <option key={y} value={y}>{f.digits(y)}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <p className="text-xl font-bold text-slate-800">{f.bdt(totalExpected)}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t('Expected')}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xl font-bold text-green-600">{f.bdt(totalCollected)}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t('Collected')}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xl font-bold text-red-500">{f.bdt(totalDue)}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t('Due')}</p>
          </Card>
        </div>

        <Card>
          {records.length === 0 ? (
            <EmptyState
              title={t('No rent for {month}', { month: f.monthYear(month, year) })}
              description={t('Rent is added automatically on the 1st of each month for every active lease')}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {records.map((record) => {
                const late = record.dueAmount > 0 &&
                  isRentLate(record.month, record.year, record.leaseId?.rentDueDay, today);
                return (
                  <div key={record._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-slate-800">{record.tenantId?.name}</p>
                          {late
                            ? <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">{t('Late')}</span>
                            : <StatusBadge status={record.status} />}
                          <CollectorBadge collector={record.collector} />
                        </div>
                        <p className="text-xs text-slate-500">
                          {record.unitIds?.map((u: any) => u.unitName).join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800">{f.bdt(record.totalPayable)}</p>
                        {record.dueAmount > 0 && (
                          <p className="text-xs text-red-500">{t('Due: {amount}', { amount: f.bdt(record.dueAmount) })}</p>
                        )}
                        {record.collectedAmount > 0 && (
                          <p className="text-xs text-green-600">{t('Paid: {amount}', { amount: f.bdt(record.collectedAmount) })}</p>
                        )}
                      </div>
                    </div>

                    {expandedRecord === record._id && (
                      <div className="mt-3 bg-slate-50 rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-slate-500">{t('Rent:')}</span> <span className="font-medium">{f.bdt(record.baseRent)}</span></div>
                        <div><span className="text-slate-500">{t('Extra:')}</span> <span className="font-medium">{f.bdt(record.extraCharges)}</span></div>
                        <div><span className="text-slate-500">{t('Discount:')}</span> <span className="font-medium text-green-600">-{f.bdt(record.discount)}</span></div>
                        <div>
                          <span className="text-slate-500">{t('Advance / credit used:')}</span>{' '}
                          <span className="font-medium text-blue-600">-{f.bdt(record.advanceAdjustment)}</span>
                        </div>
                        <div><span className="text-slate-500">{t('Total Payable:')}</span> <span className="font-bold">{f.bdt(record.totalPayable)}</span></div>
                        {record.previousDue > 0 && (
                          <div><span className="text-slate-500">{t('Prev Due (old record):')}</span> <span className="font-medium text-orange-600">{f.bdt(record.previousDue)}</span></div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => setExpandedRecord(expandedRecord === record._id ? null : record._id)}
                        className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                      >
                        {expandedRecord === record._id
                          ? <><ChevronUp className="w-3 h-3" />{t('Hide details')}</>
                          : <><ChevronDown className="w-3 h-3" />{t('Show details')}</>}
                      </button>
                      {record.dueAmount > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Wallet className="w-3 h-3" />}
                          onClick={() => setCollectFor({
                            tenantId: record.tenantId?._id,
                            name: record.tenantId?.name,
                            preselect: { kind: 'rent', id: record._id },
                          })}
                        >
                          {t('Collect')}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {collectFor && (
        <CollectModal
          key={`${collectFor.tenantId}:${collectFor.preselect?.id ?? 'all'}`}
          target={collectFor}
          currentUser={currentUser}
          onClose={() => setCollectFor(null)}
          onDone={handleCollected}
        />
      )}

      <Modal
        isOpen={!!receipt}
        onClose={() => setReceipt(null)}
        title={t('Payment saved')}
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            {receipt && (
              <a href={`/receipts/${receipt.paymentId}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" leftIcon={<Printer className="w-4 h-4" />}>{t('Print receipt')}</Button>
              </a>
            )}
            <Button onClick={() => setReceipt(null)}>{t('Done')}</Button>
          </div>
        }
      >
        {receipt && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <span>{t('{amount} from {name}', { amount: f.bdt(receipt.amount), name: receipt.name })}</span>
            </div>
            <p className="text-xs text-slate-500">{t('Receipt no.')} <strong className="text-slate-700">{receipt.receiptNumber}</strong></p>
            <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-xs">
              {receipt.allocations.map((a: any) => (
                <div key={`${a.kind}:${a.id}`} className="flex justify-between">
                  <span>{t(KIND_LABEL[a.kind])} {f.shortMonthYear(a.month, a.year)}</span>
                  <span className="font-medium">{f.bdt(a.amount)}</span>
                </div>
              ))}
              {receipt.creditAdded > 0 && (
                <div className="flex justify-between text-blue-700">
                  <span>{t('Kept as credit for next months')}</span>
                  <span className="font-medium">{f.bdt(receipt.creditAdded)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CollectModal({
  target,
  currentUser,
  onClose,
  onDone,
}: {
  target: CollectTarget;
  currentUser: string;
  onClose: () => void;
  onDone: (info: ReceiptInfo) => void;
}) {
  const [charges, setCharges] = useState<any[] | null>(null);
  const [credit, setCredit] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [form, setForm] = useState({
    paymentDate: todayInDhaka(),
    paymentMethod: 'cash',
    receivedBy: currentUser === 'jony' ? 'jony' : 'jahid',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const { t, f } = useI18n();

  const keyOf = (c: { kind: string; id: string }) => `${c.kind}:${c.id}`;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/accounts/${target.tenantId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const list: any[] = data.charges ?? [];
        const pre = target.preselect;
        const initial = pre && list.some((c) => c.kind === pre.kind && c.id === pre.id)
          ? new Set([keyOf(pre)])
          : new Set(list.map(keyOf));
        setCharges(list);
        setCredit(data.credit ?? 0);
        setSelected(initial);
        setAmount(String(round2(list.filter((c) => initial.has(keyOf(c))).reduce((s, c) => s + c.due, 0))));
      })
      .catch(() => !cancelled && toast.error(t('Could not load what this tenant owes')));
    return () => { cancelled = true; };
  }, [target, t]);

  const selectedCharges = (charges ?? []).filter((c) => selected.has(keyOf(c)));
  const selectedDue = round2(selectedCharges.reduce((s, c) => s + c.due, 0));

  const changeSelection = (next: Set<string>) => {
    setSelected(next);
    // Keep the amount in step with the ticked charges until the user types their own.
    if (!amountTouched) {
      const due = (charges ?? []).filter((c) => next.has(keyOf(c))).reduce((s, c) => s + c.due, 0);
      setAmount(String(round2(due)));
    }
  };

  const toggle = (c: any) => {
    const next = new Set(selected);
    if (next.has(keyOf(c))) next.delete(keyOf(c));
    else next.add(keyOf(c));
    changeSelection(next);
  };

  const selectKind = (kind: string | null) =>
    changeSelection(new Set((charges ?? []).filter((c) => !kind || c.kind === kind).map(keyOf)));

  // Preview: money goes to the ticked charges oldest first; the rest becomes credit.
  const value = Number(amount) || 0;
  const preview = selectedCharges.reduce<{ items: any[]; left: number }>(
    (acc, c) => {
      const pay = round2(Math.min(acc.left, c.due));
      return { items: [...acc.items, { ...c, pay }], left: round2(acc.left - pay) };
    },
    { items: [], left: value },
  );
  const extra = Math.max(0, preview.left);

  const handleSave = async () => {
    if (!(value > 0)) { toast.error(t('Enter the amount received')); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: target.tenantId,
          amount: value,
          ...form,
          targets: selectedCharges.map((c) => ({ kind: c.kind, id: c.id })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(t(data.error));
      onDone({
        paymentId: data.paymentId,
        receiptNumber: data.receiptNumber,
        name: target.name,
        amount: value,
        allocations: data.allocations,
        creditAdded: data.creditAdded,
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const kinds = [...new Set((charges ?? []).map((c) => c.kind))];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('Collect from {name}', { name: target.name })}
      size="md"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>{t('Cancel')}</Button>
          <Button onClick={handleSave} loading={saving} variant="success" disabled={charges === null}>
            {t('Save')} {value > 0 ? f.bdt(value) : ''}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {charges === null ? (
          <p className="text-sm text-slate-500">{t('Loading…')}</p>
        ) : charges.length === 0 ? (
          <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
            {t('Nothing is owed. Money received now is kept as credit and used for the next months automatically.')}
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-1 flex-wrap text-xs">
              <span className="text-slate-500 mr-1">{t('Pay for:')}</span>
              <button onClick={() => selectKind(null)} className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-50">{t('All')}</button>
              {kinds.map((k) => (
                <button key={k} onClick={() => selectKind(k)} className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-50">
                  {t('{kind} only', { kind: t(KIND_LABEL[k]) })}
                </button>
              ))}
            </div>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {selectedCharges.length === 0 && (
                <p className="p-3 text-xs text-slate-500">{t('Nothing ticked: the whole amount is kept as credit.')}</p>
              )}
              {charges.map((c) => {
                const p = preview.items.find((x) => keyOf(x) === keyOf(c));
                return (
                  <label key={keyOf(c)} className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selected.has(keyOf(c))}
                      onChange={() => toggle(c)}
                      className="w-4 h-4 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {t(KIND_LABEL[c.kind])} {f.shortMonthYear(c.month, c.year)}
                        {c.late && <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">{t('Late')}</span>}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {c.units}{c.paid > 0 ? ` · ${t('{paid} of {total} paid', { paid: f.bdt(c.paid), total: f.bdt(c.total) })}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">{f.bdt(c.due)}</p>
                      {p && p.pay > 0 && p.pay < c.due && (
                        <p className="text-[11px] text-amber-600">{t('pays {amount}', { amount: f.bdt(p.pay) })}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 text-right">
              {t('Ticked:')} <strong className="text-slate-700">{f.bdt(selectedDue)}</strong>
              {credit > 0 && <> · {t('Credit held:')} <strong className="text-blue-600">{f.bdt(credit)}</strong></>}
            </p>
          </div>
        )}

        <Input
          label={t('Amount Received (৳)')}
          type="number"
          required
          leftAddon="৳"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setAmountTouched(true); }}
          hint={extra > 0
            ? t('{amount} more than ticked: kept as credit for next months', { amount: f.bdt(extra) })
            : value > 0 && value < selectedDue
              ? t('Pays the oldest ticked first; {amount} stays due', { amount: f.bdt(round2(selectedDue - value)) })
              : undefined}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('Date')}
            type="date"
            value={form.paymentDate}
            onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
          />
          <Select
            label={t('Method')}
            options={METHOD_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
            value={form.paymentMethod}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
          />
        </div>
        <Select
          label={t('Received By')}
          options={[{ value: 'jahid', label: t('Jahid') }, { value: 'jony', label: t('Jony') }]}
          value={form.receivedBy}
          onChange={(e) => setForm({ ...form, receivedBy: e.target.value })}
        />
        <Textarea
          label={t('Notes')}
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <p className="text-[11px] text-slate-400">{t('A receipt number is given automatically.')}</p>
      </div>
    </Modal>
  );
}
