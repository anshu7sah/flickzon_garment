"use server";

import { prisma } from "@/lib/prisma";
import { withPermission, createAuditLog } from "@/actions/auth";
import type { ActionResponse } from "@/types";
import {
  createClientSchema,
  updateClientSchema,
  createPaymentSchema,
} from "@/lib/validations/clients";
import { revalidatePath } from "next/cache";

export async function getClients(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { phone: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const orderBy: Record<string, string> = {};
  if (params.sortBy) {
    orderBy[params.sortBy] = params.sortOrder ?? "desc";
  } else {
    orderBy.createdAt = "desc";
  }

  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        _count: { select: { orders: true } },
        payments: { select: { amount: true } },
        orders: { select: { totalPieces: true, status: true } },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.client.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getClientById(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      orders: {
        include: {
          orderAssignments: {
            select: { assignedPieces: true, completedPieces: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      payments: {
        include: {
          order: { select: { orderNumber: true } },
        },
        orderBy: { date: "desc" },
      },
    },
  });
}

export async function getAllClients() {
  return prisma.client.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function createClient(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  return withPermission("client_management", async (userId) => {
    const parsed = createClientSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const client = await prisma.client.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        address: parsed.data.address,
        paymentTerms: parsed.data.paymentTerms,
      },
      select: { id: true },
    });

    await createAuditLog(userId, "CREATE", "Client", client.id);
    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard");

    return { success: true, data: { id: client.id } };
  });
}

export async function updateClient(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  return withPermission("client_management", async (userId) => {
    const parsed = updateClientSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const client = await prisma.client.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        address: parsed.data.address,
        paymentTerms: parsed.data.paymentTerms,
      },
      select: { id: true },
    });

    await createAuditLog(userId, "UPDATE", "Client", client.id);
    revalidatePath("/dashboard/clients");
    revalidatePath(`/dashboard/clients/${client.id}`);

    return { success: true, data: { id: client.id } };
  });
}

export async function deleteClient(
  id: string
): Promise<ActionResponse<undefined>> {
  return withPermission("client_management", async (userId) => {
    const orderCount = await prisma.order.count({
      where: { clientId: id },
    });

    if (orderCount > 0) {
      return {
        success: false,
        error: "Cannot delete client with existing orders",
      };
    }

    await prisma.client.delete({ where: { id } });
    await createAuditLog(userId, "DELETE", "Client", id);
    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard");

    return { success: true, data: undefined };
  });
}

export async function createPayment(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  return withPermission("income_payments", async (userId) => {
    const parsed = createPaymentSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const payment = await prisma.payment.create({
      data: {
        clientId: parsed.data.clientId,
        orderId: parsed.data.orderId || null,
        amount: parsed.data.amount,
        date: new Date(parsed.data.date),
        method: parsed.data.method,
        note: parsed.data.note,
      },
      select: { id: true },
    });

    await createAuditLog(userId, "CREATE", "Payment", payment.id, {
      amount: parsed.data.amount,
    });
    revalidatePath("/dashboard/clients");
    revalidatePath(`/dashboard/clients/${parsed.data.clientId}`);
    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard");

    return { success: true, data: { id: payment.id } };
  });
}
