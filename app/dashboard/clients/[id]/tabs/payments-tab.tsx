"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DollarSign, AlertCircle } from "lucide-react";

interface Payment {
  id: string; amount: number; date: string; method: string | null;
  note: string | null; createdAt: string; order: { orderNumber: string } | null;
}

export default function PaymentsTab({ payments, totalPaid, outstanding }: {
  payments: Payment[]; totalPaid: number; outstanding: number;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 text-white"><DollarSign className="h-5 w-5" /></div>
              <div><p className="text-sm text-gray-500">Total Paid</p><p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalPaid)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className={outstanding > 0 ? "border-rose-200 bg-rose-50/30" : "border-gray-200"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl bg-gradient-to-br p-3 text-white ${outstanding > 0 ? "from-rose-500 to-rose-600" : "from-gray-400 to-gray-500"}`}><AlertCircle className="h-5 w-5" /></div>
              <div><p className="text-sm text-gray-500">Outstanding</p><p className={`text-2xl font-bold ${outstanding > 0 ? "text-rose-700" : "text-gray-700"}`}>{formatCurrency(Math.max(0, outstanding))}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No payments recorded.</p>
          ) : (
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-3 px-4 rounded-lg border border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center"><DollarSign className="h-4 w-4 text-emerald-600" /></div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-gray-500">{p.method ?? "—"} {p.order ? `• ${p.order.orderNumber}` : ""} {p.note ? `• ${p.note}` : ""}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{formatDate(p.date)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
