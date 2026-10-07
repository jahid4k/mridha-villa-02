'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Archive, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { StatusBadge, CollectorBadge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, Th, Td, TableRow, EmptyState } from '@/components/ui/Table';
import { formatUnitType } from '@/lib/formatters';
import { useI18n } from '@/components/providers/LanguageProvider';

const unitTypeOptions = [
  { value: 'shop', label: 'Shop' },
  { value: 'room', label: 'Room' },
  { value: 'flat', label: 'Flat' },
  { value: 'garage', label: 'Garage' },
  { value: 'storage', label: 'Storage' },
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'other', label: 'Other' },
];

const collectorOptions = [
  { value: 'jahid', label: 'Jahid' },
  { value: 'jony', label: 'Jony' },
];

const statusOptions = [
  { value: 'vacant', label: 'Vacant' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Maintenance' },
];

function UnitForm({ defaultValues, onSubmit, loading }: {
  defaultValues?: any;
  onSubmit: (data: any) => void;
  loading: boolean;
}) {
  const { t } = useI18n();
  const tr = (opts: { value: string; label: string }[]) => opts.map((o) => ({ ...o, label: t(o.label) }));
  const [form, setForm] = useState({
    unitName: '', unitNumber: '', unitType: 'shop', assignedCollector: 'jahid',
    defaultMonthlyRent: 0, floorOrLocation: '', size: '', status: 'vacant',
    hasElectricitySubMeter: true, electricityMeterNumber: '', gasMonthlyCharge: 0, notes: '',
    ...defaultValues,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.unitName || !form.unitNumber) { toast.error(t('Name and number required')); return; }
    onSubmit({ ...form, defaultMonthlyRent: Number(form.defaultMonthlyRent), gasMonthlyCharge: Number(form.gasMonthlyCharge) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label={t('Unit Name')} required value={form.unitName} onChange={(e) => setForm({ ...form, unitName: e.target.value })} />
        <Input label={t('Unit Number')} required value={form.unitNumber} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label={t('Unit Type')} required options={tr(unitTypeOptions)} value={form.unitType} onChange={(e) => setForm({ ...form, unitType: e.target.value })} />
        <Select label={t('Owner (keeps the rent)')} required options={tr(collectorOptions)} value={form.assignedCollector} onChange={(e) => setForm({ ...form, assignedCollector: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label={t('Monthly Rent (৳)')} type="number" leftAddon="৳" value={form.defaultMonthlyRent} onChange={(e) => setForm({ ...form, defaultMonthlyRent: e.target.value })} />
        <Select label={t('Status')} options={tr(statusOptions)} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label={t('Floor / Location')} value={form.floorOrLocation} onChange={(e) => setForm({ ...form, floorOrLocation: e.target.value })} />
        <Input label={t('Size')} value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="hasMeter" checked={form.hasElectricitySubMeter}
          onChange={(e) => setForm({ ...form, hasElectricitySubMeter: e.target.checked })}
          className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
        <label htmlFor="hasMeter" className="text-sm text-slate-700">{t('Has electricity sub-meter')}</label>
      </div>
      {form.hasElectricitySubMeter && (
        <Input label={t('Meter Number')} value={form.electricityMeterNumber} onChange={(e) => setForm({ ...form, electricityMeterNumber: e.target.value })} />
      )}
      <Input label={t('Gas, fixed monthly charge (৳)')} type="number" leftAddon="৳" value={form.gasMonthlyCharge}
        onChange={(e) => setForm({ ...form, gasMonthlyCharge: e.target.value })}
        hint={t('Billed automatically every month to the tenant. Leave 0 if there is no gas.')} />
      <Textarea label={t('Notes')} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <Button type="submit" loading={loading} className="w-full">{t('Save Unit')}</Button>
    </form>
  );
}

export default function UnitsClient({ initialUnits }: { initialUnits: any[]; currentUser: string }) {
  const { t, f } = useI18n();
  const [units, setUnits] = useState(initialUnits);
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [archiveTarget, setArchiveTarget] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  const fetchUnits = async () => {
    const url = showArchived ? '/api/units?includeArchived=true' : '/api/units';
    const res = await fetch(url);
    if (res.ok) { const data = await res.json(); setUnits(data.units); }
  };

  useEffect(() => { fetchUnits(); }, [showArchived]);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      const method = editingUnit ? 'PUT' : 'POST';
      const url = editingUnit ? `/api/units/${editingUnit._id}` : '/api/units';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) throw new Error(t(result.error));
      toast.success(t(editingUnit ? 'Unit updated' : 'Unit created'));
      setShowModal(false); setEditingUnit(null);
      await fetchUnits();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setLoading(true);
    try {
      const action = archiveTarget.status === 'archived' ? 'restore' : 'archive';
      const res = await fetch(`/api/units/${archiveTarget._id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(t(result.error));
      toast.success(t(action === 'archive' ? 'Unit archived' : 'Unit restored'));
      setArchiveTarget(null); await fetchUnits();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? units : units.filter((u) => u.unitType === filter || u.assignedCollector === filter || u.status === filter);
  const summary = {
    total: units.filter(u => u.status !== 'archived').length,
    occupied: units.filter(u => u.status === 'occupied').length,
    vacant: units.filter(u => u.status === 'vacant').length,
    jahid: units.filter(u => u.assignedCollector === 'jahid' && u.status !== 'archived').length,
    jony: units.filter(u => u.assignedCollector === 'jony' && u.status !== 'archived').length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Units', value: summary.total, color: 'text-slate-800' },
          { label: 'Occupied', value: summary.occupied, color: 'text-blue-600' },
          { label: 'Vacant', value: summary.vacant, color: 'text-green-600' },
          { label: "Jahid's", value: summary.jahid, color: 'text-indigo-600' },
          { label: "Jony's", value: summary.jony, color: 'text-emerald-600' },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{f.digits(s.value)}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t(s.label)}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {['all', 'shop', 'room', 'flat', 'vacant', 'occupied', 'jahid', 'jony'].map((key) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === key ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {t(key.charAt(0).toUpperCase() + key.slice(1))}
            </button>
          ))}
        </div>
        <div className="sm:ml-auto flex gap-2">
          <button onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${showArchived ? 'bg-slate-800 text-white' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}>
            {t(showArchived ? 'Hide Archived' : 'Show Archived')}
          </button>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setEditingUnit(null); setShowModal(true); }}>{t('Add Unit')}</Button>
        </div>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title={t('No units found')} description={t('Add your first rentable unit')}
            action={<Button onClick={() => setShowModal(true)} leftIcon={<Plus className="w-4 h-4" />}>{t('Add Unit')}</Button>} />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>{t('Unit')}</Th><Th>{t('Type')}</Th><Th>{t('Owner')}</Th><Th>{t('Rent')}</Th><Th>{t('Status')}</Th><Th>{t('Meter')}</Th><Th className="text-right">{t('Actions')}</Th>
              </tr>
            </TableHead>
            <TableBody>
              {filtered.map((unit) => (
                <TableRow key={unit._id}>
                  <Td><p className="font-semibold text-slate-800">{unit.unitName}</p><p className="text-xs text-slate-400">{unit.unitNumber}</p></Td>
                  <Td>{t(formatUnitType(unit.unitType))}</Td>
                  <Td><CollectorBadge collector={unit.assignedCollector} /></Td>
                  <Td className="font-medium">{f.bdt(unit.defaultMonthlyRent)}</Td>
                  <Td><StatusBadge status={unit.status} /></Td>
                  <Td>{unit.hasElectricitySubMeter ? <span className="text-xs text-green-600">✓ {unit.electricityMeterNumber || t('Yes')}</span> : <span className="text-xs text-slate-400">{t('No')}</span>}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      {unit.status !== 'archived' && (
                        <button onClick={() => { setEditingUnit(unit); setShowModal(true); }} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Pencil className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={() => setArchiveTarget(unit)}
                        className={`p-1.5 rounded text-slate-500 ${unit.status === 'archived' ? 'hover:bg-green-50 hover:text-green-600' : 'hover:bg-red-50 hover:text-red-600'}`}>
                        {unit.status === 'archived' ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingUnit(null); }} title={editingUnit ? t('Edit {name}', { name: editingUnit.unitName }) : t('Add New Unit')} size="lg">
        <UnitForm defaultValues={editingUnit} onSubmit={handleSubmit} loading={loading} />
      </Modal>

      <ConfirmDialog isOpen={!!archiveTarget} onClose={() => setArchiveTarget(null)} onConfirm={handleArchive}
        title={t(archiveTarget?.status === 'archived' ? 'Restore Unit' : 'Archive Unit')}
        message={t(archiveTarget?.status === 'archived' ? 'Restore "{name}"?' : 'Archive "{name}"?', { name: archiveTarget?.unitName })}
        confirmLabel={t(archiveTarget?.status === 'archived' ? 'Restore' : 'Archive')}
        confirmVariant={archiveTarget?.status === 'archived' ? 'primary' : 'danger'}
        loading={loading} />
    </div>
  );
}
