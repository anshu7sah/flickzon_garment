"use server";

import { prisma } from "@/lib/prisma";
import { withPermission, createAuditLog } from "@/actions/auth";
import type { ActionResponse } from "@/types";
import { createExpenseCategorySchema, createExpenseSchema, updateExpenseSchema } from "@/lib/validations/expenses";
import { revalidatePath } from "next/cache";
import { recalculateOrderFinancials } from "@/actions/materials";

export async function getExpenseCategories() {
  return prisma.expenseCategory.findMany({ include: { _count: { select: { expenses: true } }, expenses: { select: { amount: true } } }, orderBy: { name: "asc" } });
}

export async function createExpenseCategory(data: unknown): Promise<ActionResponse<{ id: string }>> {
  return withPermission("expense_management", async (userId) => {
    const parsed = createExpenseCategorySchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const cat = await prisma.expenseCategory.create({ data: { name: parsed.data.name, description: parsed.data.description, color: parsed.data.color }, select: { id: true } });
    await createAuditLog(userId, "CREATE", "ExpenseCategory", cat.id);
    revalidatePath("/dashboard/expenses");
    return { success: true, data: { id: cat.id } };
  });
}

export async function deleteExpenseCategory(id: string): Promise<ActionResponse<undefined>> {
  return withPermission("expense_management", async (userId) => {
    const count = await prisma.expense.count({ where: { categoryId: id } });
    if (count > 0) return { success: false, error: "Cannot delete category with expenses" };
    await prisma.expenseCategory.delete({ where: { id } });
    await createAuditLog(userId, "DELETE", "ExpenseCategory", id);
    revalidatePath("/dashboard/expenses");
    return { success: true, data: undefined };
  });
}

export async function getExpenses(params: { page?: number; pageSize?: number; search?: string; categoryId?: string; dateFrom?: string; dateTo?: string; sortBy?: string; sortOrder?: "asc" | "desc" }) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const skip = (page - 1) * pageSize;
  const where: Record<string, unknown> = {};
  if (params.search) where.title = { contains: params.search, mode: "insensitive" };
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.dateFrom || params.dateTo) {
    where.date = {};
    if (params.dateFrom) (where.date as Record<string, unknown>).gte = new Date(params.dateFrom);
    if (params.dateTo) (where.date as Record<string, unknown>).lte = new Date(params.dateTo);
  }
  const orderBy: Record<string, string> = params.sortBy ? { [params.sortBy]: params.sortOrder ?? "desc" } : { date: "desc" };
  const [data, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, color: true } },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
  ]);
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createExpense(data: unknown): Promise<ActionResponse<{ id: string }>> {
  return withPermission("expense_management", async (userId) => {
    const parsed = createExpenseSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const expense = await prisma.expense.create({
      data: {
        categoryId: parsed.data.categoryId,
        orderId: parsed.data.orderId || null,
        title: parsed.data.title,
        amount: parsed.data.amount,
        date: new Date(parsed.data.date),
        note: parsed.data.note,
      },
      select: { id: true },
    });
    // If linked to an order, recalculate that order's financials
    if (parsed.data.orderId) {
      await recalculateOrderFinancials(parsed.data.orderId);
      revalidatePath(`/dashboard/orders/${parsed.data.orderId}`);
    }
    await createAuditLog(userId, "CREATE", "Expense", expense.id, { amount: parsed.data.amount });
    revalidatePath("/dashboard/expenses");
    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard");
    return { success: true, data: { id: expense.id } };
  });
}

export async function updateExpense(data: unknown): Promise<ActionResponse<{ id: string }>> {
  return withPermission("expense_management", async (userId) => {
    const parsed = updateExpenseSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    // Get old expense to check if order changed
    const oldExpense = await prisma.expense.findUnique({ where: { id: parsed.data.id }, select: { orderId: true } });

    const expense = await prisma.expense.update({
      where: { id: parsed.data.id },
      data: {
        categoryId: parsed.data.categoryId,
        orderId: parsed.data.orderId || null,
        title: parsed.data.title,
        amount: parsed.data.amount,
        date: new Date(parsed.data.date),
        note: parsed.data.note,
      },
      select: { id: true },
    });

    // Recalculate old order if it changed
    if (oldExpense?.orderId && oldExpense.orderId !== parsed.data.orderId) {
      await recalculateOrderFinancials(oldExpense.orderId);
      revalidatePath(`/dashboard/orders/${oldExpense.orderId}`);
    }
    // Recalculate new order
    if (parsed.data.orderId) {
      await recalculateOrderFinancials(parsed.data.orderId);
      revalidatePath(`/dashboard/orders/${parsed.data.orderId}`);
    }

    await createAuditLog(userId, "UPDATE", "Expense", expense.id);
    revalidatePath("/dashboard/expenses");
    revalidatePath("/dashboard/finance");
    return { success: true, data: { id: expense.id } };
  });
}

export async function deleteExpense(id: string): Promise<ActionResponse<undefined>> {
  return withPermission("expense_management", async (userId) => {
    const expense = await prisma.expense.findUnique({ where: { id }, select: { orderId: true } });
    await prisma.expense.delete({ where: { id } });
    // Recalculate order if linked
    if (expense?.orderId) {
      await recalculateOrderFinancials(expense.orderId);
      revalidatePath(`/dashboard/orders/${expense.orderId}`);
    }
    await createAuditLog(userId, "DELETE", "Expense", id);
    revalidatePath("/dashboard/expenses");
    revalidatePath("/dashboard/finance");
    return { success: true, data: undefined };
  });
}

export async function getMonthlyExpensesByCategory() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const expenses = await prisma.expense.findMany({ where: { date: { gte: startOfMonth, lte: endOfMonth } }, include: { category: { select: { name: true, color: true } } } });
  const grouped: Record<string, { name: string; color: string; total: number }> = {};
  for (const e of expenses) {
    const key = e.category.name;
    if (!grouped[key]) grouped[key] = { name: key, color: e.category.color, total: 0 };
    grouped[key].total += e.amount;
  }
  return Object.values(grouped);
}
