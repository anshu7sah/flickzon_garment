"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, getInitials } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { createPayment, updateClient } from "@/actions/clients";
import { CLIENT_TYPES, CLIENT_STATUSES, PAYMENT_TERMS, PAYMENT_METHODS } from "@/lib/validations/clients";
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit, LayoutDashboard, Package, DollarSign, TrendingUp, MessageSquare } from "lucide-react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import type { ClientStats, SerializedClientNote } from "@/types";
import OverviewTab from "./tabs/overview-tab";
import OrdersTab from "./tabs/orders-tab";
import PaymentsTab from "./tabs/payments-tab";
import RevenueTab from "./tabs/revenue-tab";
import NotesTab from "./tabs/notes-tab";

interface SerializedOrder {
  id: string; orderNumber: string; totalPieces: number; status: string;
  deadline: string | null; createdAt: string; updatedAt: string; totalAmount: number;
  description: string | null; clientId: string;
  orderAssignments: { assignedPieces: number; completedPieces: number }[];
}
interface SerializedPayment {
  id: string; amount: number; date: string; method: string | null;
  note: string | null; createdAt: string; order: { orderNumber: string } | null;
}
interface ClientData {
  id: string; name: string; clientCode: string | null; clientType: string;
  companyName: string | null; status: string; phone: string | null;
  secondaryPhone: string | null; whatsappNumber: string | null; email: string | null;
  website: string | null; country: string | null; state: string | null;
  city: string | null; postalCode: string | null; address: string | null;
  contactPerson: string | null; designation: string | null; taxNumber: string | null;
  businessRegNumber: string | null; paymentTerms: string | null;
  creditLimit: number | null; openingBalance: number | null; currency: string | null;
  preferredPaymentMethod: string | null; preferredGarmentType: string | null;
  preferredFabric: string | null; preferredColour: string | null;
  preferredSizeChart: string | null; preferredDeliveryMethod: string | null;
  internalNotes: string | null; specialInstructions: string | null;
  profilePhotoUrl: string | null; createdAt: string; updatedAt: string;
  orders: SerializedOrder[]; payments: SerializedPayment[];
  notes: SerializedClientNote[];
}

interface Props {
  client: ClientData;
  role: Role;
  userName: string;
  stats: ClientStats;
  revenueData: { month: string; revenue: number }[];
}

