import { auth } from "@/lib/auth";
import { getDashboardStats, getOrderStatusBreakdown, getTopWorkers, getIncomeVsExpenses, getRecentActivity } from "@/actions/dashboard";
import { getPendingApprovals } from "@/actions/orders";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user?.role as Role;
  const showFull = hasPermission(role, "dashboard_full");

  const [stats, statusBreakdown, topWorkers, incomeVsExpenses, recentActivity, pendingCount] = await Promise.all([
    showFull ? getDashboardStats() : null,
    showFull ? getOrderStatusBreakdown() : null,
    showFull ? getTopWorkers() : null,
    showFull ? getIncomeVsExpenses() : null,
    showFull ? getRecentActivity() : null,
    getPendingApprovals(),
  ]);

  return (
    <DashboardClient
      userName={session?.user?.name ?? ""}
      role={role}
      stats={stats}
      statusBreakdown={statusBreakdown}
      topWorkers={topWorkers}
      incomeVsExpenses={incomeVsExpenses}
      recentActivity={recentActivity ? recentActivity.map(a => ({ ...a, createdAt: a.createdAt.toISOString(), metadata: a.metadata as Record<string, unknown> })) : null}
      pendingCount={pendingCount}
    />
  );
}
