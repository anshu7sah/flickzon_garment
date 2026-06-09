"use server";

import { prisma } from "@/lib/prisma";
import { withPermission, createAuditLog } from "@/actions/auth";
import type { ActionResponse } from "@/types";
import { createOrderSchema, updateOrderSchema, assignWorkerSchema, logPiecesSchema, approvePieceLogSchema } from "@/lib/validations/orders";
import { generateOrderNumber } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function getOrders(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (params.search) {
    where.OR = [
      { orderNumber: { contains: params.search, mode: "insensitive" } },
      { client: { name: { contains: params.search, mode: "insensitive" } } },
      { description: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params.status) {
    where.status = params.status;
  }

  const orderBy: Record<string, string> = {};
  if (params.sortBy) {
    orderBy[params.sortBy] = params.sortOrder ?? "desc";
  } else {
    orderBy.createdAt = "desc";
  }

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        orderAssignments: {
          include: {
            worker: { select: { id: true, name: true } },
          },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getOrderById(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, phone: true, email: true } },
      orderAssignments: {
        include: {
          worker: { select: { id: true, name: true, email: true } },
          pieceLogs: {
            include: {
              loggedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return order;
}

export async function createOrder(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  return withPermission("create_edit_orders", async (userId) => {
    const parsed = createOrderSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        clientId: parsed.data.clientId,
        description: parsed.data.description,
        totalPieces: parsed.data.totalPieces,
        deadline: parsed.data.deadline
          ? new Date(parsed.data.deadline)
          : null,
      },
      select: { id: true },
    });

    await createAuditLog(userId, "CREATE", "Order", order.id, {
      orderNumber: order.id,
    });

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard");

    return { success: true, data: { id: order.id } };
  });
}

export async function updateOrder(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  return withPermission("create_edit_orders", async (userId) => {
    const parsed = updateOrderSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const order = await prisma.order.update({
      where: { id: parsed.data.id },
      data: {
        clientId: parsed.data.clientId,
        description: parsed.data.description,
        totalPieces: parsed.data.totalPieces,
        deadline: parsed.data.deadline
          ? new Date(parsed.data.deadline)
          : null,
        status: parsed.data.status,
      },
      select: { id: true },
    });

    await createAuditLog(userId, "UPDATE", "Order", order.id, {
      status: parsed.data.status,
    });

    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${order.id}`);
    revalidatePath("/dashboard");

    return { success: true, data: { id: order.id } };
  });
}

export async function deleteOrder(
  id: string
): Promise<ActionResponse<undefined>> {
  return withPermission("create_edit_orders", async (userId) => {
    await prisma.order.delete({ where: { id } });

    await createAuditLog(userId, "DELETE", "Order", id);

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard");

    return { success: true, data: undefined };
  });
}

export async function assignWorker(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  return withPermission("assign_workers", async (userId) => {
    const parsed = assignWorkerSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const existing = await prisma.orderAssignment.findUnique({
      where: {
        orderId_workerId: {
          orderId: parsed.data.orderId,
          workerId: parsed.data.workerId,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Worker is already assigned to this order" };
    }

    const assignment = await prisma.orderAssignment.create({
      data: {
        orderId: parsed.data.orderId,
        workerId: parsed.data.workerId,
        assignedPieces: parsed.data.assignedPieces,
      },
      select: { id: true },
    });

    await prisma.order.update({
      where: { id: parsed.data.orderId },
      data: { status: "IN_PROGRESS" },
    });

    await createAuditLog(userId, "ASSIGN_WORKER", "OrderAssignment", assignment.id, {
      orderId: parsed.data.orderId,
      workerId: parsed.data.workerId,
    });

    revalidatePath(`/dashboard/orders/${parsed.data.orderId}`);
    revalidatePath("/dashboard/orders");

    return { success: true, data: { id: assignment.id } };
  });
}

export async function removeAssignment(
  id: string
): Promise<ActionResponse<undefined>> {
  return withPermission("assign_workers", async (userId) => {
    const assignment = await prisma.orderAssignment.findUnique({
      where: { id },
      select: { orderId: true },
    });

    if (!assignment) {
      return { success: false, error: "Assignment not found" };
    }

    await prisma.orderAssignment.delete({ where: { id } });

    await createAuditLog(userId, "REMOVE_ASSIGNMENT", "OrderAssignment", id);

    revalidatePath(`/dashboard/orders/${assignment.orderId}`);
    revalidatePath("/dashboard/orders");

    return { success: true, data: undefined };
  });
}

export async function logPieces(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  const parsed = logPiecesSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { auth: getAuth } = await import("@/lib/auth");
  const session = await getAuth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;
  const userRole = session.user.role;
  const userPermissions = session.user.permissions as Record<string, boolean>;

  if (userRole === "WORKER" && !userPermissions?.canLogPieces) {
    return { success: false, error: "You do not have permission to log pieces" };
  }

  const pieceLog = await prisma.pieceLog.create({
    data: {
      orderAssignmentId: parsed.data.orderAssignmentId,
      loggedById: userId,
      pieces: parsed.data.pieces,
      note: parsed.data.note,
      status: "PENDING_APPROVAL",
    },
    select: { id: true, orderAssignment: { select: { orderId: true } } },
  });

  await createAuditLog(userId, "LOG_PIECES", "PieceLog", pieceLog.id, {
    pieces: parsed.data.pieces,
  });

  revalidatePath(
    `/dashboard/orders/${pieceLog.orderAssignment.orderId}`
  );
  revalidatePath("/dashboard");

  return { success: true, data: { id: pieceLog.id } };
}

export async function approvePieceLog(
  data: unknown
): Promise<ActionResponse<undefined>> {
  return withPermission("approve_piece_logs", async (userId) => {
    const parsed = approvePieceLogSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const pieceLog = await prisma.pieceLog.findUnique({
      where: { id: parsed.data.pieceLogId },
      select: {
        id: true,
        pieces: true,
        status: true,
        orderAssignment: {
          select: { id: true, orderId: true, completedPieces: true },
        },
      },
    });

    if (!pieceLog) {
      return { success: false, error: "Piece log not found" };
    }

    if (pieceLog.status !== "PENDING_APPROVAL") {
      return { success: false, error: "Piece log already processed" };
    }

    await prisma.pieceLog.update({
      where: { id: parsed.data.pieceLogId },
      data: {
        status: parsed.data.status,
        note: parsed.data.note ?? undefined,
      },
    });

    if (parsed.data.status === "APPROVED") {
      await prisma.orderAssignment.update({
        where: { id: pieceLog.orderAssignment.id },
        data: {
          completedPieces: {
            increment: pieceLog.pieces,
          },
        },
      });
    }

    await createAuditLog(userId, "APPROVE_PIECE_LOG", "PieceLog", pieceLog.id, {
      status: parsed.data.status,
    });

    revalidatePath(
      `/dashboard/orders/${pieceLog.orderAssignment.orderId}`
    );
    revalidatePath("/dashboard");

    return { success: true, data: undefined };
  });
}

export async function getPendingApprovals(): Promise<number> {
  const count = await prisma.pieceLog.count({
    where: { status: "PENDING_APPROVAL" },
  });
  return count;
}
