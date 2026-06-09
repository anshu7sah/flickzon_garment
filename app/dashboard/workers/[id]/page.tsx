import { getWorkerById } from "@/actions/workers";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import type { Role } from "@prisma/client";
import WorkerDetailClient from "./worker-detail-client";

export default async function WorkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [worker, session] = await Promise.all([getWorkerById(id), auth()]);
  if (!worker) notFound();
  const role = session?.user?.role as Role;
  const serialized = {
    ...worker,
    createdAt: worker.createdAt.toISOString(),
    updatedAt: worker.updatedAt.toISOString(),
    permissions: worker.permissions as Record<string, boolean>,
    orderAssignments: worker.orderAssignments.map(a => ({ ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString(), pieceLogs: a.pieceLogs.map(p => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })) })),
    wageConfigs: worker.wageConfigs.map(w => ({ ...w, effectiveFrom: w.effectiveFrom.toISOString() })),
    workerPayments: worker.workerPayments.map(p => ({ ...p, date: p.date.toISOString(), createdAt: p.createdAt.toISOString() })),
  };
  return <WorkerDetailClient worker={serialized} role={role} />;
}
