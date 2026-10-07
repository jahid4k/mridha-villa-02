'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Pencil, Archive, RotateCcw, Search, Phone, Building, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, Th, Td, TableRow, EmptyState } from '@/components/ui/Table';
import TenantProfilePhoto from '@/components/TenantProfilePhoto';
import { useI18n } from '@/components/providers/LanguageProvider';

// ─── Tenant Form (editing; new tenants come in through New agreement) ─────────
function TenantForm({
  defaultValues,
  onSubmit,
  loading,
}: {
  defaultValues: any;
  onSubmit: (data: any) => void;
  loading: boolean;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    alternativePhone: '',
    email: '',
    businessName: '',
    businessType: '',
    tradeLicenseNumber: '',
    nidNumber: '',
    presentAddress: '',
    permanentAddress: '',
    guardianName: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    notes: '',
    status: 'active',
    ...defaultValues,
    dateOfBirth: defaultValues?.dateOfBirth ? String(defaultValues.dateOfBirth).slice(0, 10) : '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev: any) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error(t('Name is required')); return; }
    if (!form.phone.trim()) { toast.error(t('Phone is required')); return; }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Personal */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('Personal Info')}</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('Full Name *')} value={form.name} onChange={set('name')} placeholder={t('e.g. Md. Karim Uddin')} />
          <Input label={t('Phone *')} value={form.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" />
          <Input label={t('Alt Phone')} value={form.alternativePhone} onChange={set('alternativePhone')} placeholder="01XXXXXXXXX" />
          <Input label={t('Email')} type="email" value={form.email} onChange={set('email')} placeholder={t('optional')} />
          <Input label={t('NID Number')} value={form.nidNumber} onChange={set('nidNumber')} placeholder={t('National ID')} />
          <Input label={t('Father / Guardian Name')} value={form.guardianName} onChange={set('guardianName')} placeholder={t('For agreement deed')} />
          <Input label={t('Date of birth')} type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Textarea label={t('Present address')} rows={2} value={form.presentAddress} onChange={set('presentAddress')} />
          <Textarea label={t('Permanent Address')} rows={2} value={form.permanentAddress} onChange={set('permanentAddress')} placeholder={t('Village, Upazila, District...')} />
        </div>
      </div>

      {/* Business */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('Business Info (optional)')}</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('Business Name')} value={form.businessName} onChange={set('businessName')} placeholder={t('Shop / company name')} />
          <Input label={t('Business Type')} value={form.businessType} onChange={set('businessType')} placeholder={t('e.g. Grocery, Pharmacy')} />
          <Input label={t('Trade License No.')} value={form.tradeLicenseNumber} onChange={set('tradeLicenseNumber')} className="col-span-2" />
        </div>
      </div>

      {/* Emergency */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('Emergency Contact (optional)')}</p>
        <div className="grid grid-cols-3 gap-3">
          <Input label={t('Contact Name')} value={form.emergencyContactName} onChange={set('emergencyContactName')} />
          <Input label={t('Contact Phone')} value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} />
          <Input label={t('Relation')} value={form.emergencyContactRelation} onChange={set('emergencyContactRelation')} placeholder={t('e.g. Brother')} />
        </div>
      </div>

      {/* Notes */}
      <Textarea label={t('Notes')} rows={2} value={form.notes} onChange={set('notes')} placeholder={t('Any additional notes...')} />

      <Button type="submit" loading={loading} className="w-full">
        {t('Update Tenant')}
      </Button>
    </form>
  );
}

