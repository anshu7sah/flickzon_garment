"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import {
  createMaterial, updateMaterial, deleteMaterial,
  createClothType, deleteClothType,
  createFabricType, deleteFabricType,
} from "@/actions/materials";
import {
  createExtraDependency, deleteExtraDependency,
} from "@/actions/extra-dependencies";
import { toast } from "sonner";
import { Plus, Trash2, Edit, X, Package, Shirt, Layers, Wrench } from "lucide-react";
import type { Role } from "@prisma/client";
import type { MaterialItem, ClothTypeItem, FabricTypeItem, ExtraDependencyItem } from "@/types";

const MATERIAL_TYPES = [
  { value: "FABRIC", label: "Fabric" },
  { value: "ZIPPER", label: "Zipper" },
  { value: "DHAGA", label: "Dhaga (Thread)" },
  { value: "BUTTON", label: "Button" },
  { value: "ELASTIC", label: "Elastic" },
  { value: "LACE", label: "Lace" },
  { value: "OTHER", label: "Other" },
];

const MATERIAL_UNITS = [
  { value: "KG", label: "Kilogram (kg)" },
  { value: "METER", label: "Meter (m)" },
  { value: "PIECE", label: "Per Piece" },
  { value: "ROLL", label: "Per Roll" },
  { value: "DOZEN", label: "Per Dozen" },
];

const TYPES_WITH_COLORS = ["FABRIC", "DHAGA", "ELASTIC", "LACE", "ZIPPER"];

interface Props {
  materials: MaterialItem[];
  total: number;
  page: number;
  pageSize: number;
  clothTypes: ClothTypeItem[];
  fabricTypes: FabricTypeItem[];
  extraDependencies: ExtraDependencyItem[];
  role: Role;
  searchValue: string;
}

