"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency } from "@/lib/utils";
import { createClient, deleteClient } from "@/actions/clients";
import { toast } from "sonner";
import { Plus, Eye, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClientSchema, type CreateClientInput } from "@/lib/validations/clients";
import Link from "next/link";
import type { Role } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

interface SerializedClient { id: string; name: string; phone: string | null; email: string | null; address: string | null; paymentTerms: string | null; createdAt: string; updatedAt: string; _count: { orders: number }; payments: { amount: number }[]; orders: { totalPieces: number; status: string }[] }
interface Props { clients: SerializedClient[]; total: number; page: number; pageSize: number; role: Role; searchValue: string }

export default function ClientsClient({ clients, total, page, pageSize, role, searchValue }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const canManage = hasPermission(role, "client_management");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateClientInput>({ resolver: zodResolver(createClientSchema) as any });

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => { if (v) params.set(k, v); else params.delete(k); });
    router.push(`${pathname}?${params.toString()}`);
  };

  const onSubmit = async (data: CreateClientInput) => {
    const result = await createClient(data);
    if (result.success) { toast.success("Client created"); setShowCreate(false); reset(); router.refresh(); } else toast.error(result.error);
  };

  const onDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const result = await deleteClient(deleteId);
    setDeleting(false);
    if (result.success) { toast.success("Client deleted"); setDeleteId(null); router.refresh(); } else toast.error(result.error);
  };

  const columns: Column<SerializedClient>[] = [
    { key: "name", header: "Name", sortable: true, render: (c) => <span className="font-medium text-gray-900">{c.name}</span> },
    { key: "phone", header: "Phone", render: (c) => c.phone ?? "—" },
    { key: "email", header: "Email", render: (c) => c.email ?? "—" },
    { key: "orders", header: "Orders", render: (c) => c._count.orders },
    { key: "paid", header: "Total Paid", render: (c) => formatCurrency(c.payments.reduce((s, p) => s + p.amount, 0)) },
    { key: "actions", header: "", render: (c) => (
      <div className="flex items-center gap-1">
        <Link href={`/dashboard/clients/${c.id}`}><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button></Link>
        {canManage && <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4" /></Button>}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Clients</h1><p className="text-sm text-gray-500 mt-1">Manage your client relationships</p></div>
        {canManage && <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="h-4 w-4" /> New Client</Button>}
      </div>
      <DataTable columns={columns} data={clients} total={total} page={page} pageSize={pageSize} onPageChange={(p) => updateParams({ page: String(p) })} onPageSizeChange={(ps) => updateParams({ pageSize: String(ps), page: "1" })} onSearch={(s) => updateParams({ search: s, page: "1" })} onSort={(by, order) => updateParams({ sortBy: by, sortOrder: order })} searchValue={searchValue} keyExtractor={(c) => c.id} emptyMessage="No clients found. Add your first client to get started." emptyAction={canManage ? <Button size="sm" onClick={() => setShowCreate(true)}>Add Client</Button> : undefined} />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent onClose={() => setShowCreate(false)}>
          <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input {...register("name")} />{errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input {...register("phone")} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" {...register("email")} />{errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}</div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Textarea {...register("address")} /></div>
            <div className="space-y-2"><Label>Payment Terms</Label><Input {...register("paymentTerms")} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Client" description="Are you sure? Clients with existing orders cannot be deleted." onConfirm={onDelete} loading={deleting} />
    </div>
  );
}
