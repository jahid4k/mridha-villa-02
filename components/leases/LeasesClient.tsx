'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Pencil, StopCircle, FileSignature } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { StatusBadge, CollectorBadge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, Th, Td, TableRow, EmptyState } from '@/components/ui/Table';
import { useI18n } from '@/components/providers/LanguageProvider';

// ─── Lease Form (editing; new leases start from New agreement) ────────────────
function LeaseForm({
  defaultValues,
  tenants,
  units,
  onSubmit,
  loading,
}: {
  defaultValues: any;
  tenants: any[];
  units: any[];
  onSubmit: (data: any) => void;
  loading: boolean;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    tenantId: '',
    monthlyRentAmount: 0,
    collector: 'jahid',
    startDate: '',
    rentDueDay: 7, // deed clause ৩.২: due by the 7th
    securityDepositAmount: 0,
    advanceBalance: 0,
    advanceMode: 'final',
    advancePerMonth: 0,
    leaseName: '',
    notes: '',
    ...defaultValues,
    unitIds: (defaultValues?.unitIds || []) as string[],
    endDate: defaultValues?.endDate ? String(defaultValues.endDate).slice(0, 10) : '',
  });
  const initialUnitIds: string[] = defaultValues?.unitIds || [];

  const toggleUnit = (id: string) => {
    const updated = form.unitIds.includes(id)
      ? form.unitIds.filter((x: string) => x !== id)
      : [...form.unitIds, id];
    // A tenancy is always one brother's units, so the owner follows the units.
    const owner = units.find((u) => u._id === updated[0])?.assignedCollector;
    setForm({ ...form, unitIds: updated, ...(owner ? { collector: owner } : {}) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tenantId) { toast.error(t('Select a tenant')); return; }
    if (form.unitIds.length === 0) { toast.error(t('Select at least one unit')); return; }
    if (!form.monthlyRentAmount) { toast.error(t('Enter rent amount')); return; }
    if (!form.startDate) { toast.error(t('Enter start date')); return; }
    if (form.advanceMode === 'monthly' && Number(form.advanceBalance) > 0 && !(Number(form.advancePerMonth) > 0)) {
      toast.error(t('Enter how much advance to deduct each month'));
      return;
    }
    onSubmit({
      ...form,
      monthlyRentAmount: Number(form.monthlyRentAmount),
      rentDueDay: Number(form.rentDueDay),
      securityDepositAmount: Number(form.securityDepositAmount),
      advanceBalance: Number(form.advanceBalance),
      advancePerMonth: form.advanceMode === 'monthly' ? Number(form.advancePerMonth) : 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label={t('Tenant')}
        required
        options={tenants.map((t) => ({ value: t._id, label: `${t.name} — ${t.phone}` }))}
        placeholder={t('Select tenant')}
        value={form.tenantId}
        onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {t('Units')} <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
          {units.map((unit) => {
            // Occupied by someone else: can't be picked (units already on this lease stay pickable).
            const taken = unit.status === 'occupied' && !initialUnitIds.includes(unit._id);
            return (
              <label
                key={unit._id}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  taken
                    ? 'opacity-50 cursor-not-allowed border border-transparent'
                    : form.unitIds.includes(unit._id)
                      ? 'bg-indigo-50 border border-indigo-200 cursor-pointer'
                      : 'hover:bg-slate-50 border border-transparent cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.unitIds.includes(unit._id)}
                  onChange={() => toggleUnit(unit._id)}
                  disabled={taken}
                  className="w-3.5 h-3.5 rounded"
                />
                <div>
                  <p className="text-xs font-medium">{unit.unitName}</p>
                  <p className="text-xs text-slate-400">{taken ? t('Occupied') : t(unit.unitType.charAt(0).toUpperCase() + unit.unitType.slice(1))}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('Monthly Rent (৳)')}
          type="number"
          required
          leftAddon="৳"
          value={form.monthlyRentAmount}
          onChange={(e) => setForm({ ...form, monthlyRentAmount: e.target.value })}
        />
        <Select
          label={t('Owner (keeps the rent)')}
          required
          options={[
            { value: 'jahid', label: t('Jahid') },
            { value: 'jony', label: t('Jony') },
          ]}
          value={form.collector}
          onChange={(e) => setForm({ ...form, collector: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('Start Date')}
          type="date"
          required
          hint={t('Rent is charged for the whole start month')}
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
        />
        <Input
          label={t('End Date')}
          type="date"
          hint={t('Leave empty for open-ended')}
          value={form.endDate}
          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input
          label={t('Security (৳)')}
          type="number"
          leftAddon="৳"
          value={form.securityDepositAmount}
          onChange={(e) => setForm({ ...form, securityDepositAmount: e.target.value })}
        />
        <Input
          label={t('Advance (৳)')}
          type="number"
          leftAddon="৳"
          value={form.advanceBalance}
          onChange={(e) => setForm({ ...form, advanceBalance: e.target.value })}
        />
        <Input
          label={t('Due Day')}
          type="number"
          hint={t('Late after this day')}
          value={form.rentDueDay}
          onChange={(e) => setForm({ ...form, rentDueDay: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label={t('How the advance is used')}
          options={[
            { value: 'final', label: t('Keep until move-out') },
            { value: 'monthly', label: t('Deduct from rent every month') },
          ]}
          value={form.advanceMode}
          onChange={(e) => setForm({ ...form, advanceMode: e.target.value })}
        />
        {form.advanceMode === 'monthly' && (
          <Input
            label={t('Deduct per month (৳)')}
            type="number"
            leftAddon="৳"
            value={form.advancePerMonth}
            onChange={(e) => setForm({ ...form, advancePerMonth: e.target.value })}
            hint={t("Taken off each month's rent until the advance runs out")}
          />
        )}
      </div>

      <Textarea
        label={t('Notes')}
        rows={2}
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
      />

      <Button type="submit" loading={loading} className="w-full">
        {t('Update Lease')}
      </Button>
    </form>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LeasesClient({
  initialLeases,
  tenants,
  units,
}: {
  initialLeases: any[];
  tenants: any[];
  units: any[];
}) {
  const { t, f } = useI18n();
  const [leases, setLeases] = useState(initialLeases);
  const [editingLease, setEditingLease] = useState<any>(null);
  const [endTarget, setEndTarget] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('active');

  const fetchLeases = async () => {
    const res = await fetch(filter === 'all' ? '/api/leases' : `/api/leases?status=${filter}`);
    if (res.ok) {
      const data = await res.json();
      setLeases(data.leases);
    }
  };

  const handleFilterChange = (next: string) => {
    setFilter(next);
    setTimeout(async () => {
      // "all" means no status filter
      const res = await fetch(next === 'all' ? '/api/leases' : `/api/leases?status=${next}`);
      if (res.ok) {
        const data = await res.json();
        setLeases(data.leases);
      }
    }, 0);
  };

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leases/${editingLease._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(t(result.error));
      toast.success(t('Lease updated'));
      setEditingLease(null);
      await fetchLeases();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEndLease = async () => {
    if (!endTarget) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leases/${endTarget._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(t(result.error));
      toast.success(t('Lease ended'));
      setEndTarget(null);
      await fetchLeases();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters + New Lease */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {['active', 'ended', 'all'].map((key) => (
            <button
              key={key}
              onClick={() => handleFilterChange(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                filter === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t(key.charAt(0).toUpperCase() + key.slice(1))}
            </button>
          ))}
        </div>
        <Link href="/deeds/new" className="sm:ml-auto">
          <Button leftIcon={<Plus className="w-4 h-4" />} className="w-full">
            {t('New agreement')}
          </Button>
        </Link>
      </div>

      {/* Leases Table */}
      <Card>
        {leases.length === 0 ? (
          <EmptyState
            title={t('No leases found')}
            description={t('Create a lease to start tracking rent')}
            action={
              <Link href="/deeds/new">
                <Button leftIcon={<Plus className="w-4 h-4" />}>{t('New agreement')}</Button>
              </Link>
            }
          />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>{t('Tenant')}</Th>
                <Th>{t('Units')}</Th>
                <Th>{t('Rent')}</Th>
                <Th>{t('Owner')}</Th>
                <Th>{t('Advance')}</Th>
                <Th>{t('Start')}</Th>
                <Th>{t('Status')}</Th>
                <Th className="text-right">{t('Actions')}</Th>
              </tr>
            </TableHead>
            <TableBody>
              {leases.map((lease) => (
                <TableRow key={lease._id}>
                  <Td>
                    <p className="font-medium text-sm">{lease.tenantId?.name}</p>
                    <p className="text-xs text-slate-400">{lease.tenantId?.phone}</p>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {lease.unitIds?.map((u: any) => (
                        <span key={u._id} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {u.unitName}
                        </span>
                      ))}
                    </div>
                  </Td>
                  <Td className="font-semibold">{f.bdt(lease.monthlyRentAmount)}</Td>
                  <Td><CollectorBadge collector={lease.collector} /></Td>
                  <Td>
                    {lease.advanceBalance > 0 ? (
                      <span className="text-blue-600 font-medium text-sm">{f.bdt(lease.advanceBalance)}</span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </Td>
                  <Td className="text-sm">{f.date(lease.startDate)}</Td>
                  <Td><StatusBadge status={lease.status} /></Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/deeds/${lease._id}`}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                        title={t('Print deed')}
                      >
                        <FileSignature className="w-3.5 h-3.5" />
                      </Link>

                      {lease.status === 'active' && (
                        <>
                          <button
                            onClick={() => setEditingLease(lease)}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                            title={t('Edit lease')}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEndTarget(lease)}
                            className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600"
                            title={t('End lease')}
                          >
                            <StopCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingLease}
        onClose={() => setEditingLease(null)}
        title={t('Edit Lease')}
        size="xl"
      >
        {editingLease && (
          <LeaseForm
            key={editingLease._id}
            defaultValues={{
              ...editingLease,
              tenantId: editingLease.tenantId?._id,
              unitIds: editingLease.unitIds?.map((u: any) => u._id),
              startDate: editingLease.startDate?.split('T')[0],
            }}
            tenants={tenants}
            units={units}
            onSubmit={handleSubmit}
            loading={loading}
          />
        )}
      </Modal>

      {/* End Lease Confirm */}
      <ConfirmDialog
        isOpen={!!endTarget}
        onClose={() => setEndTarget(null)}
        onConfirm={handleEndLease}
        title={t('End Lease')}
        message={t('End lease for "{name}"? All units will be marked vacant.', { name: endTarget?.tenantId?.name })}
        confirmLabel={t('End Lease')}
        confirmVariant="danger"
        loading={loading}
      />
    </div>
  );
}
