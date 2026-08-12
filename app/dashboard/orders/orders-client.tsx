"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { ImageUpload } from "@/components/ui/image-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { hasPermission } from "@/lib/permissions";
import { formatDate, formatCurrency, calculatePercentage, formatStatusLabel } from "@/lib/utils";
import { createOrder, deleteOrder } from "@/actions/orders";
import { toast } from "sonner";
import { Plus, Eye, Trash2, IndianRupee, Layers, Wrench, Image as ImageIcon, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import type { ClothTypeItem, FabricTypeItem, PatternItem, ExtraDependencyItem } from "@/types";

interface SerializedOrder {
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
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string };
  pattern?: { id: string; patternNumber: number; name: string } | null;
  orderAssignments: { id: string; assignedPieces: number; completedPieces: number; worker: { id: string; name: string } }[];
  clothTypes: { id: string; clothType: { id: string; name: string } }[];
  fabricTypes: { id: string; fabricType: { id: string; name: string }; color: string | null }[];
  _count: { expenses: number; orderMaterials: number };
}

interface Props {
  orders: SerializedOrder[];
  total: number;
  page: number;
  pageSize: number;
  clients: { id: string; name: string }[];
  clothTypes: ClothTypeItem[];
  fabricTypes: FabricTypeItem[];
  patterns: PatternItem[];
  extraDependencies: ExtraDependencyItem[];
  role: Role;
  searchValue: string;
}

const ORDER_TYPES = [
  { value: "FABRICATION", label: "Fabrication" },
  { value: "WHOLE_PIECES", label: "Whole Pieces" },
];

const PAYMENT_METHODS = [
  { value: "", label: "Select payment method" },
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

const PAYMENT_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
];

