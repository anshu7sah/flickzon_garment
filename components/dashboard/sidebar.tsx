"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";
import { hasPermission, type Permission } from "@/lib/permissions";
import {
  LayoutDashboard,
  Package,
  Users,
  HardHat,
  Receipt,
  DollarSign,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  Scissors,
  Layers,
} from "lucide-react";

interface SidebarProps {
  role: Role;
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission?: Permission;
  roles?: Role[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: "Orders",
    href: "/dashboard/orders",
    icon: <Package className="h-5 w-5" />,
  },
  {
    label: "Clients",
    href: "/dashboard/clients",
    icon: <Users className="h-5 w-5" />,
    permission: "client_management",
  },
  {
    label: "Workers",
    href: "/dashboard/workers",
    icon: <HardHat className="h-5 w-5" />,
  },
  {
    label: "Materials",
    href: "/dashboard/materials",
    icon: <Layers className="h-5 w-5" />,
    permission: "create_edit_orders",
  },
  {
    label: "Expenses",
    href: "/dashboard/expenses",
    icon: <Receipt className="h-5 w-5" />,
    permission: "expense_management",
  },
  {
    label: "Finance",
    href: "/dashboard/finance",
    icon: <DollarSign className="h-5 w-5" />,
    permission: "income_payments",
  },
  {
    label: "Admin",
    href: "/dashboard/admin",
    icon: <Shield className="h-5 w-5" />,
    permission: "user_management",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

function Sidebar({ role, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const filteredItems = navItems.filter((item) => {
    if (item.permission) {
      return hasPermission(role, item.permission);
    }
    if (item.roles) {
      return item.roles.includes(role);
    }
    return true;
  });

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-slate-900 transition-all duration-300 flex flex-col",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
            <Scissors className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-white tracking-tight">
              Flickzon
            </span>
          )}
        </Link>
        <button
          onClick={onToggle}
          className="rounded-md p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden lg:block"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-indigo-600/20 text-indigo-400 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              <span
                className={cn(
                  "transition-colors",
                  isActive ? "text-indigo-400" : ""
                )}
              >
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
              {isActive && (
                <div className="absolute left-0 h-8 w-1 rounded-r-full bg-indigo-500" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        {!collapsed && (
          <div className="rounded-lg bg-slate-800/50 p-3">
            <p className="text-xs text-slate-500">Garment Management</p>
            <p className="text-xs text-slate-400 mt-0.5">v1.0.0</p>
          </div>
        )}
      </div>
    </aside>
  );
}

export { Sidebar };
