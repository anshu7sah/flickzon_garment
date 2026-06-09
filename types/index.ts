import type { Role } from "@prisma/client";

export type ActionResponse<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Record<string, boolean>;
}

export interface DashboardStats {
  activeOrders: number;
  totalClients: number;
  activeWorkers: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  netProfit: number;
}

export interface OrderWithRelations {
  id: string;
  orderNumber: string;
  clientId: string;
  description: string | null;
  totalPieces: number;
  deadline: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  client: { id: string; name: string };
  orderAssignments: {
    id: string;
    assignedPieces: number;
    completedPieces: number;
    worker: { id: string; name: string };
  }[];
  _count?: { payments: number };
}

export interface ClientWithRelations {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  paymentTerms: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { orders: number };
  payments: { amount: number }[];
  orders: { totalPieces: number; status: string }[];
}

export interface WorkerWithRelations {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  permissions: Record<string, boolean>;
  createdAt: Date;
  orderAssignments: {
    id: string;
    assignedPieces: number;
    completedPieces: number;
    order: { id: string; orderNumber: string; status: string };
  }[];
  wageConfigs: {
    id: string;
    wageType: string;
    ratePerPiece: number | null;
    dailyRate: number | null;
    monthlyRate: number | null;
    effectiveFrom: Date;
  }[];
  workerPayments: {
    id: string;
    amount: number;
    type: string;
    date: Date;
    note: string | null;
    status: string;
  }[];
}

export interface ChartDataPoint {
  name: string;
  value: number;
  fill?: string;
}

export interface MonthlyChartData {
  month: string;
  income: number;
  expenses: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
