import { getWorkers } from "@/actions/workers";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";
import WorkersClient from "./workers-client";

export default async function WorkersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const [workersData, session] = await Promise.all([
    getWorkers({ page: Number(params.page ?? "1"), pageSize: Number(params.pageSize ?? "10"), search: params.search ?? "", sortBy: params.sortBy, sortOrder: (params.sortOrder as "asc"|"desc") ?? "desc" }),
    auth(),
  ]);
  const role = session?.user?.role as Role;
  const serialized = workersData.data.map(w => ({ ...w, createdAt: w.createdAt.toISOString(), updatedAt: w.updatedAt.toISOString(), permissions: w.permissions as Record<string, boolean> }));
  return <WorkersClient workers={serialized} total={workersData.total} page={workersData.page} pageSize={workersData.pageSize} role={role} searchValue={params.search ?? ""} />;
}
