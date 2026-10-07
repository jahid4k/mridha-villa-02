'use client';

import { SessionProvider } from 'next-auth/react';
import { LanguageProvider } from './LanguageProvider';
import type { Lang } from '@/lib/i18n';

export default function Providers({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider lang={lang}>{children}</LanguageProvider>
    </SessionProvider>
  );
}
