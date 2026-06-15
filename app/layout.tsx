import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import Providers from '@/components/providers/Providers';

export const metadata: Metadata = {
  title: 'Mridha Villa 2 — Property Management',
  description: 'Private property rent management system for Mridha Villa 2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Toaster position="top-right" richColors closeButton toastOptions={{ duration: 4000 }} />
        </Providers>
      </body>
    </html>
  );
}
