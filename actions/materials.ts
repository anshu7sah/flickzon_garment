"use server";

import { prisma } from "@/lib/prisma";
import { withPermission, createAuditLog } from "@/actions/auth";
import type { ActionResponse } from "@/types";
import {
  createMaterialSchema,
  updateMaterialSchema,
  createClothTypeSchema,
  createFabricTypeSchema,
  addOrderMaterialSchema,
} from "@/lib/validations/materials";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

// ── Materials CRUD ────────────────────────────────────────────────────

export async function getMaterials(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
}) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;
  const skip = (page - 1) * pageSize;
  const where: Record<string, unknown> = {};
  if (params?.search) {
    where.name = { contains: params.search, mode: "insensitive" };
  }
  if (params?.type) {
    where.type = params.type;
  }
  const [data, total] = await Promise.all([
    prisma.material.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.material.count({ where }),
  ]);
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getAllMaterials() {
  return prisma.material.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createMaterial(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  return withPermission("create_edit_orders", async (userId) => {
    const parsed = createMaterialSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const material = await prisma.material.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        unit: parsed.data.unit,
        price: parsed.data.price,
        colors: parsed.data.colors as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    await createAuditLog(userId, "CREATE", "Material", material.id);
    revalidatePath("/dashboard/materials");
    return { success: true, data: { id: material.id } };
  });
}

export async function updateMaterial(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  return withPermission("create_edit_orders", async (userId) => {
    const parsed = updateMaterialSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const material = await prisma.material.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        unit: parsed.data.unit,
        price: parsed.data.price,
        colors: parsed.data.colors as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    await createAuditLog(userId, "UPDATE", "Material", material.id);
    revalidatePath("/dashboard/materials");
    return { success: true, data: { id: material.id } };
  });
}

export async function deleteMaterial(
  id: string
): Promise<ActionResponse<undefined>> {
  return withPermission("create_edit_orders", async (userId) => {
    const usedCount = await prisma.orderMaterial.count({
      where: { materialId: id },
    });
    if (usedCount > 0) {
      return {
        success: false,
        error: "Cannot delete material that is used in orders",
      };
    }
    await prisma.material.delete({ where: { id } });
    await createAuditLog(userId, "DELETE", "Material", id);
    revalidatePath("/dashboard/materials");
    return { success: true, data: undefined };
  });
}

// ── Cloth Types CRUD ──────────────────────────────────────────────────

export async function getClothTypes() {
  return prisma.clothType.findMany({
    include: { _count: { select: { orders: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createClothType(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  return withPermission("create_edit_orders", async (userId) => {
    const parsed = createClothTypeSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const existing = await prisma.clothType.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) {
      return { success: false, error: "Cloth type already exists" };
    }
    const ct = await prisma.clothType.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
      },
      select: { id: true },
    });
    await createAuditLog(userId, "CREATE", "ClothType", ct.id);
    revalidatePath("/dashboard/materials");
    return { success: true, data: { id: ct.id } };
  });
}

export async function deleteClothType(
  id: string
): Promise<ActionResponse<undefined>> {
  return withPermission("create_edit_orders", async (userId) => {
    const usedCount = await prisma.orderClothType.count({
      where: { clothTypeId: id },
    });
    if (usedCount > 0) {
      return {
        success: false,
        error: "Cannot delete cloth type used in orders",
      };
    }
    await prisma.clothType.delete({ where: { id } });
    await createAuditLog(userId, "DELETE", "ClothType", id);
    revalidatePath("/dashboard/materials");
    return { success: true, data: undefined };
  });
}

// ── Fabric Types CRUD ─────────────────────────────────────────────────

export async function getFabricTypes() {
  return prisma.fabricType.findMany({
    include: { _count: { select: { orders: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createFabricType(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  return withPermission("create_edit_orders", async (userId) => {
    const parsed = createFabricTypeSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const existing = await prisma.fabricType.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) {
      return { success: false, error: "Fabric type already exists" };
    }
    const ft = await prisma.fabricType.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
      },
      select: { id: true },
    });
    await createAuditLog(userId, "CREATE", "FabricType", ft.id);
    revalidatePath("/dashboard/materials");
    return { success: true, data: { id: ft.id } };
  });
}

export async function deleteFabricType(
  id: string
): Promise<ActionResponse<undefined>> {
  return withPermission("create_edit_orders", async (userId) => {
    const usedCount = await prisma.orderFabricType.count({
      where: { fabricTypeId: id },
    });
    if (usedCount > 0) {
      return {
        success: false,
        error: "Cannot delete fabric type used in orders",
      };
    }
    await prisma.fabricType.delete({ where: { id } });
    await createAuditLog(userId, "DELETE", "FabricType", id);
    revalidatePath("/dashboard/materials");
    return { success: true, data: undefined };
  });
}

// ── Order Material Management ─────────────────────────────────────────

export async function addOrderMaterial(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  return withPermission("create_edit_orders", async (userId) => {
    const parsed = addOrderMaterialSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const material = await prisma.material.findUnique({
      where: { id: parsed.data.materialId },
    });
    if (!material) {
      return { success: false, error: "Material not found" };
    }
    const totalCost = material.price * parsed.data.quantity;
    const om = await prisma.orderMaterial.create({
      data: {
        orderId: parsed.data.orderId,
        materialId: parsed.data.materialId,
        quantity: parsed.data.quantity,
        colorSelected: parsed.data.colorSelected || null,
        totalCost,
      },
      select: { id: true },
    });
    // Recalculate order financials
    await recalculateOrderFinancials(parsed.data.orderId);
    await createAuditLog(userId, "ADD_MATERIAL", "OrderMaterial", om.id, {
      orderId: parsed.data.orderId,
    });
    revalidatePath(`/dashboard/orders/${parsed.data.orderId}`);
    return { success: true, data: { id: om.id } };
  });
}

export async function removeOrderMaterial(
  id: string,
  orderId: string
): Promise<ActionResponse<undefined>> {
  return withPermission("create_edit_orders", async (userId) => {
    await prisma.orderMaterial.delete({ where: { id } });
    await recalculateOrderFinancials(orderId);
    await createAuditLog(userId, "REMOVE_MATERIAL", "OrderMaterial", id);
    revalidatePath(`/dashboard/orders/${orderId}`);
    return { success: true, data: undefined };
  });
}

// ── Financial Recalculation ───────────────────────────────────────────

export async function recalculateOrderFinancials(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderMaterials: true,
      expenses: true,
    },
  });
  if (!order) return;

  const totalOrderValue = order.rate * order.totalPieces;
  const materialCosts = order.orderMaterials.reduce(
    (sum, m) => sum + m.totalCost,
    0
  );
  const expenseCosts = order.expenses.reduce(
    (sum, e) => sum + e.amount,
    0
  );
  const totalInvestment = materialCosts + expenseCosts;
  const totalProfit = totalOrderValue - totalInvestment;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      totalOrderValue,
      totalInvestment,
      totalProfit,
    },
  });
}
