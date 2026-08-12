import { getOrderById } from "@/actions/orders";
import { getAllWorkers } from "@/actions/workers";
import { getAllMaterials } from "@/actions/materials";
import { getAllExtraDependencies } from "@/actions/extra-dependencies";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import type { Role } from "@prisma/client";
import OrderDetailClient from "./order-detail-client";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, workers, materials, allExtraDeps, session] = await Promise.all([
    getOrderById(id),
    getAllWorkers(),
    getAllMaterials(),
    getAllExtraDependencies(),
    auth(),
  ]);
  if (!order) notFound();
  const role = session?.user?.role as Role;
  const userId = session?.user?.id ?? "";
  const permissions = (session?.user?.permissions ?? {}) as Record<string, boolean>;

  const serialized = {
    ...order,
    imageUrls: (order.imageUrls as string[]) ?? [],
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
    expenses: order.expenses.map(e => ({ ...e, createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString(), date: e.date.toISOString() })),
    orderMaterials: order.orderMaterials.map(om => ({
      ...om,
      createdAt: om.createdAt.toISOString(),
      material: {
        ...om.material,
        colors: (om.material.colors as string[]) ?? [],
        createdAt: om.material.createdAt.toISOString(),
        updatedAt: om.material.updatedAt.toISOString(),
      },
    })),
    extraDependencies: (order.extraDependencies ?? []).map(ed => ({
      ...ed,
      createdAt: ed.createdAt.toISOString(),
    })),
  };

  const serializedMaterials = materials.map(m => ({
    ...m,
    colors: (m.colors as string[]) ?? [],
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  const serializedExtraDeps = allExtraDeps.map(ed => ({
    ...ed,
    createdAt: ed.createdAt.toISOString(),
  }));

  return (
    <OrderDetailClient
      order={serialized}
      workers={workers}
      materials={serializedMaterials}
      allExtraDependencies={serializedExtraDeps}
      role={role}
      userId={userId}
      userPermissions={permissions}
    />
  );
}
