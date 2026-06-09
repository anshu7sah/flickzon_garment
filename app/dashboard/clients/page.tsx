import { getClients } from "@/actions/clients";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";
import ClientsClient from "./clients-client";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const [clientsData, session] = await Promise.all([
    getClients({ page: Number(params.page ?? "1"), pageSize: Number(params.pageSize ?? "10"), search: params.search ?? "", sortBy: params.sortBy, sortOrder: (params.sortOrder as "asc" | "desc") ?? "desc" }),
    auth(),
  ]);
  const role = session?.user?.role as Role;
  const serialized = clientsData.data.map(c => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() }));
  return <ClientsClient clients={serialized} total={clientsData.total} page={clientsData.page} pageSize={clientsData.pageSize} role={role} searchValue={params.search ?? ""} />;
}
