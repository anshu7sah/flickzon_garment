import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  gradient?: string;
}

function StatCard({
  title,
  value,
  icon,
  trend,
  trendUp,
  className,
  gradient = "from-indigo-500 to-indigo-600",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p
              className={cn(
                "text-xs font-medium flex items-center gap-1",
                trendUp ? "text-emerald-600" : "text-red-500"
              )}
            >
              <span>{trendUp ? "↑" : "↓"}</span>
              {trend}
            </p>
          )}
        </div>
        <div
          className={cn(
            "rounded-xl bg-gradient-to-br p-3 text-white shadow-lg",
            gradient
          )}
        >
          {icon}
        </div>
      </div>
      <div
        className={cn(
          "absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r",
          gradient
        )}
      />
    </div>
  );
}

export { StatCard };
