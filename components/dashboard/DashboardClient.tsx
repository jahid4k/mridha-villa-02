'use client';

import { formatBDT, formatDate, formatDateTime, getMonthName } from '@/lib/formatters';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge, CollectorBadge } from '@/components/ui/Badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, Building2, Users, Zap, Flame,
  AlertCircle, CheckCircle2, Clock, ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  month: number;
  year: number;
  summary: {
    totalExpected: number;
    totalCollected: number;
    totalDue: number;
    totalAdvance: number;
    totalExpenses: number;
    electricityDue: number;
    gasDue: number;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
  };
  collectorSummary: {
    jahid: { expected: number; collected: number; due: number; advance: number };
    jony: { expected: number; collected: number; due: number; advance: number };
  };
  recentPayments: any[];
  recentExpenses: any[];
  recentAuditLogs: any[];
  overdueTenants: any[];
  monthlyTrend: any[];
}

function formatTrendData(trend: any[]) {
  return trend.map((t) => ({
    label: `${getMonthName(t._id.month).slice(0, 3)} ${t._id.year}`,
    Expected: t.totalPayable,
    Collected: t.totalCollected,
    Due: t.totalDue,
  }));
}

export default function DashboardClient({
  data,
  currentUser,
}: {
  data: DashboardData;
  currentUser: string;
}) {
  const { summary, collectorSummary, monthlyTrend } = data;
  const collectionRate = summary.totalExpected > 0
    ? Math.round((summary.totalCollected / summary.totalExpected) * 100)
    : 0;

  const trendData = formatTrendData(monthlyTrend);

  return (
    <div className="space-y-6">
      {/* Main Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title="Expected Rent"
          value={formatBDT(summary.totalExpected)}
          subtitle={`${data.month}/${data.year}`}
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Collected"
          value={formatBDT(summary.totalCollected)}
          subtitle={`${collectionRate}% collection rate`}
          icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-50"
        />
        <StatCard
          title="Total Due"
          value={formatBDT(summary.totalDue)}
          subtitle="Rent outstanding"
          icon={<AlertCircle className="w-5 h-5 text-red-500" />}
          iconBg="bg-red-50"
        />
        <StatCard
          title="Advance Balance"
          value={formatBDT(summary.totalAdvance)}
          subtitle="Held in advance"
          icon={<Clock className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50"
        />
      </div>

      {/* Secondary Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title="Expenses"
          value={formatBDT(summary.totalExpenses)}
          subtitle="This month"
          icon={<TrendingDown className="w-5 h-5 text-orange-500" />}
          iconBg="bg-orange-50"
        />
        <StatCard
          title="Electricity Due"
          value={formatBDT(summary.electricityDue)}
          subtitle="Pending bills"
          icon={<Zap className="w-5 h-5 text-yellow-500" />}
          iconBg="bg-yellow-50"
        />
        <StatCard
          title="Gas Due"
          value={formatBDT(summary.gasDue)}
          subtitle="Pending bills"
          icon={<Flame className="w-5 h-5 text-orange-600" />}
          iconBg="bg-orange-50"
        />
        <StatCard
          title="Units"
          value={`${summary.occupiedUnits}/${summary.totalUnits}`}
          subtitle={`${summary.vacantUnits} vacant`}
          icon={<Building2 className="w-5 h-5 text-slate-500" />}
          iconBg="bg-slate-100"
        />
      </div>

      {/* Collector Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Jahid */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <CardTitle>Jahid — Rent Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Expected</p>
                <p className="text-lg font-bold text-slate-800">{formatBDT(collectorSummary.jahid.expected)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Collected</p>
                <p className="text-lg font-bold text-green-600">{formatBDT(collectorSummary.jahid.collected)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Due</p>
                <p className="text-lg font-bold text-red-500">{formatBDT(collectorSummary.jahid.due)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Advance</p>
                <p className="text-lg font-bold text-blue-500">{formatBDT(collectorSummary.jahid.advance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jony */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <CardTitle>Jony — Rent Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Expected</p>
                <p className="text-lg font-bold text-slate-800">{formatBDT(collectorSummary.jony.expected)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Collected</p>
                <p className="text-lg font-bold text-green-600">{formatBDT(collectorSummary.jony.collected)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Due</p>
                <p className="text-lg font-bold text-red-500">{formatBDT(collectorSummary.jony.due)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Advance</p>
                <p className="text-lg font-bold text-blue-500">{formatBDT(collectorSummary.jony.advance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Rent Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v: any) => `৳${(Number(v) / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: any) => formatBDT(Number(value))}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Expected" fill="#e0e7ff" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Collected" fill="#4f46e5" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Due" fill="#fca5a5" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overdue Tenants */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Overdue / Pending Rent</CardTitle>
              <Link href="/rent" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.overdueTenants.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">
                🎉 All rent collected for this month
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.overdueTenants.map((record: any) => (
                  <div key={record._id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{record.tenantId?.name}</p>
                      <p className="text-xs text-slate-500">{record.tenantId?.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">{formatBDT(record.dueAmount)}</p>
                      <StatusBadge status={record.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Payments</CardTitle>
              <Link href="/rent" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentPayments.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">No payments recorded yet</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentPayments.map((payment: any) => (
                  <div key={payment._id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{payment.tenantId?.name}</p>
                      <p className="text-xs text-slate-500">{formatDate(payment.paymentDate)} · {payment.paymentMethod}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">{formatBDT(payment.amount)}</p>
                      <CollectorBadge collector={payment.receivedBy} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Expenses</CardTitle>
              <Link href="/expenses" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentExpenses.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">No expenses recorded</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentExpenses.map((expense: any) => (
                  <div key={expense._id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{expense.title}</p>
                      <p className="text-xs text-slate-500">{expense.category} · {formatDate(expense.expenseDate)}</p>
                    </div>
                    <p className="text-sm font-semibold text-orange-600">{formatBDT(expense.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Audit Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Link href="/audit-logs" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentAuditLogs.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">No activity yet</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentAuditLogs.map((log: any) => (
                  <div key={log._id} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold text-slate-700 capitalize">
                        {log.action} {log.entityType}
                      </p>
                      <p className="text-xs text-slate-400">{formatDateTime(log.performedAt)}</p>
                    </div>
                    <p className="text-xs text-slate-500">by {log.performedBy}</p>
                    {log.note && <p className="text-xs text-slate-400 mt-0.5">{log.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
