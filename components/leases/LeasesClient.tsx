'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, StopCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { StatusBadge, CollectorBadge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, Th, Td, TableRow, EmptyState } from '@/components/ui/Table';
import { formatBDT, formatDate } from '@/lib/formatters';

function LeaseForm({ defaultValues, tenants, units, onSubmit, loading }: {
  defaultValues?: any; tenants: any[]; units: any[]; onSubmit: (data: any) => void; loading: boolean;
}) {
  const [form, setForm] = useState({
    tenantId: '', monthlyRentAmount: 0, collector: 'jahid',
    startDate: '', endDate: '', rentDueDay: 5, securityDepositAmount: 0, advanceBalance: 0,
    leaseName: '', notes: '',
    ...defaultValues,
    unitIds: (defaultValues?.unitIds || []) as string[],
  });

  const toggleUnit = (id: string) => {
    const updated = form.unitIds.includes(id) ? form.unitIds.filter((x: string) => x !== id) : [...form.unitIds, id];
    setForm({ ...form, unitIds: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tenantId) { toast.error('Select a tenant'); return; }
    if (form.unitIds.length === 0) { toast.error('Select at least one unit'); return; }
    if (!form.monthlyRentAmount) { toast.error('Enter rent amount'); return; }
    if (!form.startDate) { toast.error('Enter start date'); return; }
    onSubmit({ ...form, monthlyRentAmount: Number(form.monthlyRentAmount), rentDueDay: Number(form.rentDueDay), securityDepositAmount: Number(form.securityDepositAmount), advanceBalance: Number(form.advanceBalance) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select label="Tenant" required options={tenants.map((t) => ({ value: t._id, label: `${t.name} — ${t.phone}` }))} placeholder="Select tenant"
        value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })} />
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Units <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
          {units.map((unit) => (
            <label key={unit._id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${form.unitIds.includes(unit._id) ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent'}`}>
              <input type="checkbox" checked={form.unitIds.includes(unit._id)} onChange={() => toggleUnit(unit._id)} className="w-3.5 h-3.5 rounded" />
              <div><p className="text-xs font-medium">{unit.unitName}</p><p className="text-xs text-slate-400 capitalize">{unit.unitType}</p></div>
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Monthly Rent (৳)" type="number" required leftAddon="৳" value={form.monthlyRentAmount} onChange={(e) => setForm({ ...form, monthlyRentAmount: e.target.value })} />
        <Select label="Collector" required options={[{ value: 'jahid', label: 'Jahid' }, { value: 'jony', label: 'Jony' }]} value={form.collector} onChange={(e) => setForm({ ...form, collector: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Start Date" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <Input label="End Date" type="date" hint="Leave empty for open-ended" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input label="Security (৳)" type="number" leftAddon="৳" value={form.securityDepositAmount} onChange={(e) => setForm({ ...form, securityDepositAmount: e.target.value })} />
        <Input label="Advance (৳)" type="number" leftAddon="৳" value={form.advanceBalance} onChange={(e) => setForm({ ...form, advanceBalance: e.target.value })} />
        <Input label="Due Day" type="number" value={form.rentDueDay} onChange={(e) => setForm({ ...form, rentDueDay: e.target.value })} />
      </div>
      <Textarea label="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <Button type="submit" loading={loading} className="w-full">Save Lease</Button>
    </form>
  );
}

export default function LeasesClient({ initialLeases, tenants, units, currentUser }: {
  initialLeases: any[]; tenants: any[]; units: any[]; currentUser: string;
}) {
  const [leases, setLeases] = useState(initialLeases);
  const [showModal, setShowModal] = useState(false);
  const [editingLease, setEditingLease] = useState<any>(null);
  const [endTarget, setEndTarget] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('active');

  const fetchLeases = async () => {
    const res = await fetch(`/api/leases?status=${filter}`);
    if (res.ok) { const data = await res.json(); setLeases(data.leases); }
  };

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      const method = editingLease ? 'PUT' : 'POST';
      const url = editingLease ? `/api/leases/${editingLease._id}` : '/api/leases';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      if (result.conflictWarning) toast.warning(result.conflictWarning);
      toast.success(editingLease ? 'Lease updated' : 'Lease created');
      setShowModal(false); setEditingLease(null); await fetchLeases();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const handleEndLease = async () => {
    if (!endTarget) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leases/${endTarget._id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'end' }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success('Lease ended'); setEndTarget(null); await fetchLeases();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {['active', 'ended', 'all'].map((f) => (
            <button key={f} onClick={() => { setFilter(f); setTimeout(fetchLeases, 0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {f}
            </button>
          ))}
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setEditingLease(null); setShowModal(true); }} className="sm:ml-auto">New Lease</Button>
      </div>

      <Card>
        {leases.length === 0 ? (
          <EmptyState title="No leases found" description="Create a lease to start tracking rent"
            action={<Button onClick={() => setShowModal(true)} leftIcon={<Plus className="w-4 h-4" />}>New Lease</Button>} />
        ) : (
          <Table>
            <TableHead>
              <tr><Th>Tenant</Th><Th>Units</Th><Th>Rent</Th><Th>Collector</Th><Th>Advance</Th><Th>Start</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr>
            </TableHead>
            <TableBody>
              {leases.map((lease) => (
                <TableRow key={lease._id}>
                  <Td><p className="font-medium">{lease.tenantId?.name}</p><p className="text-xs text-slate-400">{lease.tenantId?.phone}</p></Td>
                  <Td><div className="flex flex-wrap gap-1">{lease.unitIds?.map((u: any) => <span key={u._id} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{u.unitName}</span>)}</div></Td>
                  <Td className="font-semibold">{formatBDT(lease.monthlyRentAmount)}</Td>
                  <Td><CollectorBadge collector={lease.collector} /></Td>
                  <Td>{lease.advanceBalance > 0 ? <span className="text-blue-600 font-medium text-sm">{formatBDT(lease.advanceBalance)}</span> : <span className="text-slate-400 text-xs">—</span>}</Td>
                  <Td className="text-sm">{formatDate(lease.startDate)}</Td>
                  <Td><StatusBadge status={lease.status} /></Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      {lease.status === 'active' && (
                        <>
                          <button onClick={() => { setEditingLease(lease); setShowModal(true); }} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEndTarget(lease)} className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600"><StopCircle className="w-3.5 h-3.5" /></button>
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

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingLease(null); }} title={editingLease ? 'Edit Lease' : 'New Lease'} size="xl">
        <LeaseForm
          defaultValues={editingLease ? { ...editingLease, tenantId: editingLease.tenantId?._id, unitIds: editingLease.unitIds?.map((u: any) => u._id), startDate: editingLease.startDate?.split('T')[0] } : undefined}
          tenants={tenants} units={units} onSubmit={handleSubmit} loading={loading} />
      </Modal>

      <ConfirmDialog isOpen={!!endTarget} onClose={() => setEndTarget(null)} onConfirm={handleEndLease}
        title="End Lease" message={`End lease for "${endTarget?.tenantId?.name}"? Units will be vacated.`}
        confirmLabel="End Lease" confirmVariant="danger" loading={loading} />
    </div>
  );
}
