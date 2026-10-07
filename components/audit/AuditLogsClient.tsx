'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Table, TableHead, TableBody, Th, Td, TableRow, EmptyState } from '@/components/ui/Table';
import { useI18n } from '@/components/providers/LanguageProvider';
import { ACTION_LABELS, ENTITY_LABELS, PERSON_LABELS } from '@/lib/i18n/labels';
import { ChevronDown, ChevronUp } from 'lucide-react';

const entityTypes = ['unit', 'tenant', 'lease', 'rentRecord', 'payment', 'electricityBill', 'gasBill', 'expense', 'setting'];
const actions = ['create', 'update', 'archive', 'restore', 'payment', 'generate'];

const actionColors: Record<string, string> = {
  create: 'bg-green-50 text-green-700',
  update: 'bg-blue-50 text-blue-700',
  archive: 'bg-red-50 text-red-600',
  restore: 'bg-purple-50 text-purple-700',
  payment: 'bg-emerald-50 text-emerald-700',
  generate: 'bg-indigo-50 text-indigo-700',
  adjustment: 'bg-yellow-50 text-yellow-700',
};

export default function AuditLogsClient({
  initialLogs,
  totalLogs,
}: {
  initialLogs: any[];
  totalLogs: number;
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [total, setTotal] = useState(totalLogs);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const { t, f } = useI18n();
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    entityType: '',
    performedBy: '',
    action: '',
  });

  const fetchLogs = async (p = 1, flt = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' });
      if (flt.entityType) params.set('entityType', flt.entityType);
      if (flt.performedBy) params.set('performedBy', flt.performedBy);
      if (flt.action) params.set('action', flt.action);

      const res = await fetch(`/api/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.pagination.total);
        setPage(p);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchLogs(1, newFilters);
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          options={[{ value: '', label: t('All Types') }, ...entityTypes.map((v) => ({ value: v, label: t(ENTITY_LABELS[v]) }))]}
          value={filters.entityType}
          onChange={(e) => handleFilterChange('entityType', e.target.value)}
          className="w-40"
        />
        <Select
          options={[
            { value: '', label: t('All Users') },
            ...['jahid', 'jony', 'system'].map((v) => ({ value: v, label: t(PERSON_LABELS[v]) })),
          ]}
          value={filters.performedBy}
          onChange={(e) => handleFilterChange('performedBy', e.target.value)}
          className="w-36"
        />
        <Select
          options={[{ value: '', label: t('All Actions') }, ...actions.map((v) => ({ value: v, label: t(ACTION_LABELS[v]) }))]}
          value={filters.action}
          onChange={(e) => handleFilterChange('action', e.target.value)}
          className="w-36"
        />
        <span className="text-xs text-slate-500 self-center ml-auto">
          {t('{count} entries', { count: total })}
        </span>
      </div>

      <Card>
        {logs.length === 0 ? (
          <EmptyState title={t('No audit logs found')} description={t('Activity will be logged here as you use the system')} />
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log._id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[log.action] || 'bg-slate-100 text-slate-600'}`}>
                      {t(ACTION_LABELS[log.action] ?? log.action)}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{t(ENTITY_LABELS[log.entityType] ?? log.entityType)}</span>
                    {log.note && <span className="text-sm text-slate-500">&mdash; {log.note}</span>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">{f.dateTime(log.performedAt)}</p>
                    <p className="text-xs font-medium text-slate-700">{t(PERSON_LABELS[log.performedBy] ?? log.performedBy)}</p>
                  </div>
                </div>

                {/* Changed fields */}
                {log.changedFields && log.changedFields.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {log.changedFields.map((field: string) => (
                      <span key={field} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        {field}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expandable data diff */}
                {(log.previousData || log.newData) && (
                  <div className="mt-1">
                    <button
                      onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
                      className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
                    >
                      {expandedLog === log._id ? (
                        <><ChevronUp className="w-3 h-3" />{t('Hide data')}</>
                      ) : (
                        <><ChevronDown className="w-3 h-3" />{t('Show data')}</>
                      )}
                    </button>

                    {expandedLog === log._id && (
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {log.previousData && (
                          <div className="bg-red-50 rounded-lg p-2">
                            <p className="text-xs font-semibold text-red-700 mb-1">{t('Before')}</p>
                            <pre className="text-xs text-red-600 overflow-auto max-h-32 whitespace-pre-wrap">
                              {JSON.stringify(log.previousData, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.newData && (
                          <div className="bg-green-50 rounded-lg p-2">
                            <p className="text-xs font-semibold text-green-700 mb-1">{t('After')}</p>
                            <pre className="text-xs text-green-600 overflow-auto max-h-32 whitespace-pre-wrap">
                              {JSON.stringify(log.newData, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {t('Page {page} of {pages} ({count} entries)', { page, pages: totalPages, count: total })}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => fetchLogs(page - 1)}
              loading={loading}
            >
              {t('Previous page')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page === totalPages}
              onClick={() => fetchLogs(page + 1)}
              loading={loading}
            >
              {t('Next page')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
