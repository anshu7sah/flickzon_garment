"use server";

import { prisma } from "@/lib/prisma";
import { withPermission, withAuth, createAuditLog } from "@/actions/auth";
import type { ActionResponse } from "@/types";
import { createWorkerSchema, updateWorkerSchema, workerPaymentSchema, wageConfigSchema } from "@/lib/validations/workers";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getWorkers(params: { page?: number; pageSize?: number; search?: string; sortBy?: string; sortOrder?: "asc" | "desc" }) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const skip = (page - 1) * pageSize;
  const where: Record<string, unknown> = { role: "WORKER" };
  if (params.search) {
    where.AND = [{ role: "WORKER" }, { OR: [{ name: { contains: params.search, mode: "insensitive" } }, { email: { contains: params.search, mode: "insensitive" } }] }];
    delete where.role;
  }
  const orderBy: Record<string, string> = params.sortBy ? { [params.sortBy]: params.sortOrder ?? "desc" } : { createdAt: "desc" };
  const [data, total] = await Promise.all([
    prisma.user.findMany({ where, include: { orderAssignments: { include: { order: { select: { id: true, orderNumber: true, status: true } } } }, wageConfigs: { orderBy: { effectiveFrom: "desc" }, take: 1 }, workerPayments: { select: { amount: true, type: true, status: true } } }, orderBy, skip, take: pageSize }),
    prisma.user.count({ where }),
  ]);
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getWorkerById(id: string) {
  return prisma.user.findUnique({ where: { id }, include: { orderAssignments: { include: { order: { select: { id: true, orderNumber: true, status: true, totalPieces: true } }, pieceLogs: { include: { loggedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } } } }, wageConfigs: { orderBy: { effectiveFrom: "desc" } }, workerPayments: { orderBy: { date: "desc" } } } });
}

export async function getAllWorkers() {
  return prisma.user.findMany({ where: { role: "WORKER", isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export async function createWorker(data: unknown): Promise<ActionResponse<{ id: string }>> {
  return withPermission("assign_workers", async (userId) => {
    const parsed = createWorkerSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return { success: false, error: "Email already in use" };
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const worker = await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash, role: "WORKER", permissions: { canLogPieces: true } as unknown as Prisma.InputJsonValue, wageConfigs: { create: { wageType: parsed.data.wageType, ratePerPiece: parsed.data.ratePerPiece, dailyRate: parsed.data.dailyRate, monthlyRate: parsed.data.monthlyRate } } }, select: { id: true } });
    await createAuditLog(userId, "CREATE", "Worker", worker.id);
    revalidatePath("/dashboard/workers");
    return { success: true, data: { id: worker.id } };
  });
}

export async function updateWorker(data: unknown): Promise<ActionResponse<{ id: string }>> {
  return withAuth(["ADMIN", "MANAGER"], async (userId) => {
    const parsed = updateWorkerSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const worker = await prisma.user.update({ where: { id: parsed.data.id }, data: { name: parsed.data.name, email: parsed.data.email, isActive: parsed.data.isActive }, select: { id: true } });
    await createAuditLog(userId, "UPDATE", "Worker", worker.id);
    revalidatePath("/dashboard/workers");
    revalidatePath(`/dashboard/workers/${worker.id}`);
    return { success: true, data: { id: worker.id } };
  });
}

export async function createWorkerPayment(data: unknown): Promise<ActionResponse<{ id: string }>> {
  return withPermission("worker_pay_management", async (userId) => {
    const parsed = workerPaymentSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const payment = await prisma.workerPayment.create({ data: { workerId: parsed.data.workerId, amount: parsed.data.amount, type: parsed.data.type, date: new Date(parsed.data.date), note: parsed.data.note, status: parsed.data.status ?? "PENDING" }, select: { id: true } });
    await createAuditLog(userId, "CREATE", "WorkerPayment", payment.id, { amount: parsed.data.amount });
    revalidatePath(`/dashboard/workers/${parsed.data.workerId}`);
    revalidatePath("/dashboard/finance");
    return { success: true, data: { id: payment.id } };
  });
}

export async function updateWageConfig(data: unknown): Promise<ActionResponse<{ id: string }>> {
  return withPermission("worker_pay_management", async (userId) => {
    const parsed = wageConfigSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const config = await prisma.workerWageConfig.create({ data: { workerId: parsed.data.workerId, wageType: parsed.data.wageType, ratePerPiece: parsed.data.ratePerPiece, dailyRate: parsed.data.dailyRate, monthlyRate: parsed.data.monthlyRate, effectiveFrom: new Date() }, select: { id: true } });
    await createAuditLog(userId, "UPDATE", "WageConfig", config.id);
    revalidatePath(`/dashboard/workers/${parsed.data.workerId}`);
    return { success: true, data: { id: config.id } };
  });
}
