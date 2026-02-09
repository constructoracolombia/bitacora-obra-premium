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
        "flex flex-col gap-4 rounded-2xl border border-[#D2D2D7]/60 bg-white p-5 transition-all duration-200 hover:shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-[#86868B]">{title}</p>
        <div className="flex size-9 items-center justify-center rounded-xl bg-[#007AFF]/10">
          <Icon className="size-[18px] text-[#007AFF]" />
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-semibold tracking-tight text-[#1D1D1F] sm:text-3xl">
          {value}
        </span>
        {change != null && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-[13px] font-medium",
              isPositive ? "text-[#34C759]" : "text-[#FF3B30]"
            )}
          >
            {isPositive ? (
              <TrendingUp className="size-4" />
            ) : (
              <TrendingDown className="size-4" />
            )}
            {Math.abs(change.value)}%
            {change.label && (
              <span className="ml-0.5 text-[#86868B]">
                {change.label}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
