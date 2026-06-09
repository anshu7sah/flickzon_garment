"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Navbar } from "@/components/dashboard/navbar";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Role } from "@prisma/client";

export default function DashboardLayoutClient({ children, pendingApprovals }: { children: React.ReactNode; pendingApprovals: number }) {
  const { data: session, status } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!session?.user) return null;

  const user = session.user as { name: string; email: string; role: Role };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className={cn("hidden lg:block", collapsed ? "w-[72px]" : "w-64")} />
      <div className="hidden lg:block">
        <Sidebar role={user.role} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="fixed left-0 top-0 h-full">
            <Sidebar role={user.role} collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar user={user} onMenuToggle={() => setMobileOpen(!mobileOpen)} pendingApprovals={pendingApprovals} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
