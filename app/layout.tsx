import type { Metadata } from 'next';
import { Noto_Sans_Bengali } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import Providers from '@/components/providers/Providers';
import { getI18n, getLang } from '@/lib/i18n/server';

// Self-hosted Bangla font so Bangla text looks the same on every phone.
const bengali = Noto_Sans_Bengali({
  subsets: ['bengali', 'latin'],
  variable: '--font-bengali',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: `Mridha Villa 2 — ${t('Property Management')}`,
    description: 'Private property rent management system for Mridha Villa 2',
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={bengali.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers lang={lang}>
          {children}
          <Toaster position="top-right" richColors closeButton toastOptions={{ duration: 4000 }} />
        </Providers>
      </body>
    </html>
  );
}
