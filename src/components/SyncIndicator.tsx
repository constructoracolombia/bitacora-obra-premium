"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncIndicatorProps {
  className?: string;
}

export function SyncIndicator({ className }: SyncIndicatorProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700",
        className
      )}
    >
      <Check className="size-3.5 text-emerald-600" strokeWidth={2.5} />
      Sincronizado con Finanzas
    </span>
  );
}
