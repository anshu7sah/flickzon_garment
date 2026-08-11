"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate, calculatePercentage } from "@/lib/utils";
import { Search } from "lucide-react";
import Link from "next/link";

interface Order {
  id: string; orderNumber: string; totalPieces: number; status: string;
  deadline: string | null; createdAt: string; totalAmount: number;
  orderAssignments: { assignedPieces: number; completedPieces: number }[];
}

export default function OrdersTab({ orders }: { orders: Order[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    let result = orders;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(o => o.orderNumber.toLowerCase().includes(s));
    }
    if (statusFilter) result = result.filter(o => o.status === statusFilter);
    return result;
  }, [orders, search, statusFilter]);

  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  if (orders.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center">
        <p className="text-sm text-gray-500">No orders yet.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select
          options={[
            { value: "", label: "All Status" },
            { value: "ORDER_PLACED", label: "Order Placed" },
            { value: "CUTTING_IN_PROGRESS", label: "Cutting In Progress" },
            { value: "CUTTING_DONE", label: "Cutting Done" },
            { value: "STITCHING_IN_PROGRESS", label: "Stitching In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "DELIVERED", label: "Delivered" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="w-48"
        />
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Deadline</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pieces</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Progress</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(o => {
              const completed = o.orderAssignments.reduce((s, a) => s + a.completedPieces, 0);
              const pct = calculatePercentage(completed, o.totalPieces);
              return (
                <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/orders/${o.id}`} className="font-medium text-indigo-600 hover:underline">{o.orderNumber}</Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{o.deadline ? formatDate(o.deadline) : "—"}</td>
                  <td className="px-4 py-3 text-sm">{o.totalPieces}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-gray-200"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} /></div>
                      <span className="text-xs text-gray-500">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{formatCurrency(o.totalAmount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {(page-1)*perPage+1}–{Math.min(page*perPage, filtered.length)} of {filtered.length}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
