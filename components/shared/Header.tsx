'use client';

import { signOut } from 'next-auth/react';
import { Menu, LogOut } from 'lucide-react';
import { useI18n } from '@/components/providers/LanguageProvider';
import LanguageSwitch from '@/components/shared/LanguageSwitch';
import { capitalize } from '@/lib/formatters';

interface HeaderProps {
  username: string;
  onMenuClick: () => void;
}

export default function Header({ username, onMenuClick }: HeaderProps) {
  const { t } = useI18n();
  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 flex-shrink-0">
      <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 lg:hidden">
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex-1 lg:flex-none" />
      <div className="flex items-center gap-3">
        <LanguageSwitch />
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <span className="text-xs font-bold text-indigo-700 uppercase">{username.slice(0, 2)}</span>
        </div>
        <span className="text-sm font-medium text-slate-700 hidden sm:block">{t(capitalize(username))}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-red-600 transition-colors"
          title={t('Sign out')}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
