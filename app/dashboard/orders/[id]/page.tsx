import { getOrderById } from "@/actions/orders";
import { getAllWorkers } from "@/actions/workers";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import type { Role } from "@prisma/client";
import OrderDetailClient from "./order-detail-client";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, workers, session] = await Promise.all([getOrderById(id), getAllWorkers(), auth()]);
  if (!order) notFound();
  const role = session?.user?.role as Role;
  const userId = session?.user?.id ?? "";
  const permissions = (session?.user?.permissions ?? {}) as Record<string, boolean>;

  const serialized = {
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    deadline: order.deadline?.toISOString() ?? null,
    orderAssignments: order.orderAssignments.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      pieceLogs: a.pieceLogs.map(p => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })),
    })),
    payments: order.payments.map(p => ({ ...p, createdAt: p.createdAt.toISOString(), date: p.date.toISOString() })),
  };

  return <OrderDetailClient order={serialized} workers={workers} role={role} userId={userId} userPermissions={permissions} />;
}
