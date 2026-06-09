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
import { formatCurrency, formatDate, calculatePercentage } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { createPayment, updateClient } from "@/actions/clients";
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit, Phone, Mail, MapPin } from "lucide-react";
import Link from "next/link";
import type { Role } from "@prisma/client";

interface Props {
  client: {
    id: string; name: string; phone: string | null; email: string | null; address: string | null; paymentTerms: string | null;
    createdAt: string; updatedAt: string;
    orders: { id: string; orderNumber: string; totalPieces: number; status: string; deadline: string | null; createdAt: string; updatedAt: string; orderAssignments: { assignedPieces: number; completedPieces: number }[] }[];
    payments: { id: string; amount: number; date: string; method: string | null; note: string | null; createdAt: string; order: { orderNumber: string } | null }[];
  };
  role: Role;
}

export default function ClientDetailClient({ client, role }: Props) {
  const router = useRouter();
  const [showPayment, setShowPayment] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [payData, setPayData] = useState({ amount: "", date: new Date().toISOString().split("T")[0], method: "", note: "", orderId: "" });
  const [editData, setEditData] = useState({ name: client.name, phone: client.phone ?? "", email: client.email ?? "", address: client.address ?? "", paymentTerms: client.paymentTerms ?? "" });
  const [loading, setLoading] = useState(false);
  const canManage = hasPermission(role, "client_management");
  const canPayments = hasPermission(role, "income_payments");

  const totalPaid = client.payments.reduce((s, p) => s + p.amount, 0);

  const handlePayment = async () => {
    setLoading(true);
    const result = await createPayment({ clientId: client.id, amount: Number(payData.amount), date: payData.date, method: payData.method || undefined, note: payData.note || undefined, orderId: payData.orderId || undefined });
    setLoading(false);
    if (result.success) { toast.success("Payment recorded"); setShowPayment(false); setPayData({ amount: "", date: new Date().toISOString().split("T")[0], method: "", note: "", orderId: "" }); router.refresh(); }
    else toast.error(result.error);
  };

  const handleEdit = async () => {
    setLoading(true);
    const result = await updateClient({ id: client.id, ...editData });
    setLoading(false);
    if (result.success) { toast.success("Client updated"); setShowEdit(false); router.refresh(); } else toast.error(result.error);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/clients"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div className="flex-1"><h1 className="text-2xl font-bold text-gray-900">{client.name}</h1><p className="text-sm text-gray-500">Client since {formatDate(client.createdAt)}</p></div>
        <div className="flex gap-2">
          {canManage && <Button variant="outline" onClick={() => setShowEdit(true)} className="gap-2"><Edit className="h-4 w-4" /> Edit</Button>}
          {canPayments && <Button onClick={() => setShowPayment(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Payment</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3 text-gray-600"><Phone className="h-4 w-4" /><span className="text-sm">{client.phone ?? "No phone"}</span></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3 text-gray-600"><Mail className="h-4 w-4" /><span className="text-sm">{client.email ?? "No email"}</span></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3 text-gray-600"><MapPin className="h-4 w-4" /><span className="text-sm">{client.address ?? "No address"}</span></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Total Orders</p><p className="text-2xl font-bold">{client.orders.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Total Paid</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Payment Terms</p><p className="text-2xl font-bold">{client.paymentTerms ?? "—"}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Orders</CardTitle></CardHeader>
        <CardContent>
          {client.orders.length === 0 ? <p className="text-sm text-gray-500 text-center py-6">No orders yet.</p> : (
            <div className="space-y-2">{client.orders.map(o => {
              const completed = o.orderAssignments.reduce((s, a) => s + a.completedPieces, 0);
              const pct = calculatePercentage(completed, o.totalPieces);
              return (
                <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                  <div className="flex items-center gap-4"><span className="font-medium text-indigo-600">{o.orderNumber}</span><span className="text-sm text-gray-500">{o.totalPieces} pcs</span><StatusBadge status={o.status} /></div>
                  <div className="flex items-center gap-3"><div className="h-2 w-20 rounded-full bg-gray-200"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} /></div><span className="text-xs text-gray-500">{pct}%</span></div>
                </Link>
              );
            })}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
        <CardContent>
          {client.payments.length === 0 ? <p className="text-sm text-gray-500 text-center py-6">No payments recorded.</p> : (
            <div className="space-y-2">{client.payments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div><p className="text-sm font-medium">{formatCurrency(p.amount)}</p><p className="text-xs text-gray-500">{p.method ?? "—"} {p.order ? `• ${p.order.orderNumber}` : ""} {p.note ? `• ${p.note}` : ""}</p></div>
                <Badge variant="outline">{formatDate(p.date)}</Badge>
              </div>
            ))}</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent onClose={() => setShowPayment(false)}>
          <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Amount</Label><Input type="number" step="0.01" value={payData.amount} onChange={e => setPayData(d => ({ ...d, amount: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={payData.date} onChange={e => setPayData(d => ({ ...d, date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Method</Label><Select options={[{ value: "Cash", label: "Cash" }, { value: "Bank Transfer", label: "Bank Transfer" }, { value: "UPI", label: "UPI" }, { value: "Cheque", label: "Cheque" }]} placeholder="Select method" value={payData.method} onChange={e => setPayData(d => ({ ...d, method: e.target.value }))} /></div>
            {client.orders.length > 0 && (<div className="space-y-2"><Label>Link to Order (optional)</Label><Select options={client.orders.map(o => ({ value: o.id, label: o.orderNumber }))} placeholder="Select order" value={payData.orderId} onChange={e => setPayData(d => ({ ...d, orderId: e.target.value }))} /></div>)}
            <div className="space-y-2"><Label>Note</Label><Textarea value={payData.note} onChange={e => setPayData(d => ({ ...d, note: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button><Button onClick={handlePayment} disabled={loading}>{loading ? "Saving..." : "Record Payment"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent onClose={() => setShowEdit(false)}>
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input value={editData.phone} onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={editData.email} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Textarea value={editData.address} onChange={e => setEditData(d => ({ ...d, address: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Payment Terms</Label><Input value={editData.paymentTerms} onChange={e => setEditData(d => ({ ...d, paymentTerms: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button><Button onClick={handleEdit} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
