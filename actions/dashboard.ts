"use server";

import { prisma } from "@/lib/prisma";

export async function getDashboardStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [activeOrders, totalClients, activeWorkers, monthlyPayments, monthlyExpenses] = await Promise.all([
    prisma.order.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] } } }),
    prisma.client.count(),
    prisma.user.count({ where: { role: "WORKER", isActive: true } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfMonth, lte: endOfMonth } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfMonth, lte: endOfMonth } } }),
  ]);

  const monthlyRevenue = monthlyPayments._sum.amount ?? 0;
  const monthlyExp = monthlyExpenses._sum.amount ?? 0;

  return { activeOrders, totalClients, activeWorkers, monthlyRevenue, monthlyExpenses: monthlyExp, netProfit: monthlyRevenue - monthlyExp };
}

export async function getOrderStatusBreakdown() {
  const statuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "DELIVERED", "CANCELLED"] as const;
  const counts = await Promise.all(statuses.map(async (status) => {
    const count = await prisma.order.count({ where: { status } });
    return { name: status.replace("_", " "), value: count, fill: getStatusFill(status) };
  }));
  return counts.filter((c) => c.value > 0);
}

function getStatusFill(status: string): string {
  const fills: Record<string, string> = { PENDING: "#f59e0b", IN_PROGRESS: "#3b82f6", COMPLETED: "#10b981", DELIVERED: "#8b5cf6", CANCELLED: "#ef4444" };
  return fills[status] ?? "#6b7280";
}

export async function getTopWorkers() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const workers = await prisma.user.findMany({
    where: { role: "WORKER", isActive: true },
    select: { id: true, name: true, orderAssignments: { select: { pieceLogs: { where: { status: "APPROVED", createdAt: { gte: startOfMonth } }, select: { pieces: true } } } } },
  });
  const workerPieces = workers.map((w) => {
    const totalPieces = w.orderAssignments.reduce((sum, oa) => sum + oa.pieceLogs.reduce((s, pl) => s + pl.pieces, 0), 0);
    return { name: w.name, value: totalPieces };
  }).filter((w) => w.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  return workerPieces;
}

export async function getIncomeVsExpenses() {
  const now = new Date();
  const months: { month: string; income: number; expenses: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthName = start.toLocaleString("en", { month: "short" });
    const [income, expenses] = await Promise.all([
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: start, lte: end } } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: start, lte: end } } }),
    ]);
    months.push({ month: monthName, income: income._sum.amount ?? 0, expenses: expenses._sum.amount ?? 0 });
  }
  return months;
}

export async function getRecentActivity() {
  return prisma.auditLog.findMany({ include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 });
}

export async function getFinanceOverview() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const [monthIncome, monthExpense, yearIncome, yearExpense] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfMonth, lte: endOfMonth } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfMonth, lte: endOfMonth } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfYear } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfYear } } }),
  ]);
  return {
    currentMonth: { income: monthIncome._sum.amount ?? 0, expenses: monthExpense._sum.amount ?? 0, profit: (monthIncome._sum.amount ?? 0) - (monthExpense._sum.amount ?? 0) },
    yearToDate: { income: yearIncome._sum.amount ?? 0, expenses: yearExpense._sum.amount ?? 0, profit: (yearIncome._sum.amount ?? 0) - (yearExpense._sum.amount ?? 0) },
  };
}

export async function getPayments(params: { page?: number; pageSize?: number; clientId?: string; dateFrom?: string; dateTo?: string }) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const skip = (page - 1) * pageSize;
  const where: Record<string, unknown> = {};
  if (params.clientId) where.clientId = params.clientId;
  if (params.dateFrom || params.dateTo) {
    where.date = {};
    if (params.dateFrom) (where.date as Record<string, unknown>).gte = new Date(params.dateFrom);
    if (params.dateTo) (where.date as Record<string, unknown>).lte = new Date(params.dateTo);
  }
  const [data, total] = await Promise.all([
    prisma.payment.findMany({ where, include: { client: { select: { name: true } }, order: { select: { orderNumber: true } } }, orderBy: { date: "desc" }, skip, take: pageSize }),
    prisma.payment.count({ where }),
  ]);
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getWorkerPayments(params: { page?: number; pageSize?: number; workerId?: string; type?: string; month?: string }) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const skip = (page - 1) * pageSize;
  const where: Record<string, unknown> = {};
  if (params.workerId) where.workerId = params.workerId;
  if (params.type) where.type = params.type;
  if (params.month) {
    const [year, month] = params.month.split("-").map(Number);
    where.date = { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0) };
  }
  const [data, total] = await Promise.all([
    prisma.workerPayment.findMany({ where, include: { worker: { select: { name: true } } }, orderBy: { date: "desc" }, skip, take: pageSize }),
    prisma.workerPayment.count({ where }),
  ]);
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
