"use server";

import { prisma } from "@/lib/prisma";
import { withPermission, createAuditLog } from "@/actions/auth";
import type { ActionResponse } from "@/types";
import {
  createClientSchema,
  updateClientSchema,
  createPaymentSchema,
  createClientNoteSchema,
} from "@/lib/validations/clients";
import { generateClientCode } from "@/lib/utils";
import { revalidatePath } from "next/cache";

// ── Get Clients (List) ───────────────────────────────────────────────
export async function getClients(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: string;
  clientType?: string;
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
      { clientCode: { contains: params.search, mode: "insensitive" } },
      { companyName: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params.status) {
    where.status = params.status;
  }
  if (params.clientType) {
    where.clientType = params.clientType;
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
        orders: { select: { totalPieces: true, status: true, createdAt: true } },
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

// ── Get Client By ID ──────────────────────────────────────────────────
export async function getClientById(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      orders: {
        include: {
          orderAssignments: {
            select: { assignedPieces: true, completedPieces: true },
          },
          payments: { select: { amount: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      payments: {
        include: {
          order: { select: { orderNumber: true } },
        },
        orderBy: { date: "desc" },
      },
      notes: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

// ── Get All Clients (Minimal) ─────────────────────────────────────────
export async function getAllClients() {
  return prisma.client.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ── Duplicate Check ──────────────────────────────────────────────────
async function checkDuplicatePhone(phone: string, excludeId?: string) {
  const existing = await prisma.client.findFirst({
    where: {
      phone,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true },
  });
  return existing;
}

async function checkDuplicateEmail(email: string, excludeId?: string) {
  if (!email) return null;
  const existing = await prisma.client.findFirst({
    where: {
      email,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true },
  });
  return existing;
}

// ── Create Client ────────────────────────────────────────────────────
export async function createClient(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  return withPermission("client_management", async (userId) => {
    const parsed = createClientSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    // Duplicate phone check
    const dupPhone = await checkDuplicatePhone(parsed.data.phone);
    if (dupPhone) {
      return { success: false, error: `A client with this phone number already exists (${dupPhone.name})` };
    }

    // Duplicate email check
    if (parsed.data.email) {
      const dupEmail = await checkDuplicateEmail(parsed.data.email);
      if (dupEmail) {
        return { success: false, error: `A client with this email already exists (${dupEmail.name})` };
      }
    }

    const clientCode = parsed.data.clientCode || generateClientCode();

    const client = await prisma.client.create({
      data: {
        name: parsed.data.name,
        clientCode,
        clientType: parsed.data.clientType,
        companyName: parsed.data.companyName || null,
        status: parsed.data.status,
        phone: parsed.data.phone,
        secondaryPhone: parsed.data.secondaryPhone || null,
        whatsappNumber: parsed.data.whatsappNumber || null,
        email: parsed.data.email || null,
        website: parsed.data.website || null,
        country: parsed.data.country || null,
        state: parsed.data.state || null,
        city: parsed.data.city || null,
        postalCode: parsed.data.postalCode || null,
        address: parsed.data.address || null,
        contactPerson: parsed.data.contactPerson || null,
        designation: parsed.data.designation || null,
        taxNumber: parsed.data.taxNumber || null,
        businessRegNumber: parsed.data.businessRegNumber || null,
        paymentTerms: parsed.data.paymentTerms || null,
        creditLimit: parsed.data.creditLimit ?? 0,
        openingBalance: parsed.data.openingBalance ?? 0,
        currency: parsed.data.currency || "INR",
        preferredPaymentMethod: parsed.data.preferredPaymentMethod || null,
        preferredGarmentType: parsed.data.preferredGarmentType || null,
        preferredFabric: parsed.data.preferredFabric || null,
        preferredColour: parsed.data.preferredColour || null,
        preferredSizeChart: parsed.data.preferredSizeChart || null,
        preferredDeliveryMethod: parsed.data.preferredDeliveryMethod || null,
        internalNotes: parsed.data.internalNotes || null,
        specialInstructions: parsed.data.specialInstructions || null,
      },
      select: { id: true },
    });

    await createAuditLog(userId, "CREATE", "Client", client.id);
    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard");

    return { success: true, data: { id: client.id } };
  });
}

// ── Update Client ────────────────────────────────────────────────────
export async function updateClient(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  return withPermission("client_management", async (userId) => {
    const parsed = updateClientSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    // Duplicate phone check (exclude self)
    const dupPhone = await checkDuplicatePhone(parsed.data.phone, parsed.data.id);
    if (dupPhone) {
      return { success: false, error: `A client with this phone number already exists (${dupPhone.name})` };
    }

    // Duplicate email check (exclude self)
    if (parsed.data.email) {
      const dupEmail = await checkDuplicateEmail(parsed.data.email, parsed.data.id);
      if (dupEmail) {
        return { success: false, error: `A client with this email already exists (${dupEmail.name})` };
      }
    }

    const client = await prisma.client.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        clientCode: parsed.data.clientCode || undefined,
        clientType: parsed.data.clientType,
        companyName: parsed.data.companyName || null,
        status: parsed.data.status,
        phone: parsed.data.phone,
        secondaryPhone: parsed.data.secondaryPhone || null,
        whatsappNumber: parsed.data.whatsappNumber || null,
        email: parsed.data.email || null,
        website: parsed.data.website || null,
        country: parsed.data.country || null,
        state: parsed.data.state || null,
        city: parsed.data.city || null,
        postalCode: parsed.data.postalCode || null,
        address: parsed.data.address || null,
        contactPerson: parsed.data.contactPerson || null,
        designation: parsed.data.designation || null,
        taxNumber: parsed.data.taxNumber || null,
        businessRegNumber: parsed.data.businessRegNumber || null,
        paymentTerms: parsed.data.paymentTerms || null,
        creditLimit: parsed.data.creditLimit ?? 0,
        openingBalance: parsed.data.openingBalance ?? 0,
        currency: parsed.data.currency || "INR",
        preferredPaymentMethod: parsed.data.preferredPaymentMethod || null,
        preferredGarmentType: parsed.data.preferredGarmentType || null,
        preferredFabric: parsed.data.preferredFabric || null,
        preferredColour: parsed.data.preferredColour || null,
        preferredSizeChart: parsed.data.preferredSizeChart || null,
        preferredDeliveryMethod: parsed.data.preferredDeliveryMethod || null,
        internalNotes: parsed.data.internalNotes || null,
        specialInstructions: parsed.data.specialInstructions || null,
      },
      select: { id: true },
    });

    await createAuditLog(userId, "UPDATE", "Client", client.id);
    revalidatePath("/dashboard/clients");
    revalidatePath(`/dashboard/clients/${client.id}`);

    return { success: true, data: { id: client.id } };
  });
}

// ── Delete Client ────────────────────────────────────────────────────
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

// ── Create Payment ───────────────────────────────────────────────────
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

// ── Client Notes ─────────────────────────────────────────────────────
export async function createClientNote(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  return withPermission("client_management", async (userId) => {
    const parsed = createClientNoteSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const note = await prisma.clientNote.create({
      data: {
        clientId: parsed.data.clientId,
        content: parsed.data.content,
        createdBy: userId,
      },
      select: { id: true },
    });

    await createAuditLog(userId, "CREATE", "ClientNote", note.id);
    revalidatePath(`/dashboard/clients/${parsed.data.clientId}`);

    return { success: true, data: { id: note.id } };
  });
}

export async function deleteClientNote(
  noteId: string,
  clientId: string
): Promise<ActionResponse<undefined>> {
  return withPermission("client_management", async (userId) => {
    await prisma.clientNote.delete({ where: { id: noteId } });
    await createAuditLog(userId, "DELETE", "ClientNote", noteId);
    revalidatePath(`/dashboard/clients/${clientId}`);
    return { success: true, data: undefined };
  });
}

// ── Client Statistics ────────────────────────────────────────────────
export async function getClientStats(clientId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [orders, payments, monthPayments, yearPayments] = await Promise.all([
    prisma.order.findMany({
      where: { clientId },
      select: { status: true, totalPieces: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { clientId },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { clientId, date: { gte: startOfMonth } },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { clientId, date: { gte: startOfYear } },
    }),
  ]);

  const totalOrders = orders.length;
  const activeOrders = orders.filter(o => ["ORDER_PLACED", "CUTTING_IN_PROGRESS", "CUTTING_DONE", "STITCHING_IN_PROGRESS"].includes(o.status)).length;
  const completedOrders = orders.filter(o => o.status === "COMPLETED" || o.status === "DELIVERED").length;
  const cancelledOrders = orders.filter(o => o.status === "CANCELLED").length;
  const totalPiecesOrdered = orders.reduce((s, o) => s + o.totalPieces, 0);
  const totalPaymentsReceived = payments._sum.amount ?? 0;

  // Get the client's opening balance for outstanding calculation
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { openingBalance: true },
  });
  const openingBalance = client?.openingBalance ?? 0;

  return {
    totalOrders,
    activeOrders,
    completedOrders,
    cancelledOrders,
    totalRevenue: totalPaymentsReceived,
    totalPaymentsReceived,
    outstandingBalance: openingBalance - totalPaymentsReceived,
    averageOrderValue: totalOrders > 0 ? totalPaymentsReceived / totalOrders : 0,
    lastOrderDate: orders.length > 0 ? orders[0].createdAt.toISOString() : null,
    firstOrderDate: orders.length > 0 ? orders[orders.length - 1].createdAt.toISOString() : null,
    totalPiecesOrdered,
    totalRevenueThisMonth: monthPayments._sum.amount ?? 0,
    totalRevenueThisYear: yearPayments._sum.amount ?? 0,
  };
}

// ── Client Dashboard Statistics ───────────────────────────────────────
export async function getClientDashboardStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalClients, activeClients, newClientsThisMonth, allClients] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { status: "ACTIVE" } }),
    prisma.client.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.client.findMany({
      select: {
        id: true,
        name: true,
        clientType: true,
        openingBalance: true,
        createdAt: true,
        payments: { select: { amount: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Top clients by revenue
  const clientRevenues = allClients.map(c => ({
    id: c.id,
    name: c.name,
    revenue: c.payments.reduce((s, p) => s + p.amount, 0),
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Clients with outstanding
  const clientsWithOutstanding = allClients
    .map(c => ({
      id: c.id,
      name: c.name,
      outstanding: (c.openingBalance ?? 0) - c.payments.reduce((s, p) => s + p.amount, 0),
    }))
    .filter(c => c.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 5);

  // Recently added
  const recentlyAdded = allClients.slice(0, 5).map(c => ({
    id: c.id,
    name: c.name,
    clientType: c.clientType,
    createdAt: c.createdAt.toISOString(),
  }));

  return {
    totalClients,
    activeClients,
    newClientsThisMonth,
    topClientsByRevenue: clientRevenues,
    clientsWithOutstanding,
    recentlyAddedClients: recentlyAdded,
  };
}

// ── Client Revenue Data (for charts) ─────────────────────────────────
export async function getClientRevenueData(clientId: string) {
  const now = new Date();
  const months: { month: string; revenue: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthName = start.toLocaleString("en", { month: "short", year: "2-digit" });

    const result = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        clientId,
        date: { gte: start, lte: end },
      },
    });

    months.push({ month: monthName, revenue: result._sum.amount ?? 0 });
  }

  return months;
}

// ── Export Clients (CSV data) ─────────────────────────────────────────
export async function getClientsForExport() {
  const clients = await prisma.client.findMany({
    include: {
      _count: { select: { orders: true } },
      payments: { select: { amount: true } },
    },
    orderBy: { name: "asc" },
  });

  return clients.map(c => ({
    clientCode: c.clientCode ?? "",
    name: c.name,
    companyName: c.companyName ?? "",
    clientType: c.clientType,
    phone: c.phone ?? "",
    email: c.email ?? "",
    address: c.address ?? "",
    city: c.city ?? "",
    state: c.state ?? "",
    country: c.country ?? "",
    totalOrders: c._count.orders,
    totalPaid: c.payments.reduce((s, p) => s + p.amount, 0),
    outstandingBalance: (c.openingBalance ?? 0) - c.payments.reduce((s, p) => s + p.amount, 0),
    status: c.status,
    paymentTerms: c.paymentTerms ?? "",
    createdAt: c.createdAt.toISOString(),
  }));
}
