"use server";

import { prisma } from "@/lib/prisma";
import { withAuth, createAuditLog } from "@/actions/auth";
import type { ActionResponse } from "@/types";
import { createUserSchema, updateUserSchema, changePasswordSchema } from "@/lib/validations/admin";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function getUsers(params: { page?: number; pageSize?: number; search?: string }) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const skip = (page - 1) * pageSize;
  const where: Record<string, unknown> = {};
  if (params.search) {
    where.OR = [{ name: { contains: params.search, mode: "insensitive" } }, { email: { contains: params.search, mode: "insensitive" } }];
  }
  const [data, total] = await Promise.all([
    prisma.user.findMany({ where, select: { id: true, name: true, email: true, role: true, isActive: true, permissions: true, createdAt: true }, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
    prisma.user.count({ where }),
  ]);
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createUser(data: unknown): Promise<ActionResponse<{ id: string }>> {
  return withAuth(["ADMIN"], async (userId) => {
    const parsed = createUserSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return { success: false, error: "Email already in use" };
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash, role: parsed.data.role, permissions: { canLogPieces: parsed.data.role === "WORKER" } as unknown as Prisma.InputJsonValue }, select: { id: true } });
    await createAuditLog(userId, "CREATE", "User", user.id);
    revalidatePath("/dashboard/admin");
    return { success: true, data: { id: user.id } };
  });
}

export async function updateUser(data: unknown): Promise<ActionResponse<{ id: string }>> {
  return withAuth(["ADMIN"], async (userId) => {
    const parsed = updateUserSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const user = await prisma.user.update({ where: { id: parsed.data.id }, data: { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, isActive: parsed.data.isActive, permissions: parsed.data.permissions ? JSON.parse(JSON.stringify(parsed.data.permissions)) : undefined }, select: { id: true } });
    await createAuditLog(userId, "UPDATE", "User", user.id);
    revalidatePath("/dashboard/admin");
    return { success: true, data: { id: user.id } };
  });
}

export async function toggleUserPermission(userId: string, permission: string, value: boolean): Promise<ActionResponse<undefined>> {
  return withAuth(["ADMIN"], async (adminId) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { permissions: true } });
    if (!user) return { success: false, error: "User not found" };
    const perms = (user.permissions as Record<string, boolean>) ?? {};
    perms[permission] = value;
    await prisma.user.update({ where: { id: userId }, data: { permissions: perms as unknown as Prisma.InputJsonValue } });
    await createAuditLog(adminId, "TOGGLE_PERMISSION", "User", userId, { permission, value });
    revalidatePath("/dashboard/admin");
    return { success: true, data: undefined };
  });
}

export async function getAuditLogs(params: { page?: number; pageSize?: number }) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({ include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
    prisma.auditLog.count(),
  ]);
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function changePassword(data: unknown): Promise<ActionResponse<undefined>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const parsed = changePasswordSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!user) return { success: false, error: "User not found" };
  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!isValid) return { success: false, error: "Current password is incorrect" };
  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash: newHash } });
  await createAuditLog(session.user.id, "CHANGE_PASSWORD", "User", session.user.id);
  return { success: true, data: undefined };
}
