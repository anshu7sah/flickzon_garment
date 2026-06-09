"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { createWorker } from "@/actions/workers";
import { toast } from "sonner";
import { Plus, Eye } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createWorkerSchema, type CreateWorkerInput } from "@/lib/validations/workers";
import Link from "next/link";
import type { Role } from "@prisma/client";

interface WorkerItem {
  id: string; name: string; email: string; role: string; isActive: boolean; permissions: Record<string, boolean>;
  createdAt: string; updatedAt: string;
  orderAssignments: { id: string; assignedPieces: number; completedPieces: number; order: { id: string; orderNumber: string; status: string } }[];
  wageConfigs: { id: string; wageType: string; ratePerPiece: number | null; dailyRate: number | null; monthlyRate: number | null; effectiveFrom: Date }[];
  workerPayments: { amount: number; type: string; status: string }[];
}
interface Props { workers: WorkerItem[]; total: number; page: number; pageSize: number; role: Role; searchValue: string }

export default function WorkersClient({ workers, total, page, pageSize, role, searchValue }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const canManage = hasPermission(role, "assign_workers");

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<CreateWorkerInput>({ resolver: zodResolver(createWorkerSchema) as any, defaultValues: { wageType: "PIECE_RATE" } });
  const wageType = watch("wageType");

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => { if (v) params.set(k, v); else params.delete(k); });
    router.push(`${pathname}?${params.toString()}`);
  };

  const onSubmit = async (data: CreateWorkerInput) => {
    const result = await createWorker(data);
    if (result.success) { toast.success("Worker created"); setShowCreate(false); reset(); router.refresh(); } else toast.error(result.error);
  };

  const columns: Column<WorkerItem>[] = [
    { key: "name", header: "Name", sortable: true, render: (w) => <span className="font-medium">{w.name}</span> },
    { key: "assignments", header: "Assignments", render: (w) => w.orderAssignments.filter(a => ["PENDING","IN_PROGRESS"].includes(a.order.status)).length },
    { key: "pieces", header: "Pieces (Total)", render: (w) => w.orderAssignments.reduce((s, a) => s + a.completedPieces, 0) },
    { key: "earnings", header: "Total Paid", render: (w) => formatCurrency(w.workerPayments.filter(p => p.status === "PAID").reduce((s, p) => s + (p.type === "DEDUCTION" ? -p.amount : p.amount), 0)) },
    { key: "wage", header: "Wage Type", render: (w) => { const cfg = w.wageConfigs[0]; return cfg ? <Badge variant="outline">{cfg.wageType.replace("_", " ")}</Badge> : "—"; } },
    { key: "status", header: "Status", render: (w) => <Badge variant={w.isActive ? "success" : "secondary"}>{w.isActive ? "Active" : "Inactive"}</Badge> },
    { key: "actions", header: "", render: (w) => (<Link href={`/dashboard/workers/${w.id}`}><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button></Link>) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Workers</h1><p className="text-sm text-gray-500 mt-1">Manage your workforce</p></div>
        {canManage && <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="h-4 w-4" /> New Worker</Button>}
      </div>
      <DataTable columns={columns} data={workers} total={total} page={page} pageSize={pageSize} onPageChange={(p) => updateParams({ page: String(p) })} onPageSizeChange={(ps) => updateParams({ pageSize: String(ps), page: "1" })} onSearch={(s) => updateParams({ search: s, page: "1" })} onSort={(by, order) => updateParams({ sortBy: by, sortOrder: order })} searchValue={searchValue} keyExtractor={(w) => w.id} emptyMessage="No workers found." emptyAction={canManage ? <Button size="sm" onClick={() => setShowCreate(true)}>Add Worker</Button> : undefined} />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent onClose={() => setShowCreate(false)} className="max-w-lg">
          <DialogHeader><DialogTitle>Add New Worker</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input {...register("name")} />{errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}</div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" {...register("email")} />{errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}</div>
            </div>
            <div className="space-y-2"><Label>Password</Label><Input type="password" {...register("password")} />{errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}</div>
            <div className="space-y-2"><Label>Wage Type</Label><Select options={[{ value: "PIECE_RATE", label: "Piece Rate" }, { value: "DAILY", label: "Daily" }, { value: "MONTHLY", label: "Monthly" }]} {...register("wageType")} /></div>
            {wageType === "PIECE_RATE" && <div className="space-y-2"><Label>Rate Per Piece</Label><Input type="number" step="0.01" {...register("ratePerPiece")} /></div>}
            {wageType === "DAILY" && <div className="space-y-2"><Label>Daily Rate</Label><Input type="number" step="0.01" {...register("dailyRate")} /></div>}
            {wageType === "MONTHLY" && <div className="space-y-2"><Label>Monthly Rate</Label><Input type="number" step="0.01" {...register("monthlyRate")} /></div>}
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Worker"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
