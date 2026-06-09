import { Role } from "@prisma/client";

export type Permission =
  | "user_management"
  | "create_edit_orders"
  | "assign_workers"
  | "log_pieces_all"
  | "approve_piece_logs"
  | "client_management"
  | "expense_management"
  | "income_payments"
  | "worker_pay_management"
  | "view_own_work"
  | "dashboard_full";

const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    "user_management",
    "create_edit_orders",
    "assign_workers",
    "log_pieces_all",
    "approve_piece_logs",
    "client_management",
    "expense_management",
    "income_payments",
    "worker_pay_management",
    "view_own_work",
    "dashboard_full",
  ],
  MANAGER: [
    "create_edit_orders",
    "assign_workers",
    "log_pieces_all",
    "approve_piece_logs",
    "client_management",
    "expense_management",
    "income_payments",
    "worker_pay_management",
    "view_own_work",
    "dashboard_full",
  ],
  SUPERVISOR: [
    "log_pieces_all",
    "approve_piece_logs",
    "view_own_work",
  ],
  WORKER: ["view_own_work"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(
  role: Role,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function canAccessRoute(role: Role, path: string): boolean {
  const routePermissions: Record<string, Permission[]> = {
    "/dashboard/admin": ["user_management"],
    "/dashboard/orders": [
      "create_edit_orders",
      "view_own_work",
    ],
    "/dashboard/clients": ["client_management"],
    "/dashboard/workers": [
      "assign_workers",
      "view_own_work",
    ],
    "/dashboard/expenses": ["expense_management"],
    "/dashboard/finance": ["income_payments", "expense_management"],
    "/dashboard/settings": ["view_own_work"],
  };

  const requiredPermissions = routePermissions[path];
  if (!requiredPermissions) return true;

  return hasAnyPermission(role, requiredPermissions);
}

export function getUserPermissions(role: Role): Permission[] {
  return rolePermissions[role] ?? [];
}
