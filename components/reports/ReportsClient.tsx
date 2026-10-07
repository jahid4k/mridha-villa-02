'use client';

import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { capitalize, formatExpenseCategory } from '@/lib/formatters';
import { useI18n } from '@/components/providers/LanguageProvider';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function buildMonthlyData(rentRecords: any[], expenses: any[]) {
  return MONTHS.map((m) => {
    const monthRecords = rentRecords.filter((r) => r.month === m);
    const monthExpenses = expenses.filter((e) => e.month === m);
    const expected = monthRecords.reduce((s, r) => s + r.totalPayable, 0);
    const collected = monthRecords.reduce((s, r) => s + r.collectedAmount, 0);
    const expenseTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
    return {
      month: m,
      Expected: expected,
      Collected: collected,
      Due: expected - collected,
      Expenses: expenseTotal,
      Net: collected - expenseTotal,
    };
  });
}

function buildCollectorData(rentRecords: any[]) {
  const jahid = rentRecords.filter((r) =>
    r.unitIds?.some((u: any) => u.assignedCollector === 'jahid') || r.collector === 'jahid'
  );
  const jony = rentRecords.filter((r) =>
    r.unitIds?.some((u: any) => u.assignedCollector === 'jony') || r.collector === 'jony'
  );
  return [
    {
      name: 'Jahid',
      Expected: jahid.reduce((s, r) => s + r.totalPayable, 0),
      Collected: jahid.reduce((s, r) => s + r.collectedAmount, 0),
      Due: jahid.reduce((s, r) => s + r.dueAmount, 0),
    },
    {
      name: 'Jony',
      Expected: jony.reduce((s, r) => s + r.totalPayable, 0),
      Collected: jony.reduce((s, r) => s + r.collectedAmount, 0),
      Due: jony.reduce((s, r) => s + r.dueAmount, 0),
    },
  ];
}

function buildCategoryData(expenses: any[]) {
  const categories: Record<string, number> = {};
  expenses.forEach((e) => {
    categories[e.category] = (categories[e.category] || 0) + e.amount;
  });
  return Object.entries(categories).map(([name, value]) => ({ name, value }));
}

