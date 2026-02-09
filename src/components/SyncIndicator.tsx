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
        "inline-flex items-center gap-1.5 rounded-full border border-[#34C759]/20 bg-[#34C759]/5 px-2.5 py-1 text-[11px] font-medium text-[#34C759]",
        className
      )}
    >
      <Check className="size-3.5" strokeWidth={2.5} />
      Sincronizado
    </span>
  );
}
