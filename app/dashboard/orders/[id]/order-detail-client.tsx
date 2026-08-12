"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { hasPermission } from "@/lib/permissions";
import { formatDate, calculatePercentage, formatCurrency, formatStatusLabel } from "@/lib/utils";
import { assignWorker, removeAssignment, logPieces, approvePieceLog, updateOrder } from "@/actions/orders";
import { addOrderMaterial, removeOrderMaterial } from "@/actions/materials";
import { addOrderExtraDependency, removeOrderExtraDependency } from "@/actions/extra-dependencies";
import { toast } from "sonner";
import {
  UserPlus, Trash2, CheckCircle, XCircle, ArrowLeft, Package, Clock, Edit,
  DollarSign, TrendingUp, TrendingDown, Layers, Plus, Receipt, AlertCircle, Shirt,
  Sparkles, Image as ImageIcon, Wrench
} from "lucide-react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import type { MaterialItem, ExtraDependencyItem } from "@/types";

interface PieceLogSerialized {
  id: string;
  orderAssignmentId: string;
  loggedById: string;
  pieces: number;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  loggedBy: { id: string; name: string };
}

interface AssignmentSerialized {
  id: string;
  orderId: string;
  workerId: string;
  assignedPieces: number;
  completedPieces: number;
  createdAt: string;
  updatedAt: string;
  worker: { id: string; name: string; email: string };
  pieceLogs: PieceLogSerialized[];
}

interface OrderMaterialSerialized {
  id: string;
  orderId: string;
  materialId: string;
  quantity: number;
  colorSelected: string | null;
  totalCost: number;
  createdAt: string;
  material: MaterialItem;
}

interface OrderExtraDependencySerialized {
  id: string;
  orderId: string;
  extraDependencyId: string;
  quantity: number;
  price: number;
  totalCost: number;
  createdAt: string;
  extraDependency: { id: string; name: string };
}

interface ExpenseSerialized {
  id: string;
  categoryId: string;
  orderId: string | null;
  title: string;
  amount: number;
  date: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; color: string };
}

interface OrderSerialized {
  id: string;
  orderNumber: string;
  clientId: string;
  patternId?: string | null;
  orderType: string;
  description: string | null;
  orderDescription: string | null;
  totalPieces: number;
  rate: number;
  deadline: string | null;
  status: string;
  paymentMethod: string | null;
  paymentStatus: string;
  advanceAmount: number;
  totalOrderValue: number;
  totalInvestment: number;
  totalProfit: number;
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; phone: string | null; email: string | null };
  pattern?: { id: string; patternNumber: number; name: string; description: string | null } | null;
  orderAssignments: AssignmentSerialized[];
  payments: { id: string; amount: number; date: string; method: string | null; note: string | null; createdAt: string }[];
  expenses: ExpenseSerialized[];
  orderMaterials: OrderMaterialSerialized[];
  extraDependencies: OrderExtraDependencySerialized[];
  clothTypes: { id: string; clothType: { id: string; name: string } }[];
  fabricTypes: { id: string; fabricType: { id: string; name: string }; color: string | null }[];
}

interface Props {
  order: OrderSerialized;
  workers: { id: string; name: string }[];
  materials: MaterialItem[];
  allExtraDependencies?: ExtraDependencyItem[];
  role: Role;
  userId: string;
  userPermissions: Record<string, boolean>;
}

