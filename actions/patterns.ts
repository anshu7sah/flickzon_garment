"use server";

import { prisma } from "@/lib/prisma";
import { withPermission, createAuditLog } from "@/actions/auth";
import type { ActionResponse } from "@/types";
import { createPatternSchema, updatePatternSchema } from "@/lib/validations/patterns";
import { revalidatePath } from "next/cache";

export async function getPatterns(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  clientId?: string;
}) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;
  const skip = (page - 1) * pageSize;
  const where: Record<string, unknown> = {};

  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params?.clientId) {
    where.clientId = params.clientId;
  }

  const [data, total] = await Promise.all([
    prisma.pattern.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { patternNumber: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.pattern.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getAllPatterns(clientId?: string) {
  const where = clientId ? { clientId } : {};
  return prisma.pattern.findMany({
    where,
    include: { client: { select: { id: true, name: true } } },
    orderBy: { patternNumber: "asc" },
  });
}

export async function createPattern(data: unknown): Promise<ActionResponse<{ id: string; patternNumber: number }>> {
  return withPermission("create_edit_orders", async (userId) => {
    const parsed = createPatternSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const pattern = await prisma.pattern.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        clientId: parsed.data.clientId,
      },
      select: { id: true, patternNumber: true },
    });
    await createAuditLog(userId, "CREATE", "Pattern", pattern.id);
    revalidatePath("/dashboard/patterns");
    revalidatePath("/dashboard/orders");
    return { success: true, data: { id: pattern.id, patternNumber: pattern.patternNumber } };
  });
}

export async function updatePattern(data: unknown): Promise<ActionResponse<{ id: string }>> {
  return withPermission("create_edit_orders", async (userId) => {
    const parsed = updatePatternSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const pattern = await prisma.pattern.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        clientId: parsed.data.clientId,
      },
      select: { id: true },
    });
    await createAuditLog(userId, "UPDATE", "Pattern", pattern.id);
    revalidatePath("/dashboard/patterns");
    revalidatePath("/dashboard/orders");
    return { success: true, data: { id: pattern.id } };
  });
}

export async function deletePattern(id: string): Promise<ActionResponse<undefined>> {
  return withPermission("create_edit_orders", async (userId) => {
    const usedCount = await prisma.order.count({ where: { patternId: id } });
    if (usedCount > 0) {
      return { success: false, error: "Cannot delete pattern that is used in existing orders" };
    }
    await prisma.pattern.delete({ where: { id } });
    await createAuditLog(userId, "DELETE", "Pattern", id);
    revalidatePath("/dashboard/patterns");
    revalidatePath("/dashboard/orders");
    return { success: true, data: undefined };
  });
}
