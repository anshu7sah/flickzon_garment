"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import type { ActionResponse } from "@/types";
import { hasPermission, type Permission } from "@/lib/permissions";

export async function getSession() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  return session;
}

export async function withAuth<T>(
  roles: Role[],
  action: (userId: string, role: Role) => Promise<ActionResponse<T>>
): Promise<ActionResponse<T>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  const userRole = session.user.role as Role;

  if (roles.length > 0 && !roles.includes(userRole)) {
    return { success: false, error: "Insufficient permissions" };
  }

  return action(session.user.id, userRole);
}

export async function withPermission<T>(
  permission: Permission,
  action: (userId: string, role: Role) => Promise<ActionResponse<T>>
): Promise<ActionResponse<T>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  const userRole = session.user.role as Role;

  if (!hasPermission(userRole, permission)) {
    return { success: false, error: "Insufficient permissions" };
  }

  return action(session.user.id, userRole);
}

export async function createAuditLog(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      metadata: metadata as unknown as import("@prisma/client").Prisma.InputJsonValue,
    },
  });
}
