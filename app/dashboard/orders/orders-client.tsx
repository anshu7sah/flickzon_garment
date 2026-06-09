"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { hasPermission } from "@/lib/permissions";
import { formatDate, calculatePercentage } from "@/lib/utils";
import { createOrder, deleteOrder } from "@/actions/orders";
import { toast } from "sonner";
import { Plus, Eye, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createOrderSchema, type CreateOrderInput } from "@/lib/validations/orders";
import Link from "next/link";
import type { Role } from "@prisma/client";

interface SerializedOrder {
  id: string; orderNumber: string; clientId: string; description: string | null; totalPieces: number;
  deadline: string | null; status: string; createdAt: string; updatedAt: string;
  client: { id: string; name: string };
  orderAssignments: { id: string; assignedPieces: number; completedPieces: number; worker: { id: string; name: string } }[];
}

interface Props {
  orders: SerializedOrder[]; total: number; page: number; pageSize: number;
  clients: { id: string; name: string }[]; role: Role; searchValue: string;
}

export default function OrdersClient({ orders, total, page, pageSize, clients, role, searchValue }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const canCreate = hasPermission(role, "create_edit_orders");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema) as any,
  });

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => { if (v) params.set(k, v); else params.delete(k); });
    router.push(`${pathname}?${params.toString()}`);
  };

  const onCreateSubmit = async (data: CreateOrderInput) => {
    const result = await createOrder(data);
    if (result.success) { toast.success("Order created successfully"); setShowCreate(false); reset(); router.refresh(); }
    else toast.error(result.error);
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
    { key: "orderNumber", header: "Order #", sortable: true, render: (o) => <span className="font-semibold text-indigo-600">{o.orderNumber}</span> },
    { key: "client", header: "Client", sortable: false, render: (o) => o.client.name },
    { key: "totalPieces", header: "Pieces", sortable: true, render: (o) => o.totalPieces.toLocaleString() },
    { key: "workers", header: "Workers", render: (o) => <span className="text-gray-600">{o.orderAssignments.length}</span> },
    { key: "completed", header: "Completed", render: (o) => {
      const done = o.orderAssignments.reduce((s, a) => s + a.completedPieces, 0);
      const pct = calculatePercentage(done, o.totalPieces);
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 rounded-full bg-gray-200 overflow-hidden"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} /></div>
          <span className="text-xs text-gray-500">{pct}%</span>
        </div>
      );
    }},
    { key: "deadline", header: "Deadline", sortable: true, render: (o) => o.deadline ? formatDate(o.deadline) : "—" },
    { key: "status", header: "Status", sortable: true, render: (o) => <StatusBadge status={o.status} /> },
    { key: "actions", header: "", render: (o) => (
      <div className="flex items-center gap-1">
        <Link href={`/dashboard/orders/${o.id}`}><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button></Link>
        {canCreate && <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => setDeleteId(o.id)}><Trash2 className="h-4 w-4" /></Button>}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Orders</h1><p className="text-sm text-gray-500 mt-1">Manage and track all garment orders</p></div>
        {canCreate && <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="h-4 w-4" /> New Order</Button>}
      </div>

      <DataTable columns={columns} data={orders} total={total} page={page} pageSize={pageSize}
        onPageChange={(p) => updateParams({ page: String(p) })}
        onPageSizeChange={(ps) => updateParams({ pageSize: String(ps), page: "1" })}
        onSearch={(s) => updateParams({ search: s, page: "1" })}
        onSort={(by, order) => updateParams({ sortBy: by, sortOrder: order })}
        searchValue={searchValue}
        keyExtractor={(o) => o.id}
        emptyMessage="No orders found. Create your first order to get started."
        emptyAction={canCreate ? <Button size="sm" onClick={() => setShowCreate(true)}>Create Order</Button> : undefined}
      />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent onClose={() => setShowCreate(false)} className="max-w-lg">
          <DialogHeader><DialogTitle>Create New Order</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select options={clients.map(c => ({ value: c.id, label: c.name }))} placeholder="Select a client" {...register("clientId")} />
              {errors.clientId && <p className="text-xs text-red-500">{errors.clientId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Order description..." {...register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Pieces</Label>
                <Input type="number" placeholder="0" {...register("totalPieces")} />
                {errors.totalPieces && <p className="text-xs text-red-500">{errors.totalPieces.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input type="date" {...register("deadline")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Order"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Order" description="Are you sure you want to delete this order? All assignments and piece logs will be removed." onConfirm={onDelete} loading={deleting} />
    </div>
  );
}
