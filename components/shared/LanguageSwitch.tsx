'use client';

import { Languages } from 'lucide-react';
import { useI18n } from '@/components/providers/LanguageProvider';
import { cn } from '@/lib/utils';

/** One tap to switch between Bangla and English; remembered on this device. */
export default function LanguageSwitch({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100',
        className,
      )}
      title={lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
    >
      <Languages className="w-3.5 h-3.5" />
      {lang === 'bn' ? 'English' : 'বাংলা'}
    </button>
  );
}
