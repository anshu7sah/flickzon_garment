"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency, formatDate, calculatePercentage } from "@/lib/utils";
import { createWorkerPayment, updateWageConfig } from "@/actions/workers";
import { toast } from "sonner";
import { ArrowLeft, Plus, DollarSign, Briefcase, Clock, Settings } from "lucide-react";
import Link from "next/link";
import type { Role } from "@prisma/client";

interface WorkerSerialized {
  id: string; name: string; email: string; role: string; isActive: boolean; permissions: Record<string, boolean>; createdAt: string; updatedAt: string;
  orderAssignments: { id: string; orderId: string; workerId: string; assignedPieces: number; completedPieces: number; createdAt: string; updatedAt: string; order: { id: string; orderNumber: string; status: string; totalPieces: number }; pieceLogs: { id: string; pieces: number; status: string; note: string | null; createdAt: string; updatedAt: string; loggedBy: { id: string; name: string } }[] }[];
  wageConfigs: { id: string; wageType: string; ratePerPiece: number | null; dailyRate: number | null; monthlyRate: number | null; effectiveFrom: string }[];
  workerPayments: { id: string; amount: number; type: string; date: string; note: string | null; status: string; createdAt: string }[];
}
interface Props { worker: WorkerSerialized; role: Role }

export default function WorkerDetailClient({ worker, role }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("assignments");
  const [showPayment, setShowPayment] = useState(false);
  const [showWage, setShowWage] = useState(false);
  const [payData, setPayData] = useState({ amount: "", type: "SALARY", date: new Date().toISOString().split("T")[0], note: "", status: "PENDING" });
  const currentWage = worker.wageConfigs[0];
  const [wageData, setWageData] = useState({ wageType: currentWage?.wageType ?? "PIECE_RATE", ratePerPiece: String(currentWage?.ratePerPiece ?? ""), dailyRate: String(currentWage?.dailyRate ?? ""), monthlyRate: String(currentWage?.monthlyRate ?? "") });
  const [loading, setLoading] = useState(false);
  const canPay = hasPermission(role, "worker_pay_management");

  const totalApprovedPieces = worker.orderAssignments.reduce((s, a) => s + a.completedPieces, 0);
  const totalPaid = worker.workerPayments.filter(p => p.status === "PAID" && p.type !== "DEDUCTION").reduce((s, p) => s + p.amount, 0);
  const totalDeductions = worker.workerPayments.filter(p => p.type === "DEDUCTION").reduce((s, p) => s + p.amount, 0);
  let earnings = 0;
  if (currentWage?.wageType === "PIECE_RATE" && currentWage.ratePerPiece) earnings = totalApprovedPieces * currentWage.ratePerPiece;
  else if (currentWage?.wageType === "DAILY" && currentWage.dailyRate) earnings = currentWage.dailyRate * 30;
  else if (currentWage?.wageType === "MONTHLY" && currentWage.monthlyRate) earnings = currentWage.monthlyRate;

  const handlePayment = async () => {
    setLoading(true);
    const result = await createWorkerPayment({ workerId: worker.id, amount: Number(payData.amount), type: payData.type as "SALARY"|"ADVANCE"|"BONUS"|"DEDUCTION", date: payData.date, note: payData.note || undefined, status: payData.status as "PENDING"|"PAID" });
    setLoading(false);
    if (result.success) { toast.success("Payment recorded"); setShowPayment(false); router.refresh(); } else toast.error(result.error);
  };

  const handleWageUpdate = async () => {
    setLoading(true);
    const result = await updateWageConfig({ workerId: worker.id, wageType: wageData.wageType as "PIECE_RATE"|"DAILY"|"MONTHLY", ratePerPiece: wageData.ratePerPiece ? Number(wageData.ratePerPiece) : undefined, dailyRate: wageData.dailyRate ? Number(wageData.dailyRate) : undefined, monthlyRate: wageData.monthlyRate ? Number(wageData.monthlyRate) : undefined });
    setLoading(false);
    if (result.success) { toast.success("Wage config updated"); setShowWage(false); router.refresh(); } else toast.error(result.error);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/workers"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-gray-900">{worker.name}</h1><Badge variant={worker.isActive ? "success" : "secondary"}>{worker.isActive ? "Active" : "Inactive"}</Badge></div>
          <p className="text-sm text-gray-500">{worker.email} • Joined {formatDate(worker.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          {canPay && <Button variant="outline" onClick={() => setShowWage(true)} className="gap-2"><Settings className="h-4 w-4" /> Wage Config</Button>}
          {canPay && <Button onClick={() => setShowPayment(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Payment</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Total Pieces</p><p className="text-2xl font-bold">{totalApprovedPieces}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Calculated Earnings</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(earnings)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Total Paid</p><p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Wage Type</p><p className="text-2xl font-bold">{currentWage ? currentWage.wageType.replace("_", " ") : "Not Set"}</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="assignments"><Briefcase className="h-4 w-4 mr-1.5" /> Assignments</TabsTrigger>
          <TabsTrigger value="pieceLogs"><Clock className="h-4 w-4 mr-1.5" /> Piece Logs</TabsTrigger>
          <TabsTrigger value="payments"><DollarSign className="h-4 w-4 mr-1.5" /> Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments">
          <Card><CardContent className="pt-6">
            {worker.orderAssignments.length === 0 ? <p className="text-sm text-gray-500 text-center py-6">No assignments.</p> : (
              <div className="space-y-3">{worker.orderAssignments.map(a => {
                const pct = calculatePercentage(a.completedPieces, a.assignedPieces);
                return (
                  <Link key={a.id} href={`/dashboard/orders/${a.orderId}`} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div><p className="font-medium text-indigo-600">{a.order.orderNumber}</p><StatusBadge status={a.order.status} /></div>
                    <div className="text-right"><p className="text-sm font-medium">{a.completedPieces}/{a.assignedPieces} pcs</p><div className="h-2 w-24 rounded-full bg-gray-200 mt-1"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} /></div></div>
                  </Link>
                );
              })}</div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="pieceLogs">
          <Card><CardContent className="pt-6">
            {worker.orderAssignments.every(a => a.pieceLogs.length === 0) ? <p className="text-sm text-gray-500 text-center py-6">No piece logs.</p> : (
              <div className="space-y-2">{worker.orderAssignments.flatMap(a => a.pieceLogs.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3"><span className="text-sm font-medium">{p.pieces} pcs</span><StatusBadge status={p.status} /><span className="text-xs text-gray-400">by {p.loggedBy.name}</span></div>
                  <Badge variant="outline">{formatDate(p.createdAt)}</Badge>
                </div>
              )))}</div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card><CardContent className="pt-6">
            {worker.workerPayments.length === 0 ? <p className="text-sm text-gray-500 text-center py-6">No payments.</p> : (
              <div className="space-y-2">{worker.workerPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div><p className="text-sm font-medium">{formatCurrency(p.amount)}</p><div className="flex items-center gap-2 mt-0.5"><Badge variant={p.type === "DEDUCTION" ? "destructive" : "outline"} className="text-xs">{p.type}</Badge><StatusBadge status={p.status} />{p.note && <span className="text-xs text-gray-400">{p.note}</span>}</div></div>
                  <Badge variant="outline">{formatDate(p.date)}</Badge>
                </div>
              ))}</div>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent onClose={() => setShowPayment(false)}>
          <DialogHeader><DialogTitle>Add Payment for {worker.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Amount</Label><Input type="number" step="0.01" value={payData.amount} onChange={e => setPayData(d => ({ ...d, amount: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label><Select options={[{ value: "SALARY", label: "Salary" }, { value: "ADVANCE", label: "Advance" }, { value: "BONUS", label: "Bonus" }, { value: "DEDUCTION", label: "Deduction" }]} value={payData.type} onChange={e => setPayData(d => ({ ...d, type: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Status</Label><Select options={[{ value: "PENDING", label: "Pending" }, { value: "PAID", label: "Paid" }]} value={payData.status} onChange={e => setPayData(d => ({ ...d, status: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={payData.date} onChange={e => setPayData(d => ({ ...d, date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Note</Label><Textarea value={payData.note} onChange={e => setPayData(d => ({ ...d, note: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button><Button onClick={handlePayment} disabled={loading}>{loading ? "Saving..." : "Record Payment"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWage} onOpenChange={setShowWage}>
        <DialogContent onClose={() => setShowWage(false)}>
          <DialogHeader><DialogTitle>Wage Configuration</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Wage Type</Label><Select options={[{ value: "PIECE_RATE", label: "Piece Rate" }, { value: "DAILY", label: "Daily" }, { value: "MONTHLY", label: "Monthly" }]} value={wageData.wageType} onChange={e => setWageData(d => ({ ...d, wageType: e.target.value }))} /></div>
            {wageData.wageType === "PIECE_RATE" && <div className="space-y-2"><Label>Rate Per Piece</Label><Input type="number" step="0.01" value={wageData.ratePerPiece} onChange={e => setWageData(d => ({ ...d, ratePerPiece: e.target.value }))} /></div>}
            {wageData.wageType === "DAILY" && <div className="space-y-2"><Label>Daily Rate</Label><Input type="number" step="0.01" value={wageData.dailyRate} onChange={e => setWageData(d => ({ ...d, dailyRate: e.target.value }))} /></div>}
            {wageData.wageType === "MONTHLY" && <div className="space-y-2"><Label>Monthly Rate</Label><Input type="number" step="0.01" value={wageData.monthlyRate} onChange={e => setWageData(d => ({ ...d, monthlyRate: e.target.value }))} /></div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowWage(false)}>Cancel</Button><Button onClick={handleWageUpdate} disabled={loading}>{loading ? "Saving..." : "Save Config"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
