"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createClient, deleteClient, getClientsForExport } from "@/actions/clients";
import { CLIENT_TYPES, CLIENT_STATUSES, PAYMENT_TERMS, PAYMENT_METHODS } from "@/lib/validations/clients";
import { toast } from "sonner";
import {
  Plus, Eye, Trash2, Download, Filter, X, Building2,
  User, Phone, Mail, MapPin, CreditCard, Settings2,
  Package, Palette, FileText, ChevronDown, ChevronUp,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClientSchema, type CreateClientInput } from "@/lib/validations/clients";
import Link from "next/link";
import type { Role } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

interface SerializedClient {
  id: string;
  name: string;
  clientCode: string | null;
  clientType: string;
  companyName: string | null;
  status: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  paymentTerms: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { orders: number };
  payments: { amount: number }[];
  orders: { totalPieces: number; status: string; createdAt: string }[];
}

interface Props {
  clients: SerializedClient[];
  total: number;
  page: number;
  pageSize: number;
  role: Role;
  searchValue: string;
  statusFilter: string;
  clientTypeFilter: string;
}

// ── Form Section Wrapper ─────────────────────────────────────────────
function FormSection({ icon, title, children, defaultOpen = true }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        className="flex items-center justify-between w-full px-4 py-3 bg-gray-50/80 hover:bg-gray-100/80 transition-colors cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

export default function ClientsClient({
  clients, total, page, pageSize, role, searchValue, statusFilter, clientTypeFilter,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(!!statusFilter || !!clientTypeFilter);
  const [exporting, setExporting] = useState(false);
  const canManage = hasPermission(role, "client_management");

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema) as any,
    defaultValues: {
      clientType: "INDIVIDUAL",
      status: "ACTIVE",
      creditLimit: 0,
      openingBalance: 0,
      currency: "INR",
    },
  });

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  const onSubmit = async (data: CreateClientInput) => {
    const result = await createClient(data);
    if (result.success) {
      toast.success("Client created successfully");
      setShowCreate(false);
      reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const onDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const result = await deleteClient(deleteId);
    setDeleting(false);
    if (result.success) {
      toast.success("Client deleted");
      setDeleteId(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await getClientsForExport();
      const headers = [
        "Client Code", "Name", "Company", "Type", "Phone", "Email",
        "Address", "City", "State", "Country", "Total Orders",
        "Total Paid", "Outstanding", "Status", "Payment Terms", "Created",
      ];
      const rows = data.map(c => [
        c.clientCode, c.name, c.companyName, c.clientType, c.phone,
        c.email, c.address, c.city, c.state, c.country,
        String(c.totalOrders), String(c.totalPaid), String(c.outstandingBalance),
        c.status, c.paymentTerms, c.createdAt,
      ]);
      const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${(v ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `clients_export_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed");
    }
    setExporting(false);
  };

  const getLastOrderDate = useCallback((orders: SerializedClient["orders"]) => {
    if (orders.length === 0) return null;
    return orders.reduce((latest, o) => o.createdAt > latest ? o.createdAt : latest, orders[0].createdAt);
  }, []);

  const columns: Column<SerializedClient>[] = useMemo(() => [
    {
      key: "clientCode",
      header: "Code",
      render: (c) => (
        <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
          {c.clientCode ?? "—"}
        </span>
      ),
    },
    {
      key: "name",
      header: "Client",
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {c.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{c.name}</p>
            {c.companyName && <p className="text-xs text-gray-500 truncate">{c.companyName}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "clientType",
      header: "Type",
      render: (c) => (
        <Badge variant="secondary" className="text-xs">
          {(c.clientType || "INDIVIDUAL").replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (c) => <span className="text-sm">{c.phone ?? "—"}</span>,
    },
    {
      key: "email",
      header: "Email",
      render: (c) => <span className="text-sm truncate max-w-[160px] block">{c.email ?? "—"}</span>,
    },
    {
      key: "orders",
      header: "Orders",
      render: (c) => (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
          {c._count.orders}
        </span>
      ),
    },
    {
      key: "paid",
      header: "Total Revenue",
      render: (c) => (
        <span className="font-medium text-emerald-700">
          {formatCurrency(c.payments.reduce((s, p) => s + p.amount, 0))}
        </span>
      ),
    },
    {
      key: "lastOrder",
      header: "Last Order",
      render: (c) => {
        const lastDate = getLastOrderDate(c.orders);
        return <span className="text-xs text-gray-500">{lastDate ? formatDate(lastDate) : "—"}</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex items-center gap-1">
          <Link href={`/dashboard/clients/${c.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {canManage && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => setDeleteId(c.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ], [canManage, getLastOrderDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your client relationships · {total} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {(statusFilter || clientTypeFilter) && (
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export"}
          </Button>
          {canManage && (
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New Client
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-gray-600 whitespace-nowrap">Status:</Label>
            <Select
              options={[{ value: "", label: "All" }, ...CLIENT_STATUSES.map(s => ({ value: s.value, label: s.label }))]}
              value={statusFilter}
              onChange={(e) => updateParams({ status: e.target.value, page: "1" })}
              className="w-36 h-8 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-gray-600 whitespace-nowrap">Type:</Label>
            <Select
              options={[{ value: "", label: "All" }, ...CLIENT_TYPES.map(t => ({ value: t.value, label: t.label }))]}
              value={clientTypeFilter}
              onChange={(e) => updateParams({ clientType: e.target.value, page: "1" })}
              className="w-40 h-8 text-xs"
            />
          </div>
          {(statusFilter || clientTypeFilter) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs text-gray-500"
              onClick={() => updateParams({ status: "", clientType: "", page: "1" })}
            >
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={clients}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => updateParams({ page: String(p) })}
        onPageSizeChange={(ps) => updateParams({ pageSize: String(ps), page: "1" })}
        onSearch={(s) => updateParams({ search: s, page: "1" })}
        onSort={(by, order) => updateParams({ sortBy: by, sortOrder: order })}
        searchValue={searchValue}
        keyExtractor={(c) => c.id}
        emptyMessage="No clients found. Add your first client to get started."
        emptyAction={canManage ? <Button size="sm" onClick={() => setShowCreate(true)}>Add Client</Button> : undefined}
      />

      {/* ── Create Client Dialog ─────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent onClose={() => setShowCreate(false)} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* 1. Basic Information */}
            <FormSection icon={<User className="h-4 w-4 text-indigo-500" />} title="Basic Information">
              <div className="space-y-2">
                <Label>Client Name <span className="text-red-500">*</span></Label>
                <Input {...register("name")} placeholder="Enter client name" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client Type</Label>
                  <Select
                    options={CLIENT_TYPES.map(t => ({ value: t.value, label: t.label }))}
                    {...register("clientType")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company / Brand Name</Label>
                  <Input {...register("companyName")} placeholder="Company name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Client Code <span className="text-xs text-gray-400">(auto-generated if empty)</span></Label>
                <Input {...register("clientCode")} placeholder="e.g. CLT-2607-0001" />
              </div>
            </FormSection>

            {/* 2. Contact Information */}
            <FormSection icon={<Phone className="h-4 w-4 text-emerald-500" />} title="Contact Information">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Phone <span className="text-red-500">*</span></Label>
                  <Input {...register("phone")} placeholder="+91 98765 43210" />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Secondary Phone</Label>
                  <Input {...register("secondaryPhone")} placeholder="Optional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>WhatsApp Number</Label>
                  <Input {...register("whatsappNumber")} placeholder="WhatsApp number" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" {...register("email")} placeholder="client@example.com" />
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input {...register("website")} placeholder="https://www.example.com" />
              </div>
            </FormSection>

            {/* 3. Address */}
            <FormSection icon={<MapPin className="h-4 w-4 text-rose-500" />} title="Address Information" defaultOpen={false}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input {...register("country")} placeholder="India" />
                </div>
                <div className="space-y-2">
                  <Label>State / Province</Label>
                  <Input {...register("state")} placeholder="State" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input {...register("city")} placeholder="City" />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input {...register("postalCode")} placeholder="Postal code" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Full Address</Label>
                <Textarea {...register("address")} placeholder="Complete address" />
              </div>
            </FormSection>

            {/* 4. Business Information */}
            <FormSection icon={<Building2 className="h-4 w-4 text-amber-500" />} title="Business Information" defaultOpen={false}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input {...register("contactPerson")} placeholder="Contact person name" />
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Input {...register("designation")} placeholder="e.g. Manager, Owner" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tax / GST Number</Label>
                  <Input {...register("taxNumber")} placeholder="GST / VAT / Tax ID" />
                </div>
                <div className="space-y-2">
                  <Label>Business Registration No.</Label>
                  <Input {...register("businessRegNumber")} placeholder="Registration number" />
                </div>
              </div>
            </FormSection>

            {/* 5. Financial Information */}
            <FormSection icon={<CreditCard className="h-4 w-4 text-blue-500" />} title="Financial Information" defaultOpen={false}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select
                    options={[{ value: "", label: "Select" }, ...PAYMENT_TERMS.map(t => ({ value: t.value, label: t.label }))]}
                    {...register("paymentTerms")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Payment Method</Label>
                  <Select
                    options={[{ value: "", label: "Select" }, ...PAYMENT_METHODS.map(m => ({ value: m.value, label: m.label }))]}
                    {...register("preferredPaymentMethod")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Credit Limit</Label>
                  <Input type="number" step="0.01" {...register("creditLimit")} placeholder="0.00" />
                  {errors.creditLimit && <p className="text-xs text-red-500">{errors.creditLimit.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Opening Balance</Label>
                  <Input type="number" step="0.01" {...register("openingBalance")} placeholder="0.00" />
                  {errors.openingBalance && <p className="text-xs text-red-500">{errors.openingBalance.message}</p>}
                </div>
              </div>
            </FormSection>

            {/* 6. Order Preferences */}
            <FormSection icon={<Palette className="h-4 w-4 text-purple-500" />} title="Order Preferences" defaultOpen={false}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preferred Garment Type</Label>
                  <Input {...register("preferredGarmentType")} placeholder="e.g. T-Shirt, Kurta" />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Fabric</Label>
                  <Input {...register("preferredFabric")} placeholder="e.g. Cotton, Silk" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preferred Colour</Label>
                  <Input {...register("preferredColour")} placeholder="e.g. Navy, White" />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Size Chart</Label>
                  <Input {...register("preferredSizeChart")} placeholder="e.g. S-M-L-XL" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Preferred Delivery Method</Label>
                <Input {...register("preferredDeliveryMethod")} placeholder="e.g. Courier, Pickup" />
              </div>
            </FormSection>

            {/* 7. Internal */}
            <FormSection icon={<Settings2 className="h-4 w-4 text-gray-500" />} title="Internal Information" defaultOpen={false}>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  options={CLIENT_STATUSES.map(s => ({ value: s.value, label: s.label }))}
                  {...register("status")}
                />
              </div>
              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea {...register("internalNotes")} placeholder="Internal notes (not visible to client)" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Special Instructions</Label>
                <Textarea {...register("specialInstructions")} placeholder="Special handling instructions" rows={3} />
              </div>
            </FormSection>

            <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Client"
        description="Are you sure? Clients with existing orders cannot be deleted. This action cannot be undone."
        onConfirm={onDelete}
        loading={deleting}
      />
    </div>
  );
}
