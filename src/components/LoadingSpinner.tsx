"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "size-6",
  md: "size-8",
  lg: "size-12",
};

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin-smooth rounded-full border-2 border-[#D2D2D7] border-t-[#007AFF]",
        SIZES[size],
        className
      )}
      role="status"
      aria-label="Cargando"
    />
  );
}