const ORDER_STATUSES = [
  { value: "ORDER_PLACED", label: "Order Placed" },
  { value: "CUTTING_IN_PROGRESS", label: "Cutting In Progress" },
  { value: "CUTTING_DONE", label: "Cutting Done" },
  { value: "STITCHING_IN_PROGRESS", label: "Stitching In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function OrderDetailClient({
  order,
  workers,
  materials,
  allExtraDependencies = [],
  role,
  userId,
  userPermissions,
}: Props) {
  const router = useRouter();
  const [showAssign, setShowAssign] = useState(false);
  const [showLogPieces, setShowLogPieces] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showAddExtraDep, setShowAddExtraDep] = useState(false);

  const [assignData, setAssignData] = useState({ workerId: "", assignedPieces: "" });
  const [logData, setLogData] = useState({ pieces: "", note: "" });
  const [materialData, setMaterialData] = useState({ materialId: "", quantity: "", colorSelected: "" });
  const [extraDepData, setExtraDepData] = useState({ extraDependencyId: "", quantity: "1", price: "" });
  const [editStatus, setEditStatus] = useState(order.status);
  const [loading, setLoading] = useState(false);

  const canAssign = hasPermission(role, "assign_workers");
  const canApprove = hasPermission(role, "approve_piece_logs");
  const canEdit = hasPermission(role, "create_edit_orders");
  const canLogAll = hasPermission(role, "log_pieces_all");
  const canWorkerLog = role === "WORKER" && userPermissions?.canLogPieces;

  const totalCompleted = order.orderAssignments.reduce((s, a) => s + a.completedPieces, 0);
  const totalAssigned = order.orderAssignments.reduce((s, a) => s + a.assignedPieces, 0);
  const remainingUnassigned = Math.max(0, order.totalPieces - totalAssigned);
  const completionPct = calculatePercentage(totalCompleted, order.totalPieces);

  const selectedMaterialObj = materials.find((m) => m.id === materialData.materialId);

  const handleAssign = async () => {
    const piecesNum = Number(assignData.assignedPieces);
    if (piecesNum > remainingUnassigned) {
      toast.error(`Cannot assign ${piecesNum} pieces. Only ${remainingUnassigned} pieces available.`);
      return;
    }
    setLoading(true);
    const result = await assignWorker({ orderId: order.id, workerId: assignData.workerId, assignedPieces: piecesNum });
    setLoading(false);
    if (result.success) {
      toast.success("Worker assigned");
      setShowAssign(false);
      setAssignData({ workerId: "", assignedPieces: "" });
      router.refresh();
    } else toast.error(result.error);
  };

  const handleRemoveAssignment = async (id: string) => {
    const result = await removeAssignment(id);
    if (result.success) { toast.success("Assignment removed"); router.refresh(); } else toast.error(result.error);
  };

  const handleLogPieces = async () => {
    if (!showLogPieces) return;
    setLoading(true);
    const result = await logPieces({ orderAssignmentId: showLogPieces, pieces: Number(logData.pieces), note: logData.note || undefined });
    setLoading(false);
    if (result.success) {
      toast.success("Pieces logged — pending approval");
      setShowLogPieces(null);
      setLogData({ pieces: "", note: "" });
      router.refresh();
    } else toast.error(result.error);
  };

  const handleApprove = async (pieceLogId: string, status: "APPROVED" | "REJECTED") => {
    const result = await approvePieceLog({ pieceLogId, status });
    if (result.success) { toast.success(`Piece log ${status.toLowerCase()}`); router.refresh(); } else toast.error(result.error);
  };

  const handleUpdateStatus = async () => {
    setLoading(true);
    const result = await updateOrder({
      id: order.id,
      clientId: order.clientId,
      orderType: order.orderType,
      totalPieces: order.totalPieces,
      rate: order.rate,
      status: editStatus,
      description: order.description ?? undefined,
      orderDescription: order.orderDescription ?? undefined,
      deadline: order.deadline ?? undefined,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      advanceAmount: order.advanceAmount,
      clothTypeIds: order.clothTypes.map((c) => c.clothType.id),
      fabricTypeIds: order.fabricTypes.map((f) => f.fabricType.id),
    });
    setLoading(false);
    if (result.success) { toast.success("Order status updated"); setShowEdit(false); router.refresh(); } else toast.error(result.error);
  };

  const handleAddMaterial = async () => {
    setLoading(true);
    const result = await addOrderMaterial({
      orderId: order.id,
      materialId: materialData.materialId,
      quantity: Number(materialData.quantity),
      colorSelected: materialData.colorSelected || undefined,
    });
    setLoading(false);
    if (result.success) {
      toast.success("Material added to order");
      setShowAddMaterial(false);
      setMaterialData({ materialId: "", quantity: "", colorSelected: "" });
      router.refresh();
    } else toast.error(result.error);
  };

  const handleRemoveMaterial = async (materialAssignmentId: string) => {
    const result = await removeOrderMaterial(materialAssignmentId, order.id);
    if (result.success) { toast.success("Material removed"); router.refresh(); } else toast.error(result.error);
  };

  const handleAddExtraDep = async () => {
    if (!extraDepData.extraDependencyId) {
      toast.error("Select a dependency");
      return;
    }
    setLoading(true);
    const result = await addOrderExtraDependency({
      orderId: order.id,
      extraDependencyId: extraDepData.extraDependencyId,
      quantity: Number(extraDepData.quantity) || 1,
      price: Number(extraDepData.price) || 0,
    });
    setLoading(false);
    if (result.success) {
      toast.success("Extra dependency added");
      setShowAddExtraDep(false);
      setExtraDepData({ extraDependencyId: "", quantity: "1", price: "" });
      router.refresh();
    } else toast.error(result.error);
  };

  const handleRemoveExtraDep = async (extraDepAssignmentId: string) => {
    const result = await removeOrderExtraDependency(extraDepAssignmentId, order.id);
    if (result.success) { toast.success("Extra dependency removed"); router.refresh(); } else toast.error(result.error);
  };

  const availableWorkers = workers.filter(w => !order.orderAssignments.some(a => a.workerId === w.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/orders">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
              {order.pattern && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 font-semibold">
                  <Sparkles className="h-3 w-3" /> Pattern #{order.pattern.patternNumber}
                </Badge>
              )}
              <StatusBadge status={order.status} />
              <Badge variant="outline">{formatStatusLabel(order.orderType)}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Created on {formatDate(order.createdAt)} • Client: <span className="font-medium">{order.client.name}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" onClick={() => setShowEdit(true)} className="gap-2">
              <Edit className="h-4 w-4" /> Edit Status
            </Button>
          )}
          {canAssign && (
            <Button onClick={() => setShowAssign(true)} disabled={remainingUnassigned <= 0} className="gap-2">
              <UserPlus className="h-4 w-4" /> Assign Worker ({remainingUnassigned} left)
            </Button>
          )}
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Total Pieces</p><p className="text-2xl font-bold">{order.totalPieces.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold">{totalCompleted.toLocaleString()} <span className="text-sm font-normal text-gray-400">({completionPct}%)</span></p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Assigned / Total</p><p className="text-2xl font-bold">{totalAssigned} / {order.totalPieces}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Deadline</p><p className="text-2xl font-bold">{order.deadline ? formatDate(order.deadline) : "None"}</p></CardContent></Card>
      </div>

      {/* Financials & Analytics Summary Card */}
      <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-white">
        <CardHeader><CardTitle className="flex items-center gap-2 text-indigo-900"><DollarSign className="h-5 w-5 text-indigo-600" /> Financial Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">Rate / Piece</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(order.rate)}</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">Total Order Value</p>
              <p className="text-lg font-bold text-indigo-600">{formatCurrency(order.totalOrderValue)}</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">Total Investment</p>
              <p className="text-lg font-bold text-orange-600">{formatCurrency(order.totalInvestment)}</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">Net Profit</p>
              <p className={`text-lg font-bold ${order.totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatCurrency(order.totalProfit)}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">Advance Paid</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(order.advanceAmount)}</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500">Payment Status</p>
              <div className="mt-1"><StatusBadge status={order.paymentStatus} /></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pattern Card */}
      {order.pattern && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between text-amber-900">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600" /> Pattern Details (Auto-Generated / Linked)
              </span>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                Pattern #{order.pattern.patternNumber}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-amber-900 space-y-1">
            <p><span className="font-semibold">Pattern Title:</span> {order.pattern.name}</p>
            {order.pattern.description && <p><span className="font-semibold">Description:</span> {order.pattern.description}</p>}
            <p className="text-[11px] text-amber-700 italic">This pattern number can be selected for future re-orders by {order.client.name}.</p>
          </CardContent>
        </Card>
      )}

      {/* Order Progress Photos (Cloudinary) */}
      {order.imageUrls && order.imageUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-5 w-5 text-purple-600" /> Piece Progress & Sample Photos ({order.imageUrls.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {order.imageUrls.map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noreferrer" className="block group aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-100 relative">
                  <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity">
                    View Photo
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description & Cloth/Fabric Types */}
      {(order.description || order.orderDescription || order.clothTypes.length > 0 || order.fabricTypes.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Garment Details & Specifications</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {order.clothTypes.length > 0 || order.fabricTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-gray-500 uppercase mr-2">Cloth & Fabric:</span>
                {order.clothTypes.map((c) => (
                  <Badge key={c.id} className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                    <Shirt className="h-3 w-3" /> {c.clothType.name}
                  </Badge>
                ))}
                {order.fabricTypes.map((f) => (
                  <Badge key={f.id} className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
                    <Layers className="h-3 w-3" /> {f.fabricType.name} {f.color && `(${f.color})`}
                  </Badge>
                ))}
              </div>
            ) : null}

            {order.description && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Title / Summary</p>
                <p className="text-sm text-gray-700">{order.description}</p>
              </div>
            )}

            {order.orderDescription && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Full Order Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 border border-gray-100">{order.orderDescription}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Extra Dependencies Section (Kaaj button, DTF order, DTF heat, etc.) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-indigo-600" /> Extra Dependencies (Kaaj button, DTF order, DTF heat...) ({order.extraDependencies?.length || 0})
          </CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setShowAddExtraDep(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Dependency
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!order.extraDependencies || order.extraDependencies.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No extra dependencies attached to this order.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {order.extraDependencies.map((ed) => (
                <div key={ed.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-indigo-50 flex items-center justify-center">
                      <Wrench className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{ed.extraDependency.name}</p>
                      <p className="text-xs text-gray-500">
                        Qty: {ed.quantity} @ {formatCurrency(ed.price)} each
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-indigo-700">{formatCurrency(ed.totalCost)}</span>
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleRemoveExtraDep(ed.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Materials Used Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-600" /> Required Materials ({order.orderMaterials.length})
          </CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setShowAddMaterial(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Material
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {order.orderMaterials.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No materials added to this order yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {order.orderMaterials.map((om) => (
                <div key={om.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-purple-50 flex items-center justify-center">
                      <Layers className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{om.material.name}</p>
                      <p className="text-xs text-gray-500">
                        {om.quantity} {om.material.unit} @ {formatCurrency(om.material.price)}/{om.material.unit}
                        {om.colorSelected && (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-full border border-gray-300" style={{ backgroundColor: om.colorSelected }} />
                            {om.colorSelected}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-gray-900">{formatCurrency(om.totalCost)}</span>
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleRemoveMaterial(om.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Expenses Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-orange-600" /> Order Expenses ({order.expenses.length})
          </CardTitle>
          <Link href={`/dashboard/expenses?orderId=${order.id}`}>
            <Button size="sm" variant="ghost" className="text-xs">Manage Expenses</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {order.expenses.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No expenses linked to this order.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {order.expenses.map((exp) => (
                <div key={exp.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{exp.title}</p>
                    <p className="text-xs text-gray-500">
                      <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: exp.category.color }} />
                      {exp.category.name} • {formatDate(exp.date)}
                    </p>
                  </div>
                  <span className="font-semibold text-sm text-orange-600">{formatCurrency(exp.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Worker Piece Assignments Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-500" /> Worker Piece Tracking
          </CardTitle>
          <span className="text-xs font-medium text-gray-500">
            {remainingUnassigned > 0 ? (
              <span className="text-amber-600 font-semibold">{remainingUnassigned} pieces remaining to assign</span>
            ) : (
              <span className="text-emerald-600 font-semibold">All {order.totalPieces} pieces assigned</span>
            )}
          </span>
        </CardHeader>
        <CardContent>
          {order.orderAssignments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 mb-3">No workers assigned to this order yet.</p>
              {canAssign && (
                <Button size="sm" onClick={() => setShowAssign(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" /> Assign First Worker
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {order.orderAssignments.map((assignment) => {
                const pct = calculatePercentage(assignment.completedPieces, assignment.assignedPieces);
                const isOwnAssignment = assignment.workerId === userId;

                // Enforced piece log limit calculation
                const loggedOrPending = assignment.pieceLogs
                  .filter((l) => l.status === "APPROVED" || l.status === "PENDING_APPROVAL")
                  .reduce((sum, l) => sum + l.pieces, 0);

                return (
                  <div key={assignment.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900">{assignment.worker.name}</p>
                        <p className="text-xs text-gray-500">{assignment.worker.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(canLogAll || (canWorkerLog && isOwnAssignment)) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowLogPieces(assignment.id)}
                            disabled={loggedOrPending >= assignment.assignedPieces}
                          >
                            {loggedOrPending >= assignment.assignedPieces ? "Limit Reached" : "Log Pieces"}
                          </Button>
                        )}
                        {canAssign && (
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleRemoveAssignment(assignment.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {assignment.completedPieces}/{assignment.assignedPieces} ({pct}%)
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-100 pt-2">
                      <span>Logged / Pending: <strong className="text-gray-800">{loggedOrPending} / {assignment.assignedPieces} max assigned</strong></span>
                      {loggedOrPending >= assignment.assignedPieces && (
                        <span className="text-amber-600 font-medium">Worker cannot log beyond {assignment.assignedPieces} pcs limit</span>
                      )}
                    </div>

                    {/* Piece Logs History */}
                    {assignment.pieceLogs.length > 0 && (
                      <div className="border-t border-gray-100 pt-3 mt-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Piece Logs History</p>
                        <div className="space-y-2">
                          {assignment.pieceLogs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-gray-50">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium">{log.pieces} pcs</span>
                                <span className="text-xs text-gray-400">by {log.loggedBy.name}</span>
                                <span className="text-xs text-gray-400">{formatDate(log.createdAt)}</span>
                                <StatusBadge status={log.status} />
                              </div>
                              {canApprove && log.status === "PENDING_APPROVAL" && (
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="ghost" className="text-emerald-600 h-7" onClick={() => handleApprove(log.id, "APPROVED")}>
                                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-red-500 h-7" onClick={() => handleApprove(log.id, "REJECTED")}>
                                    <XCircle className="h-4 w-4 mr-1" /> Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Worker Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent onClose={() => setShowAssign(false)}>
          <DialogHeader><DialogTitle>Assign Worker to Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800">
              <span className="font-semibold">{remainingUnassigned} pieces</span> remaining out of {order.totalPieces} total pieces.
            </div>
            <div className="space-y-2">
              <Label>Worker</Label>
              <Select options={availableWorkers.map((w) => ({ value: w.id, label: w.name }))} placeholder="Select worker" value={assignData.workerId} onChange={(e) => setAssignData((d) => ({ ...d, workerId: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Pieces to Assign (max {remainingUnassigned})</Label>
              <Input type="number" max={remainingUnassigned} value={assignData.assignedPieces} onChange={(e) => setAssignData((d) => ({ ...d, assignedPieces: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={loading}>{loading ? "Assigning..." : "Assign Worker"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Pieces Dialog */}
      <Dialog open={!!showLogPieces} onOpenChange={() => setShowLogPieces(null)}>
        <DialogContent onClose={() => setShowLogPieces(null)}>
          <DialogHeader><DialogTitle>Log Finished Pieces</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pieces Completed</Label>
              <Input type="number" value={logData.pieces} onChange={(e) => setLogData((d) => ({ ...d, pieces: e.target.value }))} placeholder="Number of pieces finished" />
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea value={logData.note} onChange={(e) => setLogData((d) => ({ ...d, note: e.target.value }))} placeholder="Any notes on stitching/cutting..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogPieces(null)}>Cancel</Button>
            <Button onClick={handleLogPieces} disabled={loading}>{loading ? "Submitting..." : "Submit Log"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Extra Dependency Dialog */}
      <Dialog open={showAddExtraDep} onOpenChange={setShowAddExtraDep}>
        <DialogContent onClose={() => setShowAddExtraDep(false)}>
          <DialogHeader><DialogTitle>Add Extra Dependency</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Extra Dependency</Label>
              <Select
                options={allExtraDependencies.map((ed) => ({ value: ed.id, label: `${ed.name} (Default: ₹${ed.defaultPrice})` }))}
                placeholder="Select dependency (e.g. Kaaj button, DTF)"
                value={extraDepData.extraDependencyId}
                onChange={(e) => {
                  const selected = allExtraDependencies.find((ed) => ed.id === e.target.value);
                  setExtraDepData((d) => ({
                    ...d,
                    extraDependencyId: e.target.value,
                    price: selected ? String(selected.defaultPrice) : "",
                  }));
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={extraDepData.quantity} onChange={(e) => setExtraDepData((d) => ({ ...d, quantity: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Rate / Price (₹)</Label>
                <Input type="number" step="0.01" value={extraDepData.price} onChange={(e) => setExtraDepData((d) => ({ ...d, price: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddExtraDep(false)}>Cancel</Button>
            <Button onClick={handleAddExtraDep} disabled={loading}>{loading ? "Adding..." : "Add Dependency"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Material Dialog */}
      <Dialog open={showAddMaterial} onOpenChange={setShowAddMaterial}>
        <DialogContent onClose={() => setShowAddMaterial(false)}>
          <DialogHeader><DialogTitle>Add Material to Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Material</Label>
              <Select
                options={materials.map((m) => ({ value: m.id, label: `${m.name} (${formatCurrency(m.price)}/${m.unit})` }))}
                placeholder="Select material"
                value={materialData.materialId}
                onChange={(e) => setMaterialData((d) => ({ ...d, materialId: e.target.value, colorSelected: "" }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity {selectedMaterialObj ? `(${selectedMaterialObj.unit})` : ""}</Label>
              <Input type="number" step="0.01" value={materialData.quantity} onChange={(e) => setMaterialData((d) => ({ ...d, quantity: e.target.value }))} placeholder="0.00" />
            </div>
            {selectedMaterialObj && selectedMaterialObj.colors && selectedMaterialObj.colors.length > 0 && (
              <div className="space-y-2">
                <Label>Select Color</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedMaterialObj.colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setMaterialData((d) => ({ ...d, colorSelected: color }))}
                      className={`h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all ${
                        materialData.colorSelected === color ? "border-indigo-600 scale-110 shadow-md" : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMaterial(false)}>Cancel</Button>
            <Button onClick={handleAddMaterial} disabled={loading}>{loading ? "Adding..." : "Add Material"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Status Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent onClose={() => setShowEdit(false)}>
          <DialogHeader><DialogTitle>Update Order Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select options={ORDER_STATUSES} value={editStatus} onChange={(e) => setEditStatus(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={loading}>{loading ? "Saving..." : "Save Status"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
