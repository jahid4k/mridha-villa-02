'use client';

import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { formatBDT, getMonthName } from '@/lib/formatters';

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
      month: getMonthName(m).slice(0, 3),
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

const formatY = (v: any) => `৳${(Number(v) / 1000).toFixed(0)}k`;

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
  const [year, setYear] = useState(defaultYear);
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
        <p className="text-sm font-medium text-slate-700">Year:</p>
        <div className="flex gap-1">
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => fetchYear(y)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                reportYear === y ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Annual KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Expected', value: formatBDT(totals.expected), color: 'text-slate-800' },
          { label: 'Total Collected', value: formatBDT(totals.collected), color: 'text-green-600' },
          { label: 'Total Due', value: formatBDT(totals.due), color: 'text-red-500' },
          { label: 'Total Expenses', value: formatBDT(totals.expenses), color: 'text-orange-500' },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-indigo-600">{collectionRate}%</p>
          <p className="text-xs text-slate-500 mt-0.5">Collection Rate</p>
        </Card>
        <Card className="p-4 text-center">
          <p className={`text-3xl font-bold ${totals.collected - totals.expenses >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatBDT(totals.collected - totals.expenses)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Net Income</p>
        </Card>
      </div>

      {/* Monthly Revenue vs Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Collection vs Expenses — {reportYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={formatY} />
                <Tooltip formatter={(v: any) => formatBDT(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Collected" fill="#4f46e5" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Due" fill="#fca5a5" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Expenses" fill="#fdba74" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Net Income Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Net Income</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={formatY} />
                <Tooltip formatter={(v: any) => formatBDT(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="Net" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Collector Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Collector Performance — {reportYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collectorData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#374151', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={formatY} />
                <Tooltip formatter={(v: any) => formatBDT(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Expected" fill="#e0e7ff" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Collected" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Due" fill="#fca5a5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expense Categories Pie */}
        {categoryData.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Expense Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                                            label={({ name, percent }: any) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatBDT(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Status Distribution */}
        {statusData.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Rent Record Status</CardTitle></CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}>
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Monthly breakdown table */}
      <Card>
        <CardHeader><CardTitle>Monthly Breakdown — {reportYear}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Month', 'Expected', 'Collected', 'Due', 'Expenses', 'Net'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.month}</td>
                    <td className="px-4 py-3 text-slate-600">{formatBDT(row.Expected)}</td>
                    <td className="px-4 py-3 text-green-600 font-medium">{formatBDT(row.Collected)}</td>
                    <td className="px-4 py-3 text-red-500">{formatBDT(row.Due)}</td>
                    <td className="px-4 py-3 text-orange-500">{formatBDT(row.Expenses)}</td>
                    <td className={`px-4 py-3 font-semibold ${row.Net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatBDT(row.Net)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3">{formatBDT(totals.expected)}</td>
                  <td className="px-4 py-3 text-green-600">{formatBDT(totals.collected)}</td>
                  <td className="px-4 py-3 text-red-500">{formatBDT(totals.due)}</td>
                  <td className="px-4 py-3 text-orange-500">{formatBDT(totals.expenses)}</td>
                  <td className={`px-4 py-3 ${totals.collected - totals.expenses >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {formatBDT(totals.collected - totals.expenses)}
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
