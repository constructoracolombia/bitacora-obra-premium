"use client";

import { type LucideIcon, Package, ClipboardList, Calendar, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateVariant = "pedidos" | "proyectos" | "bitacora" | "default";

const VARIANTS: Record<
  EmptyStateVariant,
  { icon: LucideIcon; title: string; description: string }
> = {
  pedidos: {
    icon: Package,
    title: "No hay pedidos pendientes",
    description: "Tu obra está al día, Arquitecto.",
  },
  proyectos: {
    icon: ClipboardList,
    title: "No hay proyectos",
    description: "Crea tu primer proyecto para comenzar.",
  },
  bitacora: {
    icon: Calendar,
    title: "No hay entradas",
    description: "Registra las novedades del día.",
  },
  default: {
    icon: FolderOpen,
    title: "No hay datos",
    description: "Añade contenido para comenzar.",
  },
};

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  variant = "default",
  title,
  description,
  icon: IconProp,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const config = VARIANTS[variant];
  const Icon = IconProp ?? config.icon;
  const displayTitle = title ?? config.title;
  const displayDescription = description ?? config.description;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-[#D2D2D7]/60 bg-white px-8 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 flex size-20 items-center justify-center rounded-2xl bg-[#F5F5F7]">
        <Icon className="size-10 text-[#86868B]" strokeWidth={1.5} />
      </div>
      <h3 className="text-[15px] font-semibold text-[#1D1D1F]">{displayTitle}</h3>
      <p className="mt-2 max-w-sm text-[13px] text-[#86868B]">
        {displayDescription}
      </p>
      {actionLabel && onAction && (
        <Button
          className="mt-6 rounded-xl bg-[#007AFF] px-6 text-white shadow-sm hover:bg-[#0051D5]"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
