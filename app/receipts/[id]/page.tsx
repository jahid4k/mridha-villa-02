import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Payment from '@/models/Payment';
import Setting from '@/models/Setting';
import { formatPaymentMethod } from '@/lib/formatters';
import { getI18n } from '@/lib/i18n/server';
import PrintButton from './PrintButton';

export const metadata = { title: 'Receipt / রশিদ' };

const KIND_LABEL: Record<string, string> = { rent: 'Rent', electricity: 'Electricity', gas: 'Gas' };

// A printable money receipt for one payment. Lives outside the dashboard
// layout so it prints on its own without the sidebar.
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  await connectDB();
  const { id } = await params;
  const [payment, building]: any[] = await Promise.all([
    Payment.findById(id)
      .populate('tenantId', 'name phone')
      .populate({ path: 'leaseId', select: 'unitIds', populate: { path: 'unitIds', select: 'unitName' } })
      .lean()
      .catch(() => null),
    Setting.findOne({ key: 'buildingName' }).lean(),
  ]);
  if (!payment) notFound();
  const { t, f } = await getI18n();

  const buildingName = building?.value || 'Mridha Villa 2';
  const units = (payment.leaseId?.unitIds || []).map((u: any) => u.unitName).join(', ');
  const lines: { label: string; amount: number }[] = [
    ...(payment.allocations || []).map((a: any) => ({
      label: t('{kind}: {month}', { kind: t(KIND_LABEL[a.kind]), month: f.monthYear(a.month, a.year) }),
      amount: a.amount,
    })),
    ...(payment.creditAdded > 0 ? [{ label: t('Advance payment (credit)'), amount: payment.creditAdded }] : []),
  ];
  // Older payments made before itemised receipts: show the total only.
  if (lines.length === 0) lines.push({ label: t('Payment'), amount: payment.amount });

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white py-8 print:py-0">
      <div className="max-w-md mx-auto mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-8 print:border-0 print:rounded-none">
        <div className="text-center border-b border-slate-200 pb-4 mb-4">
          <h1 className="text-xl font-bold text-slate-800">{buildingName}</h1>
          <p className="text-sm text-slate-500">{t('Money Receipt')}</p>
        </div>

        <div className="grid grid-cols-2 gap-y-1 text-sm mb-4">
          <span className="text-slate-500">{t('Receipt no.')}</span>
          <span className="text-right font-semibold">{payment.receiptNumber}</span>
          <span className="text-slate-500">{t('Date')}</span>
          <span className="text-right">{f.date(payment.paymentDate)}</span>
          <span className="text-slate-500">{t('Received from')}</span>
          <span className="text-right font-medium">{payment.tenantId?.name}</span>
          {units && (
            <>
              <span className="text-slate-500">{t('Unit')}</span>
              <span className="text-right">{units}</span>
            </>
          )}
        </div>

        <table className="w-full text-sm mb-4">
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-1.5">{l.label}</td>
                <td className="py-1.5 text-right">{f.bdt(l.amount)}</td>
              </tr>
            ))}
            <tr>
              <td className="pt-2 font-bold">{t('Total')}</td>
              <td className="pt-2 text-right font-bold">{f.bdt(payment.amount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-y-1 text-sm">
          <span className="text-slate-500">{t('Paid by')}</span>
          <span className="text-right">{t(formatPaymentMethod(payment.paymentMethod))}</span>
          <span className="text-slate-500">{t('Received by')}</span>
          <span className="text-right">{t(payment.receivedBy === 'jony' ? 'Jony' : 'Jahid')}</span>
        </div>

        <div className="mt-12 flex justify-end">
          <div className="text-center text-xs text-slate-500 border-t border-slate-400 pt-1 w-40">
            {t('Signature')}
          </div>
        </div>
      </div>
    </div>
  );
}
