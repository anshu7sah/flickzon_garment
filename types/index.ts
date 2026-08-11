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
  orderType: string;
  description: string | null;
  orderDescription: string | null;
  totalPieces: number;
  rate: number;
  deadline: Date | null;
  status: string;
  paymentMethod: string | null;
  paymentStatus: string;
  advanceAmount: number;
  totalOrderValue: number;
  totalInvestment: number;
  totalProfit: number;
  createdAt: Date;
  updatedAt: Date;
  client: { id: string; name: string };
  orderAssignments: {
    id: string;
    assignedPieces: number;
    completedPieces: number;
    worker: { id: string; name: string };
  }[];
  clothTypes: { id: string; clothType: { id: string; name: string } }[];
  fabricTypes: { id: string; fabricType: { id: string; name: string }; color: string | null }[];
  _count?: { expenses: number; orderMaterials: number };
}

export interface ClientWithRelations {
  id: string;
  name: string;
  clientCode: string | null;
  clientType: string;
  companyName: string | null;
  status: string;
  phone: string | null;
  secondaryPhone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  website: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  postalCode: string | null;
  address: string | null;
  contactPerson: string | null;
  designation: string | null;
  taxNumber: string | null;
  businessRegNumber: string | null;
  paymentTerms: string | null;
  creditLimit: number | null;
  openingBalance: number | null;
  currency: string | null;
  preferredPaymentMethod: string | null;
  preferredGarmentType: string | null;
  preferredFabric: string | null;
  preferredColour: string | null;
  preferredSizeChart: string | null;
  preferredDeliveryMethod: string | null;
  internalNotes: string | null;
  specialInstructions: string | null;
  profilePhotoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { orders: number };
  payments: { amount: number }[];
  orders: { totalPieces: number; status: string; createdAt: Date }[];
}

export interface ClientStats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalPaymentsReceived: number;
  outstandingBalance: number;
  averageOrderValue: number;
  lastOrderDate: string | null;
  firstOrderDate: string | null;
  totalPiecesOrdered: number;
  totalRevenueThisMonth: number;
  totalRevenueThisYear: number;
}

export interface SerializedClientNote {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientDashboardStats {
  totalClients: number;
  activeClients: number;
  newClientsThisMonth: number;
  topClientsByRevenue: { id: string; name: string; revenue: number }[];
  clientsWithOutstanding: { id: string; name: string; outstanding: number }[];
  recentlyAddedClients: { id: string; name: string; clientType: string; createdAt: string }[];
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

// ── Material Types ──────────────────────────────────────────────────

export interface MaterialItem {
  id: string;
  name: string;
  type: string;
  unit: string;
  price: number;
  colors: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClothTypeItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: { orders: number };
}

export interface FabricTypeItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: { orders: number };
}

export interface OrderMaterialItem {
  id: string;
  orderId: string;
  materialId: string;
  quantity: number;
  colorSelected: string | null;
  totalCost: number;
  createdAt: string;
  material: MaterialItem;
}