export default function OrdersClient({
  orders,
  total,
  page,
  pageSize,
  clients,
  clothTypes,
  fabricTypes,
  patterns,
  extraDependencies,
  role,
  searchValue,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const canCreate = hasPermission(role, "create_edit_orders");

  // Form state
  const [form, setForm] = useState({
    clientId: "",
    orderType: "FABRICATION",
    description: "",
    orderDescription: "",
    totalPieces: "",
    rate: "",
    deadline: "",
    paymentMethod: "",
    paymentStatus: "PENDING",
    advanceAmount: "",
    clothTypeIds: [] as string[],
    fabricTypeIds: [] as string[],
    fabricColors: {} as Record<string, string>,
    patternChoice: "NEW" as "EXISTING" | "NEW",
    patternId: "",
    newPatternName: "",
    newPatternDescription: "",
    imageUrls: [] as string[],
    selectedExtraDeps: [] as { extraDependencyId: string; quantity: number; price: number }[],
  });

  const resetForm = () => {
    setForm({
      clientId: "", orderType: "FABRICATION", description: "", orderDescription: "",
      totalPieces: "", rate: "", deadline: "", paymentMethod: "", paymentStatus: "PENDING",
      advanceAmount: "", clothTypeIds: [], fabricTypeIds: [], fabricColors: {},
      patternChoice: "NEW", patternId: "", newPatternName: "", newPatternDescription: "",
      imageUrls: [], selectedExtraDeps: [],
    });
  };

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => { if (v) params.set(k, v); else params.delete(k); });
    router.push(`${pathname}?${params.toString()}`);
  };

  // Filter patterns for selected client
  const clientPatterns = form.clientId
    ? patterns.filter((p) => p.clientId === form.clientId)
    : patterns;

  // Financial calculations preview
  const calculatedValue = (Number(form.rate) || 0) * (Number(form.totalPieces) || 0);
  const extraDepTotalCost = form.selectedExtraDeps.reduce(
    (sum, dep) => sum + (Number(dep.quantity) || 0) * (Number(dep.price) || 0),
    0
  );

  const addExtraDepRow = () => {
    if (extraDependencies.length === 0) {
      toast.error("No extra dependencies created yet. Add dependencies in Materials tab first.");
      return;
    }
    const defaultDep = extraDependencies[0];
    setForm((d) => ({
      ...d,
      selectedExtraDeps: [
        ...d.selectedExtraDeps,
        { extraDependencyId: defaultDep.id, quantity: 1, price: defaultDep.defaultPrice },
      ],
    }));
  };

  const removeExtraDepRow = (index: number) => {
    setForm((d) => ({
      ...d,
      selectedExtraDeps: d.selectedExtraDeps.filter((_, i) => i !== index),
    }));
  };

  const updateExtraDepRow = (index: number, field: string, value: any) => {
    setForm((d) => {
      const updated = [...d.selectedExtraDeps];
      if (field === "extraDependencyId") {
        const found = extraDependencies.find((ed) => ed.id === value);
        updated[index] = {
          ...updated[index],
          extraDependencyId: value,
          price: found ? found.defaultPrice : updated[index].price,
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...d, selectedExtraDeps: updated };
    });
  };

  const onCreateSubmit = async () => {
    if (!form.clientId) {
      toast.error("Please select a client");
      return;
    }
    if (!form.totalPieces || Number(form.totalPieces) <= 0) {
      toast.error("Please enter valid total pieces");
      return;
    }

    setCreating(true);
    const result = await createOrder({
      ...form,
      totalPieces: Number(form.totalPieces),
      rate: Number(form.rate) || 0,
      advanceAmount: Number(form.advanceAmount) || 0,
      paymentMethod: form.paymentMethod || null,
      patternId: form.patternChoice === "EXISTING" ? form.patternId : null,
      newPatternName: form.patternChoice === "NEW" ? (form.newPatternName || form.description) : undefined,
      newPatternDescription: form.patternChoice === "NEW" ? (form.newPatternDescription || form.orderDescription) : undefined,
      extraDependencies: form.selectedExtraDeps.map((ed) => ({
        extraDependencyId: ed.extraDependencyId,
        quantity: Number(ed.quantity) || 1,
        price: Number(ed.price) || 0,
      })),
    });
    setCreating(false);

    if (result.success) {
      toast.success("Order created successfully!");
      setShowCreate(false);
      resetForm();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const onDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const result = await deleteOrder(deleteId);
    setDeleting(false);
    if (result.success) { toast.success("Order deleted"); setDeleteId(null); router.refresh(); }
    else toast.error(result.error);
  };

  const columns: Column<SerializedOrder>[] = [
    {
      key: "orderNumber",
      header: "Order #",
      sortable: true,
      render: (o) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-indigo-600">{o.orderNumber}</span>
            {o.pattern && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                Pattern #{o.pattern.patternNumber}
              </Badge>
            )}
          </div>
          <Badge className="mt-1 text-[10px]" variant="outline">{formatStatusLabel(o.orderType)}</Badge>
        </div>
      ),
    },
    { key: "client", header: "Client", sortable: false, render: (o) => o.client.name },
    {
      key: "clothTypes",
      header: "Cloth / Fabric",
      render: (o) => (
        <div className="flex flex-wrap gap-1">
          {o.clothTypes.map((ct) => (
            <Badge key={ct.id} className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">{ct.clothType.name}</Badge>
          ))}
          {o.fabricTypes.map((ft) => (
            <Badge key={ft.id} className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">{ft.fabricType.name}</Badge>
          ))}
          {o.clothTypes.length === 0 && o.fabricTypes.length === 0 && <span className="text-gray-400 text-xs">—</span>}
        </div>
      ),
    },
    { key: "totalPieces", header: "Pieces", sortable: true, render: (o) => o.totalPieces.toLocaleString() },
    {
      key: "completed",
      header: "Progress",
      render: (o) => {
        const done = o.orderAssignments.reduce((s, a) => s + a.completedPieces, 0);
        const pct = calculatePercentage(done, o.totalPieces);
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 rounded-full bg-gray-200 overflow-hidden"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} /></div>
            <span className="text-xs text-gray-500">{pct}%</span>
          </div>
        );
      },
    },
    {
      key: "totalOrderValue",
      header: "Value",
      sortable: true,
      render: (o) => <span className="font-medium text-gray-900">{formatCurrency(o.totalOrderValue)}</span>,
    },
    { key: "paymentStatus", header: "Payment", render: (o) => <StatusBadge status={o.paymentStatus} /> },
    { key: "status", header: "Status", sortable: true, render: (o) => <StatusBadge status={o.status} /> },
    { key: "deadline", header: "Deadline", sortable: true, render: (o) => o.deadline ? formatDate(o.deadline) : "—" },
    {
      key: "actions",
      header: "",
      render: (o) => (
        <div className="flex items-center gap-1">
          <Link href={`/dashboard/orders/${o.id}`}><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button></Link>
          {canCreate && <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => setDeleteId(o.id)}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track all garment orders, patterns, and extra dependencies</p>
        </div>
        {canCreate && (
          <Button onClick={() => { resetForm(); setShowCreate(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> New Order
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={orders}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => updateParams({ page: String(p) })}
        onPageSizeChange={(ps) => updateParams({ pageSize: String(ps), page: "1" })}
        onSearch={(s) => updateParams({ search: s, page: "1" })}
        onSort={(by, order) => updateParams({ sortBy: by, sortOrder: order })}
        searchValue={searchValue}
        keyExtractor={(o) => o.id}
        emptyMessage="No orders found. Create your first order to get started."
        emptyAction={canCreate ? <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }}>Create Order</Button> : undefined}
      />

      {/* ── Create Order Dialog ────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent onClose={() => setShowCreate(false)} className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">

            {/* Section 1: Basic Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Client & Order Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client *</Label>
                  <Select
                    options={clients.map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="Select a client"
                    value={form.clientId}
                    onChange={(e) => setForm((d) => ({ ...d, clientId: e.target.value, patternId: "" }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Order Type *</Label>
                  <Select options={ORDER_TYPES} value={form.orderType} onChange={(e) => setForm((d) => ({ ...d, orderType: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Order Title / Short Description</Label>
                <Input value={form.description} onChange={(e) => setForm((d) => ({ ...d, description: e.target.value }))} placeholder="e.g. 500 Heavyweight Hoodies" />
              </div>
              <div className="space-y-2">
                <Label>Detailed Specifications & Notes</Label>
                <Textarea value={form.orderDescription} onChange={(e) => setForm((d) => ({ ...d, orderDescription: e.target.value }))} placeholder="Detailed measurements, stitching rules, notes..." rows={2} />
              </div>
            </div>

            {/* Section 2: Pattern Management */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Pattern Selection
                </h3>
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="patternChoice"
                      checked={form.patternChoice === "NEW"}
                      onChange={() => setForm((d) => ({ ...d, patternChoice: "NEW" }))}
                    />
                    <span>Auto-Generate New Pattern</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="patternChoice"
                      checked={form.patternChoice === "EXISTING"}
                      onChange={() => setForm((d) => ({ ...d, patternChoice: "EXISTING" }))}
                    />
                    <span>Use Existing Pattern</span>
                  </label>
                </div>
              </div>

              {form.patternChoice === "EXISTING" ? (
                <div className="space-y-2">
                  <Label>Select Old Pattern</Label>
                  <Select
                    options={clientPatterns.map((p) => ({
                      value: p.id,
                      label: `Pattern #${p.patternNumber}: ${p.name} ${p.description ? `(${p.description})` : ""} - ${p.client?.name || ""}`,
                    }))}
                    placeholder={clientPatterns.length === 0 ? "No patterns found for this client" : "Select an existing pattern..."}
                    value={form.patternId}
                    onChange={(e) => setForm((d) => ({ ...d, patternId: e.target.value }))}
                  />
                  {clientPatterns.length === 0 && (
                    <p className="text-xs text-amber-600">No existing patterns found for this client. Switch to 'Auto-Generate New Pattern'.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 bg-amber-50/50 p-3 rounded-lg border border-amber-200/60">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">New Pattern Name</Label>
                    <Input
                      value={form.newPatternName}
                      onChange={(e) => setForm((d) => ({ ...d, newPatternName: e.target.value }))}
                      placeholder={form.description || "Will auto-generate title..."}
                      className="bg-white text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Pattern Description</Label>
                    <Input
                      value={form.newPatternDescription}
                      onChange={(e) => setForm((d) => ({ ...d, newPatternDescription: e.target.value }))}
                      placeholder="Specific pattern notes..."
                      className="bg-white text-xs"
                    />
                  </div>
                  <p className="col-span-2 text-[11px] text-amber-700">
                    A unique ascending pattern number (e.g. 1, 2, 3...) will be auto-assigned to this client's pattern upon order creation.
                  </p>
                </div>
              )}
            </div>

            {/* Section 3: Cloth & Fabric Types */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Cloth & Fabric Selection</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cloth Type(s)</Label>
                  <MultiSelect
                    options={clothTypes.map((ct) => ({ value: ct.id, label: ct.name }))}
                    value={form.clothTypeIds}
                    onChange={(v) => setForm((d) => ({ ...d, clothTypeIds: v }))}
                    placeholder="Select cloth types (e.g. Hoodie, T-Shirt)..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fabric Type(s)</Label>
                  <MultiSelect
                    options={fabricTypes.map((ft) => ({ value: ft.id, label: ft.name }))}
                    value={form.fabricTypeIds}
                    onChange={(v) => setForm((d) => ({ ...d, fabricTypeIds: v }))}
                    placeholder="Select fabric types (e.g. Micro P, Cotton)..."
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Extra Dependencies (Kaaj button, DTF order, DTF heat, etc.) */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 text-indigo-600" /> Extra Dependencies (Kaaj button, DTF order, DTF heat...)
                </h3>
                <Button type="button" size="sm" variant="outline" onClick={addExtraDepRow} className="gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add Dependency
                </Button>
              </div>

              {form.selectedExtraDeps.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No extra dependencies selected for this order.</p>
              ) : (
                <div className="space-y-2">
                  {form.selectedExtraDeps.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <Select
                          options={extraDependencies.map((ed) => ({ value: ed.id, label: `${ed.name} (Default: ₹${ed.defaultPrice})` }))}
                          value={row.extraDependencyId}
                          onChange={(e) => updateExtraDepRow(idx, "extraDependencyId", e.target.value)}
                        />
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={row.quantity}
                          onChange={(e) => updateExtraDepRow(idx, "quantity", e.target.value)}
                          className="text-xs bg-white"
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Rate ₹"
                          value={row.price}
                          onChange={(e) => updateExtraDepRow(idx, "price", e.target.value)}
                          className="text-xs bg-white"
                        />
                      </div>
                      <span className="w-24 text-xs font-semibold text-gray-700 text-right">
                        {formatCurrency((Number(row.quantity) || 0) * (Number(row.price) || 0))}
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 shrink-0" onClick={() => removeExtraDepRow(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 5: Photos Upload (Cloudinary) */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-purple-600" /> Piece / Sample Progress Photos (Cloudinary)
              </h3>
              <ImageUpload
                value={form.imageUrls}
                onChange={(urls) => setForm((d) => ({ ...d, imageUrls: urls }))}
              />
            </div>

            {/* Section 6: Quantity & Rate */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Quantity & Pricing</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Total Pieces *</Label>
                  <Input type="number" placeholder="0" value={form.totalPieces} onChange={(e) => setForm((d) => ({ ...d, totalPieces: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Rate per Piece (₹)</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={form.rate} onChange={(e) => setForm((d) => ({ ...d, rate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Deadline</Label>
                  <Input type="date" value={form.deadline} onChange={(e) => setForm((d) => ({ ...d, deadline: e.target.value }))} />
                </div>
              </div>

              {(calculatedValue > 0 || extraDepTotalCost > 0) && (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm text-emerald-700 font-medium">Total Order Value: {formatCurrency(calculatedValue)}</span>
                  </div>
                  {extraDepTotalCost > 0 && (
                    <span className="text-xs text-amber-700 font-medium bg-amber-100 px-2 py-1 rounded">
                      + Extra Dependencies Investment: {formatCurrency(extraDepTotalCost)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Section 7: Payment */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Payment Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select options={PAYMENT_METHODS} value={form.paymentMethod} onChange={(e) => setForm((d) => ({ ...d, paymentMethod: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Status</Label>
                  <Select options={PAYMENT_STATUSES} value={form.paymentStatus} onChange={(e) => setForm((d) => ({ ...d, paymentStatus: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Advance Amount (₹)</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={form.advanceAmount} onChange={(e) => setForm((d) => ({ ...d, advanceAmount: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={onCreateSubmit} disabled={creating}>{creating ? "Creating..." : "Create Order"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Order"
        description="Are you sure you want to delete this order? All assignments, piece logs, materials, and linked expenses will be removed."
        onConfirm={onDelete}
        loading={deleting}
      />
    </div>
  );
}
