"use client";

import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: {
    value: number;
    label?: string;
    positive?: boolean;
  };
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  change,
  className,
}: StatsCardProps) {
  const isPositive = change?.positive ?? (change != null && change.value >= 0);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100">
          <Icon className="size-5 text-blue-600" />
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-bold text-foreground sm:text-3xl">
          {value}
        </span>
        {change != null && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-sm font-medium",
              isPositive ? "text-emerald-400" : "text-destructive"
            )}
          >
            {isPositive ? (
              <TrendingUp className="size-4" />
            ) : (
              <TrendingDown className="size-4" />
            )}
            {Math.abs(change.value)}%
            {change.label && (
              <span className="ml-0.5 text-muted-foreground">
                {change.label}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
