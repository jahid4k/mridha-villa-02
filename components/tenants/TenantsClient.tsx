'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Archive, RotateCcw, Search, Phone, Building } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, Th, Td, TableRow, EmptyState } from '@/components/ui/Table';

function TenantForm({ defaultValues, onSubmit, loading }: { defaultValues?: any; onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    name: '', phone: '', alternativePhone: '', businessName: '', nidNumber: '',
    address: '', emergencyContact: '', notes: '', status: 'active',
    ...defaultValues,
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) { toast.error('Name and phone required'); return; }
    onSubmit(form);
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Full Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Alt Phone" value={form.alternativePhone} onChange={(e) => setForm({ ...form, alternativePhone: e.target.value })} />
        <Input label="Business Name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="NID Number" value={form.nidNumber} onChange={(e) => setForm({ ...form, nidNumber: e.target.value })} />
        <Input label="Emergency Contact" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
      </div>
      <Textarea label="Address" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      <Textarea label="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <Button type="submit" loading={loading} className="w-full">Save Tenant</Button>
    </form>
  );
}

export default function TenantsClient({ initialTenants, currentUser }: { initialTenants: any[]; currentUser: string }) {
  const [tenants, setTenants] = useState(initialTenants);
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [archiveTarget, setArchiveTarget] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const fetchTenants = async () => {
    const params = new URLSearchParams();
    if (showArchived) params.set('includeArchived', 'true');
    if (search) params.set('search', search);
    const res = await fetch(`/api/tenants?${params}`);
    if (res.ok) { const data = await res.json(); setTenants(data.tenants); }
  };

  useEffect(() => { const t = setTimeout(fetchTenants, 300); return () => clearTimeout(t); }, [search, showArchived]);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      const method = editingTenant ? 'PUT' : 'POST';
      const url = editingTenant ? `/api/tenants/${editingTenant._id}` : '/api/tenants';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success(editingTenant ? 'Tenant updated' : 'Tenant created');
      setShowModal(false); setEditingTenant(null); await fetchTenants();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setLoading(true);
    try {
      const action = archiveTarget.status === 'archived' ? 'restore' : 'archive';
      const res = await fetch(`/api/tenants/${archiveTarget._id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success(action === 'archive' ? 'Tenant archived' : 'Tenant restored');
      setArchiveTarget(null); await fetchTenants();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenants..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <button onClick={() => setShowArchived(!showArchived)}
          className={`px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap ${showArchived ? 'bg-slate-800 text-white' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}>
          {showArchived ? 'Hide Archived' : 'Show Archived'}
        </button>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setEditingTenant(null); setShowModal(true); }}>Add Tenant</Button>
      </div>

      <Card>
        {tenants.length === 0 ? (
          <EmptyState title="No tenants found" description="Add your first tenant"
            action={<Button onClick={() => setShowModal(true)} leftIcon={<Plus className="w-4 h-4" />}>Add Tenant</Button>} />
        ) : (
          <Table>
            <TableHead>
              <tr><Th>Name</Th><Th>Phone</Th><Th>Business</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr>
            </TableHead>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant._id}>
                  <Td><p className="font-semibold text-slate-800">{tenant.name}</p>{tenant.nidNumber && <p className="text-xs text-slate-400">NID: {tenant.nidNumber}</p>}</Td>
                  <Td><div className="flex items-center gap-1 text-sm"><Phone className="w-3 h-3 text-slate-400" />{tenant.phone}</div></Td>
                  <Td>{tenant.businessName ? <div className="flex items-center gap-1 text-sm"><Building className="w-3 h-3 text-slate-400" />{tenant.businessName}</div> : <span className="text-slate-400 text-xs">—</span>}</Td>
                  <Td><StatusBadge status={tenant.status} /></Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      {tenant.status !== 'archived' && (
                        <button onClick={() => { setEditingTenant(tenant); setShowModal(true); }} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Pencil className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={() => setArchiveTarget(tenant)}
                        className={`p-1.5 rounded text-slate-500 ${tenant.status === 'archived' ? 'hover:bg-green-50 hover:text-green-600' : 'hover:bg-red-50 hover:text-red-600'}`}>
                        {tenant.status === 'archived' ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingTenant(null); }} title={editingTenant ? `Edit ${editingTenant.name}` : 'Add New Tenant'} size="lg">
        <TenantForm defaultValues={editingTenant} onSubmit={handleSubmit} loading={loading} />
      </Modal>

      <ConfirmDialog isOpen={!!archiveTarget} onClose={() => setArchiveTarget(null)} onConfirm={handleArchive}
        title={archiveTarget?.status === 'archived' ? 'Restore Tenant' : 'Archive Tenant'}
        message={archiveTarget?.status === 'archived' ? `Restore "${archiveTarget?.name}"?` : `Archive "${archiveTarget?.name}"?`}
        confirmLabel={archiveTarget?.status === 'archived' ? 'Restore' : 'Archive'}
        confirmVariant={archiveTarget?.status === 'archived' ? 'primary' : 'danger'}
        loading={loading} />
    </div>
  );
}
