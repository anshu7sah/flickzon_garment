import { getExpenses, getExpenseCategories, getMonthlyExpensesByCategory } from "@/actions/expenses";
import { getAllOrders } from "@/actions/orders";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";
import ExpensesClient from "./expenses-client";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const [expensesData, categories, monthlyBreakdown, orders, session] = await Promise.all([
    getExpenses({
      page: Number(params.page ?? "1"),
      pageSize: Number(params.pageSize ?? "10"),
      search: params.search,
      categoryId: params.categoryId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder as "asc" | "desc",
    }),
    getExpenseCategories(),
    getMonthlyExpensesByCategory(),
    getAllOrders(),
    auth(),
  ]);
  const role = session?.user?.role as Role;
  const serializedExpenses = expensesData.data.map(e => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    date: e.date.toISOString(),
  }));
  const serializedCategories = categories.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    totalExpenses: c.expenses.reduce((s, e) => s + e.amount, 0),
    expenseCount: c._count.expenses,
  }));
  return (
    <ExpensesClient
      expenses={serializedExpenses}
      total={expensesData.total}
      page={expensesData.page}
      pageSize={expensesData.pageSize}
      categories={serializedCategories}
      monthlyBreakdown={monthlyBreakdown}
      orders={orders}
      role={role}
      searchValue={params.search ?? ""}
      initialOrderId={params.orderId ?? ""}
    />
  );
}
