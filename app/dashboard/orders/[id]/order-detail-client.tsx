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
import { formatDate, calculatePercentage, formatCurrency } from "@/lib/utils";
import { assignWorker, removeAssignment, logPieces, approvePieceLog, updateOrder } from "@/actions/orders";
import { toast } from "sonner";
import { UserPlus, Trash2, CheckCircle, XCircle, ArrowLeft, Package, Clock, Edit } from "lucide-react";
import Link from "next/link";
import type { Role } from "@prisma/client";

interface PieceLogSerialized { id: string; orderAssignmentId: string; loggedById: string; pieces: number; status: string; note: string | null; createdAt: string; updatedAt: string; loggedBy: { id: string; name: string } }
interface AssignmentSerialized { id: string; orderId: string; workerId: string; assignedPieces: number; completedPieces: number; createdAt: string; updatedAt: string; worker: { id: string; name: string; email: string }; pieceLogs: PieceLogSerialized[] }
interface OrderSerialized { id: string; orderNumber: string; clientId: string; description: string | null; totalPieces: number; deadline: string | null; status: string; createdAt: string; updatedAt: string; client: { id: string; name: string; phone: string | null; email: string | null }; orderAssignments: AssignmentSerialized[]; payments: { id: string; amount: number; date: string; method: string | null; note: string | null; createdAt: string }[] }
interface Props { order: OrderSerialized; workers: { id: string; name: string }[]; role: Role; userId: string; userPermissions: Record<string, boolean> }

