"use client";

import { Badge } from "@/components/ui/badge";
import { getStatusColor } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const colorClasses = getStatusColor(status);
  const displayStatus = status.replace(/_/g, " ");

  return (
    <Badge className={colorClasses} variant="outline">
      {displayStatus}
    </Badge>
  );
}

export { StatusBadge };
