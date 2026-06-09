"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import type { Role } from "@prisma/client";

interface Overview { currentMonth: { income: number; expenses: number; profit: number }; yearToDate: { income: number; expenses: number; profit: number } }
interface PaymentItem { id: string; clientId: string; orderId: string | null; amount: number; date: string; method: string | null; note: string | null; createdAt: string; client: { name: string }; order: { orderNumber: string } | null }
interface WorkerPaymentItem { id: string; workerId: string; amount: number; type: string; date: string; note: string | null; status: string; createdAt: string; worker: { name: string } }
interface ExpenseItem { id: string; title: string; amount: number; date: string; category: { name: string; color: string } }

interface Props {
  overview: Overview;
  payments: { data: PaymentItem[]; total: number; page: number; pageSize: number };
  workerPayments: { data: WorkerPaymentItem[]; total: number; page: number; pageSize: number };
  expenses: { data: ExpenseItem[]; total: number; page: number; pageSize: number };
  clients: { id: string; name: string }[];
  workers: { id: string; name: string }[];
  role: Role;
}

export default function FinanceClient({ overview, payments, workerPayments, expenses }: Props) {
  const [tab, setTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Finance</h1><p className="text-sm text-gray-500 mt-1">Financial overview and transaction history</p></div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Current Month</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card><CardContent className="pt-6 flex items-center gap-4"><div className="rounded-xl bg-emerald-100 p-3"><TrendingUp className="h-6 w-6 text-emerald-600" /></div><div><p className="text-sm text-gray-500">Income</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(overview.currentMonth.income)}</p></div></CardContent></Card>
                <Card><CardContent className="pt-6 flex items-center gap-4"><div className="rounded-xl bg-red-100 p-3"><TrendingDown className="h-6 w-6 text-red-600" /></div><div><p className="text-sm text-gray-500">Expenses</p><p className="text-2xl font-bold text-red-600">{formatCurrency(overview.currentMonth.expenses)}</p></div></CardContent></Card>
                <Card><CardContent className="pt-6 flex items-center gap-4"><div className="rounded-xl bg-indigo-100 p-3"><Wallet className="h-6 w-6 text-indigo-600" /></div><div><p className="text-sm text-gray-500">Net Profit</p><p className={`text-2xl font-bold ${overview.currentMonth.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(overview.currentMonth.profit)}</p></div></CardContent></Card>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Year to Date</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card><CardContent className="pt-6 flex items-center gap-4"><div className="rounded-xl bg-emerald-100 p-3"><TrendingUp className="h-6 w-6 text-emerald-600" /></div><div><p className="text-sm text-gray-500">Income</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(overview.yearToDate.income)}</p></div></CardContent></Card>
                <Card><CardContent className="pt-6 flex items-center gap-4"><div className="rounded-xl bg-red-100 p-3"><TrendingDown className="h-6 w-6 text-red-600" /></div><div><p className="text-sm text-gray-500">Expenses</p><p className="text-2xl font-bold text-red-600">{formatCurrency(overview.yearToDate.expenses)}</p></div></CardContent></Card>
                <Card><CardContent className="pt-6 flex items-center gap-4"><div className="rounded-xl bg-indigo-100 p-3"><Wallet className="h-6 w-6 text-indigo-600" /></div><div><p className="text-sm text-gray-500">Net Profit</p><p className={`text-2xl font-bold ${overview.yearToDate.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(overview.yearToDate.profit)}</p></div></CardContent></Card>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="income">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-emerald-500" /> Client Payments</CardTitle></CardHeader>
            <CardContent>
              {payments.data.length === 0 ? <p className="text-sm text-gray-500 text-center py-8">No payments recorded.</p> : (
                <div className="space-y-2">{payments.data.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-gray-500">{p.client.name} {p.order ? `• ${p.order.orderNumber}` : ""} {p.method ? `• ${p.method}` : ""}</p>
                    </div>
                    <Badge variant="outline">{formatDate(p.date)}</Badge>
                  </div>
                ))}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-500" /> Expenses</CardTitle></CardHeader>
            <CardContent>
              {expenses.data.length === 0 ? <p className="text-sm text-gray-500 text-center py-8">No expenses recorded.</p> : (
                <div className="space-y-2">{expenses.data.map(e => (
                  <div key={e.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{e.title}</p>
                      <Badge style={{ backgroundColor: `${e.category.color}20`, color: e.category.color, borderColor: `${e.category.color}40` }} className="text-xs">{e.category.name}</Badge>
                    </div>
                    <div className="text-right"><p className="text-sm font-medium">{formatCurrency(e.amount)}</p><p className="text-xs text-gray-500">{formatDate(e.date)}</p></div>
                  </div>
                ))}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-indigo-500" /> Worker Payments</CardTitle></CardHeader>
            <CardContent>
              {workerPayments.data.length === 0 ? <p className="text-sm text-gray-500 text-center py-8">No worker payments.</p> : (
                <div className="space-y-2">{workerPayments.data.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.worker.name}</p>
                      <div className="flex items-center gap-2 mt-0.5"><Badge variant={p.type === "DEDUCTION" ? "destructive" : "outline"} className="text-xs">{p.type}</Badge><StatusBadge status={p.status} />{p.note && <span className="text-xs text-gray-400">{p.note}</span>}</div>
                    </div>
                    <div className="text-right"><p className="text-sm font-medium">{formatCurrency(p.amount)}</p><p className="text-xs text-gray-500">{formatDate(p.date)}</p></div>
                  </div>
                ))}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
