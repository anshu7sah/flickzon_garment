import { getOrders } from "@/actions/orders";
import { getAllClients } from "@/actions/clients";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";
import OrdersClient from "./orders-client";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const pageSize = Number(params.pageSize ?? "10");
  const search = params.search ?? "";
  const sortBy = params.sortBy ?? "";
  const sortOrder = (params.sortOrder ?? "desc") as "asc" | "desc";

  const [ordersData, clients, session] = await Promise.all([
    getOrders({ page, pageSize, search, sortBy, sortOrder }),
    getAllClients(),
    auth(),
  ]);

  const role = session?.user?.role as Role;

  const serializedOrders = ordersData.data.map(o => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    deadline: o.deadline?.toISOString() ?? null,
  }));

  return (
    <OrdersClient
      orders={serializedOrders}
      total={ordersData.total}
      page={ordersData.page}
      pageSize={ordersData.pageSize}
      clients={clients}
      role={role}
      searchValue={search}
    />
  );
}
