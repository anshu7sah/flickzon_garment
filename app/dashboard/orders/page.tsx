import { getOrders } from "@/actions/orders";
import { getAllClients } from "@/actions/clients";
import { getClothTypes, getFabricTypes } from "@/actions/materials";
import { getAllPatterns } from "@/actions/patterns";
import { getAllExtraDependencies } from "@/actions/extra-dependencies";
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
  const status = params.status ?? "";
  const orderType = params.orderType ?? "";

  const [ordersData, clients, clothTypes, fabricTypes, patterns, extraDependencies, session] = await Promise.all([
    getOrders({ page, pageSize, search, sortBy, sortOrder, status, orderType }),
    getAllClients(),
    getClothTypes(),
    getFabricTypes(),
    getAllPatterns(),
    getAllExtraDependencies(),
    auth(),
  ]);

  const role = session?.user?.role as Role;

  const serializedOrders = ordersData.data.map(o => ({
    ...o,
    imageUrls: (o.imageUrls as string[]) ?? [],
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    deadline: o.deadline?.toISOString() ?? null,
  }));

  const serializedClothTypes = clothTypes.map(ct => ({
    id: ct.id,
    name: ct.name,
    description: ct.description,
    createdAt: ct.createdAt.toISOString(),
    _count: ct._count,
  }));

  const serializedFabricTypes = fabricTypes.map(ft => ({
    id: ft.id,
    name: ft.name,
    description: ft.description,
    createdAt: ft.createdAt.toISOString(),
    _count: ft._count,
  }));

  const serializedPatterns = patterns.map(p => ({
    id: p.id,
    patternNumber: p.patternNumber,
    name: p.name,
    description: p.description,
    clientId: p.clientId,
    createdAt: p.createdAt.toISOString(),
    client: p.client,
  }));

  const serializedExtraDependencies = extraDependencies.map(ed => ({
    id: ed.id,
    name: ed.name,
    defaultPrice: ed.defaultPrice,
    description: ed.description,
    createdAt: ed.createdAt.toISOString(),
  }));

  return (
    <OrdersClient
      orders={serializedOrders}
      total={ordersData.total}
      page={ordersData.page}
      pageSize={ordersData.pageSize}
      clients={clients}
      clothTypes={serializedClothTypes}
      fabricTypes={serializedFabricTypes}
      patterns={serializedPatterns}
      extraDependencies={serializedExtraDependencies}
      role={role}
      searchValue={search}
    />
  );
}
