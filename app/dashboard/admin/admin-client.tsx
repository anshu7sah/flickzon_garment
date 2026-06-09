"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { createUser, updateUser, toggleUserPermission } from "@/actions/admin";
import { toast } from "sonner";
import { Plus, Edit, Shield, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUserInput } from "@/lib/validations/admin";

interface UserItem { id: string; name: string; email: string; role: string; isActive: boolean; permissions: Record<string, boolean>; createdAt: string }
interface AuditItem { id: string; userId: string; action: string; entity: string; entityId: string; metadata: Record<string, unknown>; createdAt: string; user: { name: string; email: string } }

interface Props {
  users: { data: UserItem[]; total: number; page: number; pageSize: number };
  auditLogs: { data: AuditItem[]; total: number; page: number; pageSize: number };
}

export default function AdminClient({ users, auditLogs }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("users");
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editData, setEditData] = useState({ name: "", email: "", role: "", isActive: true });
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateUserInput>({ resolver: zodResolver(createUserSchema) as any, defaultValues: { role: "WORKER" } });

  const onCreateSubmit = async (data: CreateUserInput) => {
    const result = await createUser(data);
    if (result.success) { toast.success("User created"); setShowCreate(false); reset(); router.refresh(); } else toast.error(result.error);
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setLoading(true);
    const result = await updateUser({ id: editUser.id, name: editData.name, email: editData.email, role: editData.role as "ADMIN"|"MANAGER"|"SUPERVISOR"|"WORKER", isActive: editData.isActive });
    setLoading(false);
    if (result.success) { toast.success("User updated"); setEditUser(null); router.refresh(); } else toast.error(result.error);
  };

  const handleTogglePermission = async (userId: string, permission: string, currentValue: boolean) => {
    const result = await toggleUserPermission(userId, permission, !currentValue);
    if (result.success) { toast.success("Permission updated"); router.refresh(); } else toast.error(result.error);
  };

  const openEdit = (user: UserItem) => {
    setEditUser(user);
    setEditData({ name: user.name, email: user.email, role: user.role, isActive: user.isActive });
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1><p className="text-sm text-gray-500 mt-1">Manage users and view system activity</p></div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="users"><Shield className="h-4 w-4 mr-1.5" /> Users</TabsTrigger>
          <TabsTrigger value="audit"><Clock className="h-4 w-4 mr-1.5" /> Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="space-y-4">
            <div className="flex justify-end"><Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="h-4 w-4" /> Create User</Button></div>
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Can Log Pieces</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr></thead>
                    <tbody>
                      {users.data.map(user => (
                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{user.name}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">{user.email}</td>
                          <td className="px-4 py-3.5"><Badge variant={user.role === "ADMIN" ? "default" : user.role === "MANAGER" ? "success" : user.role === "SUPERVISOR" ? "warning" : "secondary"}>{user.role}</Badge></td>
                          <td className="px-4 py-3.5"><Badge variant={user.isActive ? "success" : "secondary"}>{user.isActive ? "Active" : "Inactive"}</Badge></td>
                          <td className="px-4 py-3.5">
                            <button onClick={() => handleTogglePermission(user.id, "canLogPieces", !!user.permissions?.canLogPieces)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${user.permissions?.canLogPieces ? "bg-indigo-600" : "bg-gray-300"}`}>
                              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${user.permissions?.canLogPieces ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                          </td>
                          <td className="px-4 py-3.5"><Button variant="ghost" size="sm" onClick={() => openEdit(user)} className="gap-1"><Edit className="h-3.5 w-3.5" /> Edit</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle>System Activity Log</CardTitle></CardHeader>
            <CardContent>
              {auditLogs.data.length === 0 ? <p className="text-sm text-gray-500 text-center py-8">No activity logged yet.</p> : (
                <div className="space-y-2">{auditLogs.data.map(log => (
                  <div key={log.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center"><span className="text-xs font-medium text-indigo-600">{log.user.name.charAt(0)}</span></div>
                      <div><p className="text-sm"><span className="font-medium">{log.user.name}</span> <span className="text-gray-500">{log.action.toLowerCase().replace(/_/g, " ")}</span> <span className="font-medium">{log.entity}</span></p><p className="text-xs text-gray-400">{log.user.email}</p></div>
                    </div>
                    <Badge variant="outline" className="text-xs">{formatDate(log.createdAt)}</Badge>
                  </div>
                ))}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent onClose={() => setShowCreate(false)}>
          <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input {...register("name")} />{errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}</div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" {...register("email")} />{errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}</div>
            <div className="space-y-2"><Label>Password</Label><Input type="password" {...register("password")} />{errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}</div>
            <div className="space-y-2"><Label>Role</Label><Select options={[{ value: "ADMIN", label: "Admin" }, { value: "MANAGER", label: "Manager" }, { value: "SUPERVISOR", label: "Supervisor" }, { value: "WORKER", label: "Worker" }]} {...register("role")} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create User"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent onClose={() => setEditUser(null)}>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={editData.email} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Role</Label><Select options={[{ value: "ADMIN", label: "Admin" }, { value: "MANAGER", label: "Manager" }, { value: "SUPERVISOR", label: "Supervisor" }, { value: "WORKER", label: "Worker" }]} value={editData.role} onChange={e => setEditData(d => ({ ...d, role: e.target.value }))} /></div>
            <div className="flex items-center gap-3">
              <Label>Active</Label>
              <button onClick={() => setEditData(d => ({ ...d, isActive: !d.isActive }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${editData.isActive ? "bg-indigo-600" : "bg-gray-300"}`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${editData.isActive ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button><Button onClick={handleEdit} disabled={loading}>{loading ? "Saving..." : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
