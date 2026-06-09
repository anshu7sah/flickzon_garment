import { getFinanceOverview, getPayments, getWorkerPayments } from "@/actions/dashboard";
import { getExpenses } from "@/actions/expenses";
import { getAllClients } from "@/actions/clients";
import { getAllWorkers } from "@/actions/workers";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";
import FinanceClient from "./finance-client";

export default async function FinancePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const [overview, payments, workerPayments, expenses, clients, workers, session] = await Promise.all([
    getFinanceOverview(),
    getPayments({ page: Number(params.incomePage ?? "1"), pageSize: 10, clientId: params.clientId, dateFrom: params.dateFrom, dateTo: params.dateTo }),
    getWorkerPayments({ page: Number(params.payrollPage ?? "1"), pageSize: 10, workerId: params.workerId, type: params.payType, month: params.payMonth }),
    getExpenses({ page: Number(params.expensePage ?? "1"), pageSize: 10 }),
    getAllClients(),
    getAllWorkers(),
    auth(),
  ]);
  const role = session?.user?.role as Role;

  return (
    <FinanceClient
      overview={overview}
      payments={{ ...payments, data: payments.data.map(p => ({ ...p, date: p.date.toISOString(), createdAt: p.createdAt.toISOString() })) }}
      workerPayments={{ ...workerPayments, data: workerPayments.data.map(p => ({ ...p, date: p.date.toISOString(), createdAt: p.createdAt.toISOString() })) }}
      expenses={{ ...expenses, data: expenses.data.map(e => ({ ...e, date: e.date.toISOString(), createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString() })) }}
      clients={clients}
      workers={workers}
      role={role}
    />
  );
}