function buildStatusData(rentRecords: any[]) {
  const counts: Record<string, number> = {};
  rentRecords.forEach((r) => {
    counts[r.status] = (counts[r.status] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export default function ReportsClient({
  rentRecords,
  expenses,
  payments,
  defaultYear,
  currentUser,
}: {
  rentRecords: any[];
  expenses: any[];
  payments: any[];
  defaultYear: number;
  currentUser: string;
}) {
  const { t, f } = useI18n();
  const formatY = (v: any) => `৳${f.digits((Number(v) / 1000).toFixed(0))}${t('k')}`;
  const money = (v: any) => f.bdt(Number(v));
  const YEARS = Array.from({ length: 5 }, (_, i) => defaultYear - 2 + i);

  const [reportYear, setReportYear] = useState(defaultYear);
  const [reportRecords, setReportRecords] = useState(rentRecords);
  const [reportExpenses, setReportExpenses] = useState(expenses);

  const fetchYear = async (y: number) => {
    const [rRes, eRes] = await Promise.all([
      fetch(`/api/rent?year=${y}`),
      fetch(`/api/expenses?year=${y}`),
    ]);
    const [rData, eData] = await Promise.all([rRes.json(), eRes.json()]);
    setReportRecords(rData.records || []);
    setReportExpenses(eData.expenses || []);
    setReportYear(y);
  };

  const monthlyData = useMemo(() => buildMonthlyData(reportRecords, reportExpenses), [reportRecords, reportExpenses]);
  const collectorData = useMemo(() => buildCollectorData(reportRecords), [reportRecords]);
  const categoryData = useMemo(() => buildCategoryData(reportExpenses), [reportExpenses]);
  const statusData = useMemo(() => buildStatusData(reportRecords), [reportRecords]);

  const totals = useMemo(() => ({
    expected: reportRecords.reduce((s, r) => s + r.totalPayable, 0),
    collected: reportRecords.reduce((s, r) => s + r.collectedAmount, 0),
    due: reportRecords.reduce((s, r) => s + r.dueAmount, 0),
    expenses: reportExpenses.reduce((s, e) => s + e.amount, 0),
  }), [reportRecords, reportExpenses]);

  const collectionRate = totals.expected > 0
    ? Math.round((totals.collected / totals.expected) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Year picker */}
      <div className="flex items-center gap-3">
        <p className="text-sm font-medium text-slate-700">{t('Year:')}</p>
        <div className="flex gap-1">
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => fetchYear(y)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                reportYear === y ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.digits(y)}
            </button>
          ))}
        </div>
      </div>

      {/* Annual KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Expected', value: f.bdt(totals.expected), color: 'text-slate-800' },
          { label: 'Total Collected', value: f.bdt(totals.collected), color: 'text-green-600' },
          { label: 'Total Due', value: f.bdt(totals.due), color: 'text-red-500' },
          { label: 'Total Expenses', value: f.bdt(totals.expenses), color: 'text-orange-500' },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t(s.label)}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-indigo-600">{f.digits(collectionRate)}%</p>
          <p className="text-xs text-slate-500 mt-0.5">{t('Collection Rate')}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className={`text-3xl font-bold ${totals.collected - totals.expenses >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {f.bdt(totals.collected - totals.expenses)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{t('Net Income')}</p>
        </Card>
      </div>

      {/* Monthly Revenue vs Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Monthly Collection vs Expenses — {year}', { year: reportYear })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(m: any) => f.shortMonth(Number(m))} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={formatY} />
                <Tooltip formatter={money} labelFormatter={(m: any) => f.month(Number(m))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Collected" name={t('Collected')} fill="#4f46e5" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Due" name={t('Due')} fill="#fca5a5" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Expenses" name={t('Expenses')} fill="#fdba74" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Net Income Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Monthly Net Income')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(m: any) => f.shortMonth(Number(m))} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={formatY} />
                <Tooltip formatter={money} labelFormatter={(m: any) => f.month(Number(m))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="Net" name={t('Net')} stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Collector Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Rent by owner — {year}', { year: reportYear })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collectorData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#374151', fontWeight: 600 }} tickFormatter={(n: any) => t(n)} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={formatY} />
                <Tooltip formatter={money} labelFormatter={(n: any) => t(n)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Expected" name={t('Expected')} fill="#e0e7ff" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Collected" name={t('Collected')} fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Due" name={t('Due')} fill="#fca5a5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expense Categories Pie */}
        {categoryData.length > 0 && (
          <Card>
            <CardHeader><CardTitle>{t('Expense Breakdown')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                      label={({ name, percent }: any) => `${t(formatExpenseCategory(name ?? ''))} ${f.digits(((percent ?? 0) * 100).toFixed(0))}%`}
                      labelLine={false}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any, name: any) => [money(v), t(formatExpenseCategory(name))]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Status Distribution */}
        {statusData.length > 0 && (
          <Card>
            <CardHeader><CardTitle>{t('Rent Record Status')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                      label={({ name, value }: any) => `${t(capitalize(name ?? ''))}: ${f.digits(value)}`}
                      labelLine={false}>
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any, name: any) => [f.digits(v), t(capitalize(name))]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Monthly breakdown table */}
      <Card>
        <CardHeader><CardTitle>{t('Monthly Breakdown — {year}', { year: reportYear })}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Month', 'Expected', 'Collected', 'Due', 'Expenses', 'Net'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{f.month(row.month)}</td>
                    <td className="px-4 py-3 text-slate-600">{f.bdt(row.Expected)}</td>
                    <td className="px-4 py-3 text-green-600 font-medium">{f.bdt(row.Collected)}</td>
                    <td className="px-4 py-3 text-red-500">{f.bdt(row.Due)}</td>
                    <td className="px-4 py-3 text-orange-500">{f.bdt(row.Expenses)}</td>
                    <td className={`px-4 py-3 font-semibold ${row.Net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {f.bdt(row.Net)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-4 py-3">{t('Total')}</td>
                  <td className="px-4 py-3">{f.bdt(totals.expected)}</td>
                  <td className="px-4 py-3 text-green-600">{f.bdt(totals.collected)}</td>
                  <td className="px-4 py-3 text-red-500">{f.bdt(totals.due)}</td>
                  <td className="px-4 py-3 text-orange-500">{f.bdt(totals.expenses)}</td>
                  <td className={`px-4 py-3 ${totals.collected - totals.expenses >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {f.bdt(totals.collected - totals.expenses)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
