"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Phone, Mail, MapPin, Globe, Building2, CreditCard, Package, DollarSign, TrendingUp, Calendar, ShoppingBag, BarChart3 } from "lucide-react";
import type { ClientStats } from "@/types";

interface OverviewTabProps {
  client: {
    phone: string | null; secondaryPhone: string | null; whatsappNumber: string | null;
    email: string | null; website: string | null; companyName: string | null;
    contactPerson: string | null; designation: string | null; taxNumber: string | null;
    businessRegNumber: string | null; country: string | null; state: string | null;
    city: string | null; postalCode: string | null; address: string | null;
    paymentTerms: string | null; creditLimit: number | null; openingBalance: number | null;
    preferredPaymentMethod: string | null; currency: string | null;
    preferredGarmentType: string | null; preferredFabric: string | null;
    preferredColour: string | null; preferredSizeChart: string | null;
    preferredDeliveryMethod: string | null; status: string; clientType: string;
  };
  stats: ClientStats;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function OverviewTab({ client, stats }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <StatCard title="Total Orders" value={String(stats.totalOrders)} icon={<Package className="h-5 w-5" />} gradient="from-blue-500 to-blue-600" />
        <StatCard title="Active Orders" value={String(stats.activeOrders)} icon={<ShoppingBag className="h-5 w-5" />} gradient="from-amber-500 to-amber-600" />
        <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={<DollarSign className="h-5 w-5" />} gradient="from-emerald-500 to-emerald-600" />
        <StatCard title="Outstanding" value={formatCurrency(Math.max(0, stats.outstandingBalance))} icon={<CreditCard className="h-5 w-5" />} gradient="from-rose-500 to-rose-600" />
        <StatCard title="Avg Order Value" value={formatCurrency(stats.averageOrderValue)} icon={<BarChart3 className="h-5 w-5" />} gradient="from-indigo-500 to-indigo-600" />
        <StatCard title="Total Pieces" value={String(stats.totalPiecesOrdered)} icon={<TrendingUp className="h-5 w-5" />} gradient="from-purple-500 to-purple-600" />
      </div>

      {/* Revenue summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider">This Month</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(stats.totalRevenueThisMonth)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider">This Year</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(stats.totalRevenueThisYear)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Last Order</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats.lastOrderDate ? formatDate(stats.lastOrderDate) : "No orders yet"}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Contact Details</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <InfoRow icon={<Phone className="h-4 w-4" />} label="Primary Phone" value={client.phone} />
            {client.secondaryPhone && <InfoRow icon={<Phone className="h-4 w-4" />} label="Secondary Phone" value={client.secondaryPhone} />}
            {client.whatsappNumber && <InfoRow icon={<Phone className="h-4 w-4" />} label="WhatsApp" value={client.whatsappNumber} />}
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={client.email} />
            {client.website && <InfoRow icon={<Globe className="h-4 w-4" />} label="Website" value={client.website} />}
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader><CardTitle className="text-base">Address</CardTitle></CardHeader>
          <CardContent>
            <InfoRow icon={<MapPin className="h-4 w-4" />} label="Full Address" value={[client.address, client.city, client.state, client.postalCode, client.country].filter(Boolean).join(", ") || null} />
          </CardContent>
        </Card>

        {/* Business Info */}
        {(client.contactPerson || client.taxNumber || client.businessRegNumber) && (
          <Card>
            <CardHeader><CardTitle className="text-base">Business Information</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {client.contactPerson && <InfoRow icon={<Building2 className="h-4 w-4" />} label="Contact Person" value={`${client.contactPerson}${client.designation ? ` — ${client.designation}` : ""}`} />}
              {client.taxNumber && <InfoRow icon={<CreditCard className="h-4 w-4" />} label="Tax / GST Number" value={client.taxNumber} />}
              {client.businessRegNumber && <InfoRow icon={<CreditCard className="h-4 w-4" />} label="Business Reg. Number" value={client.businessRegNumber} />}
            </CardContent>
          </Card>
        )}

        {/* Financial */}
        <Card>
          <CardHeader><CardTitle className="text-base">Financial Details</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <InfoRow icon={<CreditCard className="h-4 w-4" />} label="Payment Terms" value={client.paymentTerms?.replace(/_/g, " ") ?? null} />
            <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Credit Limit" value={client.creditLimit != null ? formatCurrency(client.creditLimit) : null} />
            <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Opening Balance" value={client.openingBalance != null ? formatCurrency(client.openingBalance) : null} />
            <InfoRow icon={<CreditCard className="h-4 w-4" />} label="Preferred Payment" value={client.preferredPaymentMethod} />
          </CardContent>
        </Card>
      </div>

      {/* Order Preferences */}
      {(client.preferredGarmentType || client.preferredFabric || client.preferredColour) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Order Preferences</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {client.preferredGarmentType && <Badge variant="outline">🧵 {client.preferredGarmentType}</Badge>}
              {client.preferredFabric && <Badge variant="outline">🧶 {client.preferredFabric}</Badge>}
              {client.preferredColour && <Badge variant="outline">🎨 {client.preferredColour}</Badge>}
              {client.preferredSizeChart && <Badge variant="outline">📏 {client.preferredSizeChart}</Badge>}
              {client.preferredDeliveryMethod && <Badge variant="outline">🚚 {client.preferredDeliveryMethod}</Badge>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