export default function ClientDetailClient({ client, role, userName, stats, revenueData }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [showPayment, setShowPayment] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const canManage = hasPermission(role, "client_management");
  const canPayments = hasPermission(role, "income_payments");

  const [payData, setPayData] = useState({ amount: "", date: new Date().toISOString().split("T")[0], method: "", note: "", orderId: "" });
  const [editData, setEditData] = useState({
    name: client.name, clientType: client.clientType, companyName: client.companyName ?? "",
    clientCode: client.clientCode ?? "", phone: client.phone ?? "", secondaryPhone: client.secondaryPhone ?? "",
    whatsappNumber: client.whatsappNumber ?? "", email: client.email ?? "", website: client.website ?? "",
    country: client.country ?? "", state: client.state ?? "", city: client.city ?? "",
    postalCode: client.postalCode ?? "", address: client.address ?? "",
    contactPerson: client.contactPerson ?? "", designation: client.designation ?? "",
    taxNumber: client.taxNumber ?? "", businessRegNumber: client.businessRegNumber ?? "",
    paymentTerms: client.paymentTerms ?? "", creditLimit: client.creditLimit ?? 0,
    openingBalance: client.openingBalance ?? 0, currency: client.currency ?? "INR",
    preferredPaymentMethod: client.preferredPaymentMethod ?? "",
    preferredGarmentType: client.preferredGarmentType ?? "", preferredFabric: client.preferredFabric ?? "",
    preferredColour: client.preferredColour ?? "", preferredSizeChart: client.preferredSizeChart ?? "",
    preferredDeliveryMethod: client.preferredDeliveryMethod ?? "",
    status: client.status, internalNotes: client.internalNotes ?? "",
    specialInstructions: client.specialInstructions ?? "",
  });

  const totalPaid = client.payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = (client.openingBalance ?? 0) - totalPaid;

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
    if (result.success) { toast.success("Client updated"); setShowEdit(false); router.refresh(); }
    else toast.error(result.error);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Link href="/dashboard/clients"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-lg">
            {getInitials(client.name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{client.name}</h1>
              <StatusBadge status={client.status} />
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 flex-wrap">
              {client.clientCode && <Badge variant="outline" className="text-xs font-mono">{client.clientCode}</Badge>}
              <span>{(client.clientType || "INDIVIDUAL").replace(/_/g, " ")}</span>
              <span>•</span>
              <span>Since {formatDate(client.createdAt)}</span>
              {client.companyName && <><span>•</span><span>{client.companyName}</span></>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {canManage && <Button variant="outline" onClick={() => setShowEdit(true)} className="gap-2"><Edit className="h-4 w-4" /> Edit</Button>}
          {canPayments && <Button onClick={() => setShowPayment(true)} className="gap-2"><Plus className="h-4 w-4" /> Payment</Button>}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="overview"><LayoutDashboard className="h-4 w-4 mr-1.5" /> Overview</TabsTrigger>
          <TabsTrigger value="orders"><Package className="h-4 w-4 mr-1.5" /> Orders ({client.orders.length})</TabsTrigger>
          <TabsTrigger value="payments"><DollarSign className="h-4 w-4 mr-1.5" /> Payments ({client.payments.length})</TabsTrigger>
          <TabsTrigger value="revenue"><TrendingUp className="h-4 w-4 mr-1.5" /> Revenue</TabsTrigger>
          <TabsTrigger value="notes"><MessageSquare className="h-4 w-4 mr-1.5" /> Notes ({client.notes.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab client={client} stats={stats} /></TabsContent>
        <TabsContent value="orders"><OrdersTab orders={client.orders} /></TabsContent>
        <TabsContent value="payments"><PaymentsTab payments={client.payments} totalPaid={totalPaid} outstanding={outstanding} /></TabsContent>
        <TabsContent value="revenue"><RevenueTab stats={stats} revenueData={revenueData} /></TabsContent>
        <TabsContent value="notes"><NotesTab clientId={client.id} notes={client.notes} canManage={canManage} /></TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent onClose={() => setShowPayment(false)}>
          <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Amount</Label><Input type="number" step="0.01" value={payData.amount} onChange={e => setPayData(d => ({ ...d, amount: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={payData.date} onChange={e => setPayData(d => ({ ...d, date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Method</Label><Select options={PAYMENT_METHODS.map(m => ({ value: m.value, label: m.label }))} placeholder="Select" value={payData.method} onChange={e => setPayData(d => ({ ...d, method: e.target.value }))} /></div>
            {client.orders.length > 0 && (<div className="space-y-2"><Label>Link to Order</Label><Select options={[{ value: "", label: "None" }, ...client.orders.map(o => ({ value: o.id, label: o.orderNumber }))]} value={payData.orderId} onChange={e => setPayData(d => ({ ...d, orderId: e.target.value }))} /></div>)}
            <div className="space-y-2"><Label>Note</Label><Textarea value={payData.note} onChange={e => setPayData(d => ({ ...d, note: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button><Button onClick={handlePayment} disabled={loading}>{loading ? "Saving..." : "Record Payment"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent onClose={() => setShowEdit(false)} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name *</Label><Input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Client Type</Label><Select options={CLIENT_TYPES.map(t => ({ value: t.value, label: t.label }))} value={editData.clientType} onChange={e => setEditData(d => ({ ...d, clientType: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Company</Label><Input value={editData.companyName} onChange={e => setEditData(d => ({ ...d, companyName: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Client Code</Label><Input value={editData.clientCode} onChange={e => setEditData(d => ({ ...d, clientCode: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone *</Label><Input value={editData.phone} onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Secondary Phone</Label><Input value={editData.secondaryPhone} onChange={e => setEditData(d => ({ ...d, secondaryPhone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>WhatsApp</Label><Input value={editData.whatsappNumber} onChange={e => setEditData(d => ({ ...d, whatsappNumber: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={editData.email} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Website</Label><Input value={editData.website} onChange={e => setEditData(d => ({ ...d, website: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Country</Label><Input value={editData.country} onChange={e => setEditData(d => ({ ...d, country: e.target.value }))} /></div>
              <div className="space-y-2"><Label>State</Label><Input value={editData.state} onChange={e => setEditData(d => ({ ...d, state: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>City</Label><Input value={editData.city} onChange={e => setEditData(d => ({ ...d, city: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Postal Code</Label><Input value={editData.postalCode} onChange={e => setEditData(d => ({ ...d, postalCode: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Textarea value={editData.address} onChange={e => setEditData(d => ({ ...d, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Contact Person</Label><Input value={editData.contactPerson} onChange={e => setEditData(d => ({ ...d, contactPerson: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Designation</Label><Input value={editData.designation} onChange={e => setEditData(d => ({ ...d, designation: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tax / GST No.</Label><Input value={editData.taxNumber} onChange={e => setEditData(d => ({ ...d, taxNumber: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Business Reg. No.</Label><Input value={editData.businessRegNumber} onChange={e => setEditData(d => ({ ...d, businessRegNumber: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Payment Terms</Label><Select options={[{ value: "", label: "Select" }, ...PAYMENT_TERMS.map(t => ({ value: t.value, label: t.label }))]} value={editData.paymentTerms} onChange={e => setEditData(d => ({ ...d, paymentTerms: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Preferred Payment</Label><Select options={[{ value: "", label: "Select" }, ...PAYMENT_METHODS.map(m => ({ value: m.value, label: m.label }))]} value={editData.preferredPaymentMethod} onChange={e => setEditData(d => ({ ...d, preferredPaymentMethod: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Credit Limit</Label><Input type="number" step="0.01" value={editData.creditLimit} onChange={e => setEditData(d => ({ ...d, creditLimit: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Opening Balance</Label><Input type="number" step="0.01" value={editData.openingBalance} onChange={e => setEditData(d => ({ ...d, openingBalance: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Garment Type</Label><Input value={editData.preferredGarmentType} onChange={e => setEditData(d => ({ ...d, preferredGarmentType: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Fabric</Label><Input value={editData.preferredFabric} onChange={e => setEditData(d => ({ ...d, preferredFabric: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Colour</Label><Input value={editData.preferredColour} onChange={e => setEditData(d => ({ ...d, preferredColour: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Size Chart</Label><Input value={editData.preferredSizeChart} onChange={e => setEditData(d => ({ ...d, preferredSizeChart: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Delivery Method</Label><Input value={editData.preferredDeliveryMethod} onChange={e => setEditData(d => ({ ...d, preferredDeliveryMethod: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Status</Label><Select options={CLIENT_STATUSES.map(s => ({ value: s.value, label: s.label }))} value={editData.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Internal Notes</Label><Textarea value={editData.internalNotes} onChange={e => setEditData(d => ({ ...d, internalNotes: e.target.value }))} rows={3} /></div>
            <div className="space-y-2"><Label>Special Instructions</Label><Textarea value={editData.specialInstructions} onChange={e => setEditData(d => ({ ...d, specialInstructions: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
