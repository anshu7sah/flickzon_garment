"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createExpense, deleteExpense, createExpenseCategory, deleteExpenseCategory } from "@/actions/expenses";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Role } from "@prisma/client";

interface ExpenseItem { id: string; categoryId: string; title: string; amount: number; date: string; note: string | null; createdAt: string; updatedAt: string; category: { id: string; name: string; color: string } }
interface CategoryItem { id: string; name: string; description: string | null; color: string; createdAt: string; totalExpenses: number; expenseCount: number }
interface MonthlyItem { name: string; color: string; total: number }
interface Props { expenses: ExpenseItem[]; total: number; page: number; pageSize: number; categories: CategoryItem[]; monthlyBreakdown: MonthlyItem[]; role: Role; searchValue: string }

export default function ExpensesClient({ expenses, total, page, pageSize, categories, monthlyBreakdown, role, searchValue }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState("expenses");
  const [showCreateExpense, setShowCreateExpense] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [deleteExpId, setDeleteExpId] = useState<string | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expForm, setExpForm] = useState({ categoryId: "", title: "", amount: "", date: new Date().toISOString().split("T")[0], note: "" });
  const [catForm, setCatForm] = useState({ name: "", description: "", color: "#6366f1" });

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => { if (v) params.set(k, v); else params.delete(k); });
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCreateExpense = async () => {
    setLoading(true);
    const result = await createExpense({ ...expForm, amount: Number(expForm.amount) });
    setLoading(false);
    if (result.success) { toast.success("Expense created"); setShowCreateExpense(false); setExpForm({ categoryId: "", title: "", amount: "", date: new Date().toISOString().split("T")[0], note: "" }); router.refresh(); }
    else toast.error(result.error);
  };

  const handleCreateCategory = async () => {
    setLoading(true);
    const result = await createExpenseCategory(catForm);
    setLoading(false);
    if (result.success) { toast.success("Category created"); setShowCreateCategory(false); setCatForm({ name: "", description: "", color: "#6366f1" }); router.refresh(); }
    else toast.error(result.error);
  };

  const handleDeleteExpense = async () => {
    if (!deleteExpId) return;
    setLoading(true);
    const result = await deleteExpense(deleteExpId);
    setLoading(false);
    if (result.success) { toast.success("Expense deleted"); setDeleteExpId(null); router.refresh(); } else toast.error(result.error);
  };

  const handleDeleteCategory = async () => {
    if (!deleteCatId) return;
    setLoading(true);
    const result = await deleteExpenseCategory(deleteCatId);
    setLoading(false);
    if (result.success) { toast.success("Category deleted"); setDeleteCatId(null); router.refresh(); } else toast.error(result.error);
  };

  const expenseColumns: Column<ExpenseItem>[] = [
    { key: "title", header: "Title", sortable: true, render: (e) => <span className="font-medium">{e.title}</span> },
    { key: "category", header: "Category", render: (e) => <Badge style={{ backgroundColor: `${e.category.color}20`, color: e.category.color, borderColor: `${e.category.color}40` }}>{e.category.name}</Badge> },
    { key: "amount", header: "Amount", sortable: true, render: (e) => formatCurrency(e.amount) },
    { key: "date", header: "Date", sortable: true, render: (e) => formatDate(e.date) },
    { key: "note", header: "Note", render: (e) => <span className="text-gray-500 text-xs">{e.note ?? "—"}</span> },
    { key: "actions", header: "", render: (e) => <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setDeleteExpId(e.id)}><Trash2 className="h-4 w-4" /></Button> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Expenses</h1><p className="text-sm text-gray-500 mt-1">Track and manage business expenses</p></div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <div className="space-y-4">
            <div className="flex justify-end"><Button onClick={() => setShowCreateExpense(true)} className="gap-2"><Plus className="h-4 w-4" /> New Expense</Button></div>
            <DataTable columns={expenseColumns} data={expenses} total={total} page={page} pageSize={pageSize} onPageChange={(p) => updateParams({ page: String(p) })} onPageSizeChange={(ps) => updateParams({ pageSize: String(ps), page: "1" })} onSearch={(s) => updateParams({ search: s, page: "1" })} onSort={(by, order) => updateParams({ sortBy: by, sortOrder: order })} searchValue={searchValue} keyExtractor={(e) => e.id} emptyMessage="No expenses found." emptyAction={<Button size="sm" onClick={() => setShowCreateExpense(true)}>Add Expense</Button>} />

            {monthlyBreakdown.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Monthly Breakdown by Category</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyBreakdown} layout="vertical" margin={{ left: 20 }}>
                        <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                        <Bar dataKey="total" radius={[0, 4, 4, 0]}>{monthlyBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <div className="space-y-4">
            <div className="flex justify-end"><Button onClick={() => setShowCreateCategory(true)} className="gap-2"><Plus className="h-4 w-4" /> New Category</Button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(cat => (
                <Card key={cat.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3"><div className="h-4 w-4 rounded-full" style={{ backgroundColor: cat.color }} /><div><p className="font-medium">{cat.name}</p>{cat.description && <p className="text-xs text-gray-500">{cat.description}</p>}</div></div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleteCatId(cat.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm"><span className="text-gray-500">{cat.expenseCount} expenses</span><span className="font-medium">{formatCurrency(cat.totalExpenses)}</span></div>
                  </CardContent>
                </Card>
              ))}
              {categories.length === 0 && <p className="text-sm text-gray-500 col-span-full text-center py-8">No categories. Create one to get started.</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateExpense} onOpenChange={setShowCreateExpense}>
        <DialogContent onClose={() => setShowCreateExpense(false)}>
          <DialogHeader><DialogTitle>New Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Category</Label><Select options={categories.map(c => ({ value: c.id, label: c.name }))} placeholder="Select category" value={expForm.categoryId} onChange={e => setExpForm(d => ({ ...d, categoryId: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Title</Label><Input value={expForm.title} onChange={e => setExpForm(d => ({ ...d, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount</Label><Input type="number" step="0.01" value={expForm.amount} onChange={e => setExpForm(d => ({ ...d, amount: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={expForm.date} onChange={e => setExpForm(d => ({ ...d, date: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Note</Label><Textarea value={expForm.note} onChange={e => setExpForm(d => ({ ...d, note: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreateExpense(false)}>Cancel</Button><Button onClick={handleCreateExpense} disabled={loading}>{loading ? "Creating..." : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateCategory} onOpenChange={setShowCreateCategory}>
        <DialogContent onClose={() => setShowCreateCategory(false)}>
          <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={catForm.name} onChange={e => setCatForm(d => ({ ...d, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={catForm.description} onChange={e => setCatForm(d => ({ ...d, description: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Color</Label><div className="flex items-center gap-3"><Input type="color" value={catForm.color} onChange={e => setCatForm(d => ({ ...d, color: e.target.value }))} className="w-16 h-10 p-1" /><span className="text-sm text-gray-500">{catForm.color}</span></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreateCategory(false)}>Cancel</Button><Button onClick={handleCreateCategory} disabled={loading}>{loading ? "Creating..." : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteExpId} onOpenChange={() => setDeleteExpId(null)} title="Delete Expense" description="Are you sure?" onConfirm={handleDeleteExpense} loading={loading} />
      <ConfirmDialog open={!!deleteCatId} onOpenChange={() => setDeleteCatId(null)} title="Delete Category" description="Categories with expenses cannot be deleted." onConfirm={handleDeleteCategory} loading={loading} />
    </div>
  );
}
