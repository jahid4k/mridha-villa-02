'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/providers/LanguageProvider';
import {
  LayoutDashboard, Building2, Users, FileText, CircleDollarSign,
  Zap, Flame, Receipt, BarChart3, ClipboardList, Settings, X, FileSignature,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/units', label: 'Units', icon: Building2 },
  { href: '/tenants', label: 'Tenants', icon: Users },
  { href: '/leases', label: 'Leases', icon: FileText },
  { href: '/deeds/new', label: 'New agreement', icon: FileSignature },
  { href: '/rent', label: 'Rent', icon: CircleDollarSign },
  { href: '/electricity', label: 'Electricity', icon: Zap },
  { href: '/gas', label: 'Gas', icon: Flame },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/audit-logs', label: 'Audit Logs', icon: ClipboardList },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

function NavLinks({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        return (
          <Link key={href} href={href} onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            )}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {t(label)}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { t, f } = useI18n();
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-none">Mridha Villa 2</p>
            <p className="text-xs text-slate-400 leading-none mt-0.5">{t('Property Management')}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 lg:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <NavLinks onClose={onClose} />
      <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
        <p className="text-xs text-slate-400 text-center">Mridha Villa 2 &copy; {f.digits(2024)}</p>
      </div>
    </div>
  );
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      <div className="hidden lg:flex flex-col w-60 border-r border-slate-200 h-full flex-shrink-0">
        <SidebarContent />
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onCloseMobile} />
      )}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 lg:hidden transform transition-transform duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent onClose={onCloseMobile} />
      </div>
    </>
  );
}