// ─── Avatar component (used in table rows) ───────────────────────────────────
function TenantAvatar({ tenant }: { tenant: any }) {
  const colors = [
    'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
  ];
  let hash = 0;
  for (let i = 0; i < (tenant.name || '').length; i++)
    hash = tenant.name.charCodeAt(i) + ((hash << 5) - hash);
  const color = colors[Math.abs(hash) % colors.length];
  const initials = (tenant.name || '?')
    .split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('');

  if (tenant.profilePhoto?.secureUrl) {
    return (
      <img
        src={tenant.profilePhoto.secureUrl}
        alt={tenant.name}
        className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0"
      />
    );
  }
  return (
    <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm`}>
      <span className="text-white text-xs font-bold">{initials}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TenantsClient({
  initialTenants,
}: {
  initialTenants: any[];
  currentUser: string;
}) {
  const { t } = useI18n();
  const [tenants, setTenants] = useState(initialTenants);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [archiveTarget, setArchiveTarget] = useState<any>(null);
  const [photoTenant, setPhotoTenant] = useState<any>(null); // tenant whose photo we're editing
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const fetchTenants = async () => {
    const params = new URLSearchParams();
    if (showArchived) params.set('includeArchived', 'true');
    if (search) params.set('search', search);
    const res = await fetch(`/api/tenants?${params}`);
    if (res.ok) {
      const data = await res.json();
      setTenants(data.tenants);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchTenants, 300);
    return () => clearTimeout(timer);
  }, [search, showArchived]);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${editingTenant._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(t(result.error));
      toast.success(t('Tenant updated'));
      setEditingTenant(null);
      await fetchTenants();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setLoading(true);
    try {
      const action = archiveTarget.status === 'archived' ? 'restore' : 'archive';
      const res = await fetch(`/api/tenants/${archiveTarget._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(t(result.error));
      toast.success(t(action === 'archive' ? 'Tenant archived' : 'Tenant restored'));
      setArchiveTarget(null);
      await fetchTenants();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpdated = async () => {
    await fetchTenants();
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Search by name, phone, or business...')}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap ${showArchived ? 'bg-slate-800 text-white' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
        >
          {t(showArchived ? 'Hide Archived' : 'Show Archived')}
        </button>
        <Link href="/deeds/new">
          <Button leftIcon={<Plus className="w-4 h-4" />} className="w-full">
            {t('New agreement')}
          </Button>
        </Link>
      </div>

      {/* Table */}
      <Card>
        {tenants.length === 0 ? (
          <EmptyState
            title={t('No tenants found')}
            description={t(search ? 'No tenants match your search' : 'Tenants are added with a new agreement')}
            action={
              !search ? (
                <Link href="/deeds/new">
                  <Button leftIcon={<Plus className="w-4 h-4" />}>{t('New agreement')}</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>{t('Tenant')}</Th>
                <Th>{t('Phone')}</Th>
                <Th>{t('Business')}</Th>
                <Th>{t('NID')}</Th>
                <Th>{t('Status')}</Th>
                <Th className="text-right">{t('Actions')}</Th>
              </tr>
            </TableHead>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant._id}>
                  {/* Tenant name with avatar */}
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => setPhotoTenant(tenant)}
                        title={t('Click to update photo')}
                        className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded-full"
                      >
                        <TenantAvatar tenant={tenant} />
                      </button>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{tenant.name}</p>
                        {tenant.guardianName && (
                          <p className="text-xs text-slate-400">{t('S/O {name}', { name: tenant.guardianName })}</p>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {tenant.phone}
                    </div>
                    {tenant.alternativePhone && (
                      <p className="text-xs text-slate-400 mt-0.5">{tenant.alternativePhone}</p>
                    )}
                  </Td>
                  <Td>
                    {tenant.businessName ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Building className="w-3 h-3 text-slate-400" />
                        {tenant.businessName}
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </Td>
                  <Td>
                    {tenant.nidNumber ? (
                      <span className="text-xs text-slate-600 font-mono">{tenant.nidNumber}</span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </Td>
                  <Td><StatusBadge status={tenant.status} /></Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      {/* Photo button */}
                      <button
                        onClick={() => setPhotoTenant(tenant)}
                        className="p-1.5 rounded hover:bg-indigo-50 text-slate-400 hover:text-indigo-600"
                        title={t('Update photo')}
                      >
                        <User className="w-3.5 h-3.5" />
                      </button>
                      {/* Edit button */}
                      {tenant.status !== 'archived' && (
                        <button
                          onClick={() => setEditingTenant(tenant)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                          title={t('Edit tenant')}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {/* Archive/Restore button */}
                      <button
                        onClick={() => setArchiveTarget(tenant)}
                        className={`p-1.5 rounded text-slate-500 ${
                          tenant.status === 'archived'
                            ? 'hover:bg-green-50 hover:text-green-600'
                            : 'hover:bg-red-50 hover:text-red-600'
                        }`}
                        title={t(tenant.status === 'archived' ? 'Restore' : 'Archive')}
                      >
                        {tenant.status === 'archived' ? (
                          <RotateCcw className="w-3.5 h-3.5" />
                        ) : (
                          <Archive className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Edit Tenant Modal */}
      <Modal
        isOpen={!!editingTenant}
        onClose={() => setEditingTenant(null)}
        title={t('Edit — {name}', { name: editingTenant?.name ?? '' })}
        size="xl"
      >
        {editingTenant && (
          <TenantForm
            key={editingTenant._id}
            defaultValues={editingTenant}
            onSubmit={handleSubmit}
            loading={loading}
          />
        )}
      </Modal>

      {/* Profile Photo Modal */}
      <Modal
        isOpen={!!photoTenant}
        onClose={() => setPhotoTenant(null)}
        title={t('Profile Photo — {name}', { name: photoTenant?.name ?? '' })}
        size="sm"
      >
        {photoTenant && (
          <div className="flex flex-col items-center gap-4 py-4">
            <TenantProfilePhoto
              tenantId={photoTenant._id}
              currentPhoto={photoTenant.profilePhoto}
              tenantName={photoTenant.name}
              size="lg"
              editable={true}
              onPhotoUpdated={() => {
                handlePhotoUpdated();
                setPhotoTenant(null);
                toast.success(t('Photo updated successfully'));
              }}
            />
            <p className="text-xs text-slate-400 text-center">
              {t('JPEG, PNG or WebP — max 5MB')}
            </p>
          </div>
        )}
      </Modal>

      {/* Archive / Restore Confirm */}
      <ConfirmDialog
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title={t(archiveTarget?.status === 'archived' ? 'Restore Tenant' : 'Archive Tenant')}
        message={
          archiveTarget?.status === 'archived'
            ? t('Restore "{name}" back to active?', { name: archiveTarget?.name })
            : t('Archive "{name}"? They will be hidden from active lists.', { name: archiveTarget?.name })
        }
        confirmLabel={t(archiveTarget?.status === 'archived' ? 'Restore' : 'Archive')}
        confirmVariant={archiveTarget?.status === 'archived' ? 'primary' : 'danger'}
        loading={loading}
      />
    </div>
  );
}
