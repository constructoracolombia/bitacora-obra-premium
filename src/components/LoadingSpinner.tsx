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
        "animate-spin-smooth rounded-full border-2 border-gray-200 border-t-blue-600",
        SIZES[size],
        className
      )}
      role="status"
      aria-label="Cargando"
    />
  );
}
