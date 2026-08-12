"use server";

import { prisma } from "@/lib/prisma";
import { withPermission, createAuditLog } from "@/actions/auth";
import type { ActionResponse } from "@/types";
import {
  createExtraDependencySchema,
  updateExtraDependencySchema,
} from "@/lib/validations/extra-dependencies";
import { recalculateOrderFinancials } from "@/actions/materials";
import { revalidatePath } from "next/cache";

export async function getExtraDependencies() {
  return prisma.extraDependency.findMany({
    include: { _count: { select: { orderExtraDeps: true } } },
    orderBy: { name: "asc" },
  });
}

export async function getAllExtraDependencies() {
  return prisma.extraDependency.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createExtraDependency(data: unknown): Promise<ActionResponse<{ id: string }>> {
  return withPermission("create_edit_orders", async (userId) => {
    const parsed = createExtraDependencySchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const existing = await prisma.extraDependency.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) {
      return { success: false, error: "Extra dependency with this name already exists" };
    }
    const item = await prisma.extraDependency.create({
      data: {
        name: parsed.data.name,
        defaultPrice: parsed.data.defaultPrice,
        description: parsed.data.description || null,
      },
      select: { id: true },
    });
    await createAuditLog(userId, "CREATE", "ExtraDependency", item.id);
    revalidatePath("/dashboard/materials");
    revalidatePath("/dashboard/orders");
    return { success: true, data: { id: item.id } };
  });
}

export async function updateExtraDependency(data: unknown): Promise<ActionResponse<{ id: string }>> {
  return withPermission("create_edit_orders", async (userId) => {
    const parsed = updateExtraDependencySchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const item = await prisma.extraDependency.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        defaultPrice: parsed.data.defaultPrice,
        description: parsed.data.description || null,
      },
      select: { id: true },
    });
    await createAuditLog(userId, "UPDATE", "ExtraDependency", item.id);
    revalidatePath("/dashboard/materials");
    revalidatePath("/dashboard/orders");
    return { success: true, data: { id: item.id } };
  });
}

export async function deleteExtraDependency(id: string): Promise<ActionResponse<undefined>> {
  return withPermission("create_edit_orders", async (userId) => {
    const usedCount = await prisma.orderExtraDependency.count({ where: { extraDependencyId: id } });
    if (usedCount > 0) {
      return { success: false, error: "Cannot delete dependency used in orders" };
    }
    await prisma.extraDependency.delete({ where: { id } });
    await createAuditLog(userId, "DELETE", "ExtraDependency", id);
    revalidatePath("/dashboard/materials");
    return { success: true, data: undefined };
  });
}

export async function addOrderExtraDependency(params: {
  orderId: string;
  extraDependencyId: string;
  quantity: number;
  price: number;
}): Promise<ActionResponse<{ id: string }>> {
  return withPermission("create_edit_orders", async (userId) => {
    const totalCost = params.quantity * params.price;
    const item = await prisma.orderExtraDependency.upsert({
      where: {
        orderId_extraDependencyId: {
          orderId: params.orderId,
          extraDependencyId: params.extraDependencyId,
        },
      },
      create: {
        orderId: params.orderId,
        extraDependencyId: params.extraDependencyId,
        quantity: params.quantity,
        price: params.price,
        totalCost,
      },
      update: {
        quantity: params.quantity,
        price: params.price,
        totalCost,
      },
      select: { id: true },
    });

    await recalculateOrderFinancials(params.orderId);
    await createAuditLog(userId, "ADD_EXTRA_DEP", "OrderExtraDependency", item.id);
    revalidatePath(`/dashboard/orders/${params.orderId}`);
    return { success: true, data: { id: item.id } };
  });
}

export async function removeOrderExtraDependency(id: string, orderId: string): Promise<ActionResponse<undefined>> {
  return withPermission("create_edit_orders", async (userId) => {
    await prisma.orderExtraDependency.delete({ where: { id } });
    await recalculateOrderFinancials(orderId);
    await createAuditLog(userId, "REMOVE_EXTRA_DEP", "OrderExtraDependency", id);
    revalidatePath(`/dashboard/orders/${orderId}`);
    return { success: true, data: undefined };
  });
}
