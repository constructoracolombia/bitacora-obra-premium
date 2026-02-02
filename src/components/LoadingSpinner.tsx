"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "size-6",
  md: "size-10",
  lg: "size-14",
};

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin-smooth rounded-full border-2 border-[var(--gold)]/20 border-t-[var(--gold)]",
        SIZES[size],
        className
      )}
      role="status"
      aria-label="Cargando"
    />
  );
}
