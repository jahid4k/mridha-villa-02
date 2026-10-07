'use client';

import { createContext, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_LANG, LANG_COOKIE, makeI18n, type Lang } from '@/lib/i18n';

type I18nValue = ReturnType<typeof makeI18n> & { setLang: (lang: Lang) => void };

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const router = useRouter();
  const value = useMemo<I18nValue>(() => ({
    ...makeI18n(lang),
    setLang: (next: Lang) => {
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      router.refresh(); // server components re-render in the new language
    },
  }), [lang, router]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** { lang, t, f, setLang } — t() translates, f formats numbers/money/dates. */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  return { ...makeI18n(DEFAULT_LANG), setLang: () => {} };
}
