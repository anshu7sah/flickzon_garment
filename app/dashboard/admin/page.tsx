import { getUsers, getAuditLogs } from "@/actions/admin";
import AdminClient from "./admin-client";

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const [usersData, auditData] = await Promise.all([
    getUsers({ page: Number(params.userPage ?? "1"), pageSize: 10, search: params.userSearch }),
    getAuditLogs({ page: Number(params.auditPage ?? "1"), pageSize: 20 }),
  ]);

  const serializedUsers = usersData.data.map(u => ({ ...u, createdAt: u.createdAt.toISOString(), permissions: u.permissions as Record<string, boolean> }));
  const serializedAuditLogs = auditData.data.map(a => ({ ...a, createdAt: a.createdAt.toISOString(), metadata: a.metadata as Record<string, unknown> }));

  return (
    <AdminClient
      users={{ ...usersData, data: serializedUsers }}
      auditLogs={{ ...auditData, data: serializedAuditLogs }}
    />
  );
}
