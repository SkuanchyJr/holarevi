import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  iconClassName?: string;
  trend?: { value: number; label: string; unit?: string };
  className?: string;
  "data-testid"?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  iconClassName,
  trend,
  className,
  "data-testid": testId,
}: StatCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 flex flex-col gap-3",
        className
      )}
      data-testid={testId}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center",
            iconClassName ?? "bg-primary/10 text-primary"
          )}
        >
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {trend && (
        <div className={cn("flex items-center gap-1 text-xs font-medium", isPositive ? "text-green-600 dark:text-green-400" : "text-red-500")}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isPositive ? "+" : ""}{trend.value}{trend.unit ?? "%"} {trend.label}
        </div>
      )}
    </div>
  );
}
