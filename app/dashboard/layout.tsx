import { SessionProvider } from "next-auth/react";
import DashboardLayoutClient from "./layout-client";
import { getPendingApprovals } from "@/actions/orders";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pendingApprovals = await getPendingApprovals();

  return (
    <SessionProvider>
      <DashboardLayoutClient pendingApprovals={pendingApprovals}>
        {children}
      </DashboardLayoutClient>
    </SessionProvider>
  );
}
