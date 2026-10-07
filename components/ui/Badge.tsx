'use client';

import { cn } from '@/lib/utils';
import { useI18n } from '@/components/providers/LanguageProvider';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'purple';
  className?: string;
}

const variants = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-yellow-50 text-yellow-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
  muted: 'bg-slate-100 text-slate-500',
  purple: 'bg-purple-50 text-purple-700',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const config: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    paid: { label: 'Paid', variant: 'success' },
    partial: { label: 'Partial', variant: 'warning' },
    unpaid: { label: 'Unpaid', variant: 'danger' },
    overdue: { label: 'Overdue', variant: 'danger' },
    advance: { label: 'Advance', variant: 'info' },
    adjusted: { label: 'Adjusted', variant: 'purple' },
    active: { label: 'Active', variant: 'success' },
    ended: { label: 'Ended', variant: 'muted' },
    archived: { label: 'Archived', variant: 'muted' },
    vacant: { label: 'Vacant', variant: 'muted' },
    occupied: { label: 'Occupied', variant: 'info' },
    maintenance: { label: 'Maintenance', variant: 'warning' },
    previous: { label: 'Previous', variant: 'muted' },
  };

  const c = config[status] || { label: status, variant: 'default' as const };
  return <Badge variant={c.variant}>{t(c.label)}</Badge>;
}

export function CollectorBadge({ collector }: { collector: string }) {
  const { t } = useI18n();
  return (
    <Badge variant={collector === 'jahid' ? 'purple' : 'success'}>
      {t(collector === 'jahid' ? 'Jahid' : 'Jony')}
    </Badge>
  );
}