export default function MaterialsClient({ materials, clothTypes, fabricTypes, extraDependencies, role }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("materials");
  const [showCreateMaterial, setShowCreateMaterial] = useState(false);
  const [editMaterial, setEditMaterial] = useState<MaterialItem | null>(null);
  const [deleteMaterialId, setDeleteMaterialId] = useState<string | null>(null);
  const [showCreateCloth, setShowCreateCloth] = useState(false);
  const [showCreateFabric, setShowCreateFabric] = useState(false);
  const [showCreateExtraDep, setShowCreateExtraDep] = useState(false);
  const [deleteClothId, setDeleteClothId] = useState<string | null>(null);
  const [deleteFabricId, setDeleteFabricId] = useState<string | null>(null);
  const [deleteExtraDepId, setDeleteExtraDepId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [matForm, setMatForm] = useState({ name: "", type: "FABRIC", unit: "KG", price: "", colors: [] as string[] });
  const [newColor, setNewColor] = useState("#000000");
  const [clothForm, setClothForm] = useState({ name: "", description: "" });
  const [fabricForm, setFabricForm] = useState({ name: "", description: "" });
  const [extraDepForm, setExtraDepForm] = useState({ name: "", defaultPrice: "", description: "" });

  const resetMatForm = () => {
    setMatForm({ name: "", type: "FABRIC", unit: "KG", price: "", colors: [] });
    setNewColor("#000000");
  };

  const openEditMaterial = (m: MaterialItem) => {
    setEditMaterial(m);
    setMatForm({ name: m.name, type: m.type, unit: m.unit, price: String(m.price), colors: m.colors ?? [] });
  };

  const showColorInput = TYPES_WITH_COLORS.includes(matForm.type);

  const addColor = () => {
    if (newColor && !matForm.colors.includes(newColor)) {
      setMatForm((d) => ({ ...d, colors: [...d.colors, newColor] }));
      setNewColor("#000000");
    }
  };

  const removeColor = (color: string) => {
    setMatForm((d) => ({ ...d, colors: d.colors.filter((c) => c !== color) }));
  };

  const handleCreateMaterial = async () => {
    setLoading(true);
    const result = await createMaterial({ ...matForm, price: Number(matForm.price) });
    setLoading(false);
    if (result.success) { toast.success("Material created"); setShowCreateMaterial(false); resetMatForm(); router.refresh(); }
    else toast.error(result.error);
  };

  const handleUpdateMaterial = async () => {
    if (!editMaterial) return;
    setLoading(true);
    const result = await updateMaterial({ ...matForm, id: editMaterial.id, price: Number(matForm.price) });
    setLoading(false);
    if (result.success) { toast.success("Material updated"); setEditMaterial(null); resetMatForm(); router.refresh(); }
    else toast.error(result.error);
  };

  const handleDeleteMaterial = async () => {
    if (!deleteMaterialId) return;
    setLoading(true);
    const result = await deleteMaterial(deleteMaterialId);
    setLoading(false);
    if (result.success) { toast.success("Material deleted"); setDeleteMaterialId(null); router.refresh(); }
    else toast.error(result.error);
  };

  const handleCreateCloth = async () => {
    setLoading(true);
    const result = await createClothType(clothForm);
    setLoading(false);
    if (result.success) { toast.success("Cloth type created"); setShowCreateCloth(false); setClothForm({ name: "", description: "" }); router.refresh(); }
    else toast.error(result.error);
  };

  const handleCreateFabric = async () => {
    setLoading(true);
    const result = await createFabricType(fabricForm);
    setLoading(false);
    if (result.success) { toast.success("Fabric type created"); setShowCreateFabric(false); setFabricForm({ name: "", description: "" }); router.refresh(); }
    else toast.error(result.error);
  };

  const handleCreateExtraDep = async () => {
    setLoading(true);
    const result = await createExtraDependency({
      name: extraDepForm.name,
      defaultPrice: Number(extraDepForm.defaultPrice),
      description: extraDepForm.description,
    });
    setLoading(false);
    if (result.success) { toast.success("Extra dependency created"); setShowCreateExtraDep(false); setExtraDepForm({ name: "", defaultPrice: "", description: "" }); router.refresh(); }
    else toast.error(result.error);
  };

  const handleDeleteCloth = async () => {
    if (!deleteClothId) return;
    setLoading(true);
    const result = await deleteClothType(deleteClothId);
    setLoading(false);
    if (result.success) { toast.success("Cloth type deleted"); setDeleteClothId(null); router.refresh(); }
    else toast.error(result.error);
  };

  const handleDeleteFabric = async () => {
    if (!deleteFabricId) return;
    setLoading(true);
    const result = await deleteFabricType(deleteFabricId);
    setLoading(false);
    if (result.success) { toast.success("Fabric type deleted"); setDeleteFabricId(null); router.refresh(); }
    else toast.error(result.error);
  };

  const handleDeleteExtraDep = async () => {
    if (!deleteExtraDepId) return;
    setLoading(true);
    const result = await deleteExtraDependency(deleteExtraDepId);
    setLoading(false);
    if (result.success) { toast.success("Extra dependency deleted"); setDeleteExtraDepId(null); router.refresh(); }
    else toast.error(result.error);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      FABRIC: "#6366f1", ZIPPER: "#f59e0b", DHAGA: "#ef4444",
      BUTTON: "#10b981", ELASTIC: "#8b5cf6", LACE: "#ec4899", OTHER: "#6b7280",
    };
    return colors[type] ?? "#6b7280";
  };

  const getUnitLabel = (unit: string) => {
    const labels: Record<string, string> = {
      KG: "per kg", METER: "per m", PIECE: "per pc", ROLL: "per roll", DOZEN: "per doz",
    };
    return labels[unit] ?? unit;
  };

  const materialFormContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Material Name</Label>
        <Input value={matForm.name} onChange={(e) => setMatForm((d) => ({ ...d, name: e.target.value }))} placeholder="e.g. Cotton Fabric, YKK Zipper" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            options={MATERIAL_TYPES}
            value={matForm.type}
            onChange={(e) => setMatForm((d) => ({ ...d, type: e.target.value, colors: TYPES_WITH_COLORS.includes(e.target.value) ? d.colors : [] }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Unit</Label>
          <Select options={MATERIAL_UNITS} value={matForm.unit} onChange={(e) => setMatForm((d) => ({ ...d, unit: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Price ({getUnitLabel(matForm.unit)})</Label>
        <Input type="number" step="0.01" value={matForm.price} onChange={(e) => setMatForm((d) => ({ ...d, price: e.target.value }))} placeholder="0.00" />
      </div>

      {showColorInput && (
        <div className="space-y-2">
          <Label>Available Colors</Label>
          <div className="flex items-center gap-2">
            <Input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-16 h-10 p-1 cursor-pointer" />
            <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} className="flex-1" placeholder="#000000" />
            <Button type="button" size="sm" variant="outline" onClick={addColor}>Add</Button>
          </div>
          {matForm.colors.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {matForm.colors.map((color) => (
                <span key={color} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border bg-white">
                  <span className="h-3.5 w-3.5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: color }} />
                  {color}
                  <button type="button" onClick={() => removeColor(color)} className="hover:text-red-500 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materials & Configurable Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Manage materials, cloth types, fabric types, and extra dependencies</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="materials">
            <Package className="h-4 w-4 mr-1.5" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="cloth-types">
            <Shirt className="h-4 w-4 mr-1.5" />
            Cloth Types
          </TabsTrigger>
          <TabsTrigger value="fabric-types">
            <Layers className="h-4 w-4 mr-1.5" />
            Fabric Types
          </TabsTrigger>
          <TabsTrigger value="extra-deps">
            <Wrench className="h-4 w-4 mr-1.5" />
            Extra Dependencies
          </TabsTrigger>
        </TabsList>

        {/* ── Materials Tab ────────────────────────────────────────── */}
        <TabsContent value="materials">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { resetMatForm(); setShowCreateMaterial(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Add Material
              </Button>
            </div>

            {materials.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No materials yet. Add your first material to get started.</p>
                  <Button size="sm" className="mt-3" onClick={() => { resetMatForm(); setShowCreateMaterial(true); }}>Add Material</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {materials.map((m) => (
                  <Card key={m.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${getTypeColor(m.type)}15` }}>
                            <Package className="h-4.5 w-4.5" style={{ color: getTypeColor(m.type) }} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{m.name}</p>
                            <Badge style={{ backgroundColor: `${getTypeColor(m.type)}15`, color: getTypeColor(m.type), borderColor: `${getTypeColor(m.type)}30` }}>
                              {m.type}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMaterial(m)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleteMaterialId(m.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
                        <span className="text-gray-500">{getUnitLabel(m.unit)}</span>
                        <span className="font-bold text-indigo-600">{formatCurrency(m.price)}</span>
                      </div>
                      {m.colors && m.colors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {m.colors.map((color) => (
                            <span key={color} className="h-5 w-5 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: color }} title={color} />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Cloth Types Tab ──────────────────────────────────────── */}
        <TabsContent value="cloth-types">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setClothForm({ name: "", description: "" }); setShowCreateCloth(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Add Cloth Type
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clothTypes.map((ct) => (
                <Card key={ct.id}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Shirt className="h-4.5 w-4.5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{ct.name}</p>
                          {ct.description && <p className="text-xs text-gray-500">{ct.description}</p>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleteClothId(ct.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="mt-3 text-xs text-gray-400 border-t border-gray-100 pt-2">
                      Used in {ct._count.orders} order{ct._count.orders !== 1 ? "s" : ""}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {clothTypes.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-gray-500">No cloth types defined. Add types like Hoodie, T-Shirt, Polo, etc.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Fabric Types Tab ─────────────────────────────────────── */}
        <TabsContent value="fabric-types">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setFabricForm({ name: "", description: "" }); setShowCreateFabric(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Add Fabric Type
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fabricTypes.map((ft) => (
                <Card key={ft.id}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                          <Layers className="h-4.5 w-4.5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{ft.name}</p>
                          {ft.description && <p className="text-xs text-gray-500">{ft.description}</p>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleteFabricId(ft.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="mt-3 text-xs text-gray-400 border-t border-gray-100 pt-2">
                      Used in {ft._count.orders} order{ft._count.orders !== 1 ? "s" : ""}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {fabricTypes.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-gray-500">No fabric types defined. Add types like Micro P, Cotton, Polyester, etc.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Extra Dependencies Tab ───────────────────────────────── */}
        <TabsContent value="extra-deps">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setExtraDepForm({ name: "", defaultPrice: "", description: "" }); setShowCreateExtraDep(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Add Extra Dependency
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {extraDependencies.map((ed) => (
                <Card key={ed.id}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                          <Wrench className="h-4.5 w-4.5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{ed.name}</p>
                          {ed.description && <p className="text-xs text-gray-500">{ed.description}</p>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleteExtraDepId(ed.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs border-t border-gray-100 pt-2">
                      <span className="text-gray-500">Default Price</span>
                      <span className="font-bold text-amber-600">{formatCurrency(ed.defaultPrice)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {extraDependencies.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-gray-500">No extra dependencies configured. Add Kaaj button, DTF order, DTF heat, etc.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ────────────────────────────────────────────────── */}
      <Dialog open={showCreateMaterial} onOpenChange={setShowCreateMaterial}>
        <DialogContent onClose={() => setShowCreateMaterial(false)} className="max-w-lg">
          <DialogHeader><DialogTitle>Add New Material</DialogTitle></DialogHeader>
          {materialFormContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateMaterial(false)}>Cancel</Button>
            <Button onClick={handleCreateMaterial} disabled={loading}>{loading ? "Creating..." : "Create Material"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editMaterial} onOpenChange={() => setEditMaterial(null)}>
        <DialogContent onClose={() => setEditMaterial(null)} className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Material</DialogTitle></DialogHeader>
          {materialFormContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMaterial(null)}>Cancel</Button>
            <Button onClick={handleUpdateMaterial} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateCloth} onOpenChange={setShowCreateCloth}>
        <DialogContent onClose={() => setShowCreateCloth(false)}>
          <DialogHeader><DialogTitle>Add Cloth Type</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={clothForm.name} onChange={(e) => setClothForm((d) => ({ ...d, name: e.target.value }))} placeholder="e.g. Hoodie, T-Shirt, Polo" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={clothForm.description} onChange={(e) => setClothForm((d) => ({ ...d, description: e.target.value }))} placeholder="Short description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCloth(false)}>Cancel</Button>
            <Button onClick={handleCreateCloth} disabled={loading}>{loading ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateFabric} onOpenChange={setShowCreateFabric}>
        <DialogContent onClose={() => setShowCreateFabric(false)}>
          <DialogHeader><DialogTitle>Add Fabric Type</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={fabricForm.name} onChange={(e) => setFabricForm((d) => ({ ...d, name: e.target.value }))} placeholder="e.g. Micro P, Cotton, Polyester" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={fabricForm.description} onChange={(e) => setFabricForm((d) => ({ ...d, description: e.target.value }))} placeholder="Short description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFabric(false)}>Cancel</Button>
            <Button onClick={handleCreateFabric} disabled={loading}>{loading ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Extra Dependency Dialog */}
      <Dialog open={showCreateExtraDep} onOpenChange={setShowCreateExtraDep}>
        <DialogContent onClose={() => setShowCreateExtraDep(false)}>
          <DialogHeader><DialogTitle>Add Extra Dependency</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Dependency Name</Label>
              <Input value={extraDepForm.name} onChange={(e) => setExtraDepForm((d) => ({ ...d, name: e.target.value }))} placeholder="e.g. Kaaj Button, DTF Order, DTF Heat" />
            </div>
            <div className="space-y-2">
              <Label>Default Rate / Price (₹)</Label>
              <Input type="number" step="0.01" value={extraDepForm.defaultPrice} onChange={(e) => setExtraDepForm((d) => ({ ...d, defaultPrice: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={extraDepForm.description} onChange={(e) => setExtraDepForm((d) => ({ ...d, description: e.target.value }))} placeholder="Notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateExtraDep(false)}>Cancel</Button>
            <Button onClick={handleCreateExtraDep} disabled={loading}>{loading ? "Creating..." : "Create Dependency"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteMaterialId} onOpenChange={() => setDeleteMaterialId(null)} title="Delete Material" description="Are you sure? Materials used in orders cannot be deleted." onConfirm={handleDeleteMaterial} loading={loading} />
      <ConfirmDialog open={!!deleteClothId} onOpenChange={() => setDeleteClothId(null)} title="Delete Cloth Type" description="Cloth types used in orders cannot be deleted." onConfirm={handleDeleteCloth} loading={loading} />
      <ConfirmDialog open={!!deleteFabricId} onOpenChange={() => setDeleteFabricId(null)} title="Delete Fabric Type" description="Fabric types used in orders cannot be deleted." onConfirm={handleDeleteFabric} loading={loading} />
      <ConfirmDialog open={!!deleteExtraDepId} onOpenChange={() => setDeleteExtraDepId(null)} title="Delete Extra Dependency" description="Extra dependencies used in orders cannot be deleted." onConfirm={handleDeleteExtraDep} loading={loading} />
    </div>
  );
}
