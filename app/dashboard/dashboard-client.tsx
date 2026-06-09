"use client";

import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { Package, Users, HardHat, DollarSign, Receipt, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Link from "next/link";
import type { Role } from "@prisma/client";

interface DashboardStats { activeOrders: number; totalClients: number; activeWorkers: number; monthlyRevenue: number; monthlyExpenses: number; netProfit: number; }
interface ChartPoint { name: string; value: number; fill?: string; }
interface MonthlyData { month: string; income: number; expenses: number; }
interface ActivityItem { id: string; action: string; entity: string; entityId: string; createdAt: string; metadata: Record<string, unknown>; user: { name: string }; }

interface Props {
  userName: string;
  role: Role;
  stats: DashboardStats | null;
  statusBreakdown: ChartPoint[] | null;
  topWorkers: { name: string; value: number }[] | null;
  incomeVsExpenses: MonthlyData[] | null;
  recentActivity: ActivityItem[] | null;
  pendingCount: number;
}

export default function DashboardClient({ userName, role, stats, statusBreakdown, topWorkers, incomeVsExpenses, recentActivity, pendingCount }: Props) {
  const showFull = hasPermission(role, "dashboard_full");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userName}</h1>
          <p className="text-sm text-gray-500 mt-1">Here&apos;s what&apos;s happening with your business today.</p>
        </div>
        {pendingCount > 0 && hasPermission(role, "approve_piece_logs") && (
          <Link href="/dashboard/orders" className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors">
            <AlertCircle className="h-4 w-4" />
            {pendingCount} Pending Approvals
          </Link>
        )}
      </div>

      {showFull && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Active Orders" value={String(stats.activeOrders)} icon={<Package className="h-5 w-5" />} gradient="from-blue-500 to-blue-600" />
          <StatCard title="Total Clients" value={String(stats.totalClients)} icon={<Users className="h-5 w-5" />} gradient="from-emerald-500 to-emerald-600" />
          <StatCard title="Active Workers" value={String(stats.activeWorkers)} icon={<HardHat className="h-5 w-5" />} gradient="from-amber-500 to-amber-600" />
          <StatCard title="Monthly Revenue" value={formatCurrency(stats.monthlyRevenue)} icon={<DollarSign className="h-5 w-5" />} gradient="from-indigo-500 to-indigo-600" />
          <StatCard title="Monthly Expenses" value={formatCurrency(stats.monthlyExpenses)} icon={<Receipt className="h-5 w-5" />} gradient="from-rose-500 to-rose-600" />
          <StatCard title="Net Profit" value={formatCurrency(stats.netProfit)} icon={<TrendingUp className="h-5 w-5" />} gradient="from-purple-500 to-purple-600" trendUp={stats.netProfit >= 0} />
        </div>
      )}

      {showFull && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {statusBreakdown && statusBreakdown.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-indigo-500" /> Order Status Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {statusBreakdown.map((entry, i) => (<Cell key={`cell-${i}`} fill={entry.fill} />))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {topWorkers && topWorkers.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><HardHat className="h-5 w-5 text-amber-500" /> Top Workers This Month</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topWorkers} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} name="Pieces" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {incomeVsExpenses && incomeVsExpenses.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-500" /> Income vs Expenses (Last 6 Months)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={incomeVsExpenses} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                      <Legend />
                      <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
                      <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} name="Expenses" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {showFull && recentActivity && recentActivity.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-gray-500" /> Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center"><span className="text-xs font-medium text-indigo-600">{activity.user.name.charAt(0)}</span></div>
                    <div>
                      <p className="text-sm text-gray-900"><span className="font-medium">{activity.user.name}</span> {activity.action.toLowerCase().replace("_", " ")} a <span className="font-medium">{activity.entity}</span></p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{formatDate(activity.createdAt)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!showFull && (
        <Card>
          <CardContent className="py-12 text-center">
            <HardHat className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Your Workspace</h3>
            <p className="text-sm text-gray-500 mt-1">View your assignments and work progress from the sidebar navigation.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
