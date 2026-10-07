import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/forms/LoginForm';
import LanguageSwitch from '@/components/shared/LanguageSwitch';
import { getI18n } from '@/lib/i18n/server';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect('/dashboard');
  }
  const { t, f } = await getI18n();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <LanguageSwitch className="border-slate-600 text-slate-300 hover:bg-slate-800" />
        </div>
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Mridha Villa 2</h1>
          <p className="text-slate-400 text-sm mt-1">{t('Property Management System')}</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-1">{t('Welcome back')}</h2>
          <p className="text-slate-500 text-sm mb-6">{t('Sign in to access the dashboard')}</p>
          <LoginForm />
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          {t('Private access only')} · Mridha Villa 2 © {f.digits(new Date().getFullYear())}
        </p>
      </div>
    </div>
  );
}