export default function OrderDetailClient({ order, workers, role, userId, userPermissions }: Props) {
  const router = useRouter();
  const [showAssign, setShowAssign] = useState(false);
  const [showLogPieces, setShowLogPieces] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [assignData, setAssignData] = useState({ workerId: "", assignedPieces: "" });
  const [logData, setLogData] = useState({ pieces: "", note: "" });
  const [editStatus, setEditStatus] = useState(order.status);
  const [loading, setLoading] = useState(false);

  const canAssign = hasPermission(role, "assign_workers");
  const canApprove = hasPermission(role, "approve_piece_logs");
  const canEdit = hasPermission(role, "create_edit_orders");
  const canLogAll = hasPermission(role, "log_pieces_all");
  const canWorkerLog = role === "WORKER" && userPermissions?.canLogPieces;

  const totalCompleted = order.orderAssignments.reduce((s, a) => s + a.completedPieces, 0);
  const completionPct = calculatePercentage(totalCompleted, order.totalPieces);

  const handleAssign = async () => {
    setLoading(true);
    const result = await assignWorker({ orderId: order.id, workerId: assignData.workerId, assignedPieces: Number(assignData.assignedPieces) });
    setLoading(false);
    if (result.success) { toast.success("Worker assigned"); setShowAssign(false); setAssignData({ workerId: "", assignedPieces: "" }); router.refresh(); }
    else toast.error(result.error);
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
    if (result.success) { toast.success("Pieces logged — pending approval"); setShowLogPieces(null); setLogData({ pieces: "", note: "" }); router.refresh(); }
    else toast.error(result.error);
  };

  const handleApprove = async (pieceLogId: string, status: "APPROVED" | "REJECTED") => {
    const result = await approvePieceLog({ pieceLogId, status });
    if (result.success) { toast.success(`Piece log ${status.toLowerCase()}`); router.refresh(); } else toast.error(result.error);
  };

  const handleUpdateStatus = async () => {
    setLoading(true);
    const result = await updateOrder({ id: order.id, clientId: order.clientId, totalPieces: order.totalPieces, status: editStatus, description: order.description ?? undefined, deadline: order.deadline ?? undefined });
    setLoading(false);
    if (result.success) { toast.success("Order updated"); setShowEdit(false); router.refresh(); } else toast.error(result.error);
  };

  const availableWorkers = workers.filter(w => !order.orderAssignments.some(a => a.workerId === w.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/orders"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1><StatusBadge status={order.status} /></div>
          <p className="text-sm text-gray-500 mt-1">Created on {formatDate(order.createdAt)} • Client: <span className="font-medium">{order.client.name}</span></p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && <Button variant="outline" onClick={() => setShowEdit(true)} className="gap-2"><Edit className="h-4 w-4" /> Edit Status</Button>}
          {canAssign && <Button onClick={() => setShowAssign(true)} className="gap-2"><UserPlus className="h-4 w-4" /> Assign Worker</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Total Pieces</p><p className="text-2xl font-bold">{order.totalPieces.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold">{totalCompleted.toLocaleString()} <span className="text-sm font-normal text-gray-400">({completionPct}%)</span></p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Workers Assigned</p><p className="text-2xl font-bold">{order.orderAssignments.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Deadline</p><p className="text-2xl font-bold">{order.deadline ? formatDate(order.deadline) : "None"}</p></CardContent></Card>
      </div>

      {order.description && (
        <Card><CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader><CardContent><p className="text-sm text-gray-600">{order.description}</p></CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-indigo-500" /> Worker Assignments</CardTitle></CardHeader>
        <CardContent>
          {order.orderAssignments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No workers assigned yet.</p>
          ) : (
            <div className="space-y-4">
              {order.orderAssignments.map((assignment) => {
                const pct = calculatePercentage(assignment.completedPieces, assignment.assignedPieces);
                const isOwnAssignment = assignment.workerId === userId;
                return (
                  <div key={assignment.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div><p className="font-medium text-gray-900">{assignment.worker.name}</p><p className="text-xs text-gray-500">{assignment.worker.email}</p></div>
                      <div className="flex items-center gap-2">
                        {(canLogAll || (canWorkerLog && isOwnAssignment)) && <Button size="sm" variant="outline" onClick={() => setShowLogPieces(assignment.id)}>Log Pieces</Button>}
                        {canAssign && <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleRemoveAssignment(assignment.id)}><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} /></div>
                      <span className="text-sm font-medium text-gray-700">{assignment.completedPieces}/{assignment.assignedPieces} ({pct}%)</span>
                    </div>
                    {assignment.pieceLogs.length > 0 && (
                      <div className="border-t border-gray-100 pt-3 mt-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Piece Logs</p>
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
                                  <Button size="sm" variant="ghost" className="text-emerald-600 h-7" onClick={() => handleApprove(log.id, "APPROVED")}><CheckCircle className="h-4 w-4 mr-1" /> Approve</Button>
                                  <Button size="sm" variant="ghost" className="text-red-500 h-7" onClick={() => handleApprove(log.id, "REJECTED")}><XCircle className="h-4 w-4 mr-1" /> Reject</Button>
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

      {order.payments.length > 0 && (
        <Card><CardHeader><CardTitle>Payments</CardTitle></CardHeader><CardContent>
          <div className="space-y-2">{order.payments.map(p => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div><p className="text-sm font-medium">{formatCurrency(p.amount)}</p><p className="text-xs text-gray-500">{p.method ?? "—"} • {p.note ?? ""}</p></div>
              <Badge variant="outline">{formatDate(p.date)}</Badge>
            </div>
          ))}</div>
        </CardContent></Card>
      )}

      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent onClose={() => setShowAssign(false)}>
          <DialogHeader><DialogTitle>Assign Worker</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Worker</Label><Select options={availableWorkers.map(w => ({ value: w.id, label: w.name }))} placeholder="Select worker" value={assignData.workerId} onChange={(e) => setAssignData(d => ({ ...d, workerId: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Pieces to Assign</Label><Input type="number" value={assignData.assignedPieces} onChange={(e) => setAssignData(d => ({ ...d, assignedPieces: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button><Button onClick={handleAssign} disabled={loading}>{loading ? "Assigning..." : "Assign"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showLogPieces} onOpenChange={() => setShowLogPieces(null)}>
        <DialogContent onClose={() => setShowLogPieces(null)}>
          <DialogHeader><DialogTitle>Log Pieces</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Pieces Completed</Label><Input type="number" value={logData.pieces} onChange={(e) => setLogData(d => ({ ...d, pieces: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Note (optional)</Label><Textarea value={logData.note} onChange={(e) => setLogData(d => ({ ...d, note: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowLogPieces(null)}>Cancel</Button><Button onClick={handleLogPieces} disabled={loading}>{loading ? "Logging..." : "Log Pieces"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent onClose={() => setShowEdit(false)}>
          <DialogHeader><DialogTitle>Update Order Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Status</Label><Select options={[{ value: "PENDING", label: "Pending" }, { value: "IN_PROGRESS", label: "In Progress" }, { value: "COMPLETED", label: "Completed" }, { value: "DELIVERED", label: "Delivered" }, { value: "CANCELLED", label: "Cancelled" }]} value={editStatus} onChange={(e) => setEditStatus(e.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button><Button onClick={handleUpdateStatus} disabled={loading}>{loading ? "Saving..." : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
