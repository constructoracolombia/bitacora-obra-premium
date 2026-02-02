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
        "flex flex-col items-center justify-center rounded-xl border border-[var(--gold)]/20 bg-card/50 px-8 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 flex size-24 items-center justify-center rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/5">
        <Icon className="size-12 text-[var(--gold)]" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{displayTitle}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {displayDescription}
      </p>
      {actionLabel && onAction && (
        <Button
          className="mt-6 gradient-gold text-black hover:opacity-90"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
