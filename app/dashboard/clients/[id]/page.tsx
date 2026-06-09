import { getClientById } from "@/actions/clients";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import type { Role } from "@prisma/client";
import ClientDetailClient from "./client-detail-client";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [client, session] = await Promise.all([getClientById(id), auth()]);
  if (!client) notFound();
  const role = session?.user?.role as Role;
  const serialized = {
    ...client,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
    orders: client.orders.map(o => ({ ...o, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString(), deadline: o.deadline?.toISOString() ?? null })),
    payments: client.payments.map(p => ({ ...p, createdAt: p.createdAt.toISOString(), date: p.date.toISOString(), order: p.order })),
  };
  return <ClientDetailClient client={serialized} role={role} />;
}
