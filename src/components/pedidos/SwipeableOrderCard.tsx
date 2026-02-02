"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Check, X, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ESTADO_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  DELIVERED: "Entregado",
  CONSUMED: "Consumido",
};

const ESTADO_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  APPROVED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  DELIVERED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  CONSUMED: "bg-muted text-muted-foreground border-muted",
};

interface PedidoData {
  id: string;
  item: string;
  cantidad: number;
  unidad: string | null;
  estado: string;
  costo_estimado: number | null;
  created_at: string;
  proyecto?: { cliente_nombre: string | null };
}

interface SwipeableOrderCardProps {
  pedido: PedidoData;
  isAdmin?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

const SWIPE_THRESHOLD = 80;

export function SwipeableOrderCard({
  pedido,
  isAdmin = false,
  onApprove,
  onReject,
}: SwipeableOrderCardProps) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);

  function handleTouchStart(e: React.TouchEvent) {
    if (!isAdmin || (pedido.estado !== "PENDING")) return;
    startX.current = e.touches[0].clientX;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isAdmin || (pedido.estado !== "PENDING")) return;
    const dx = e.touches[0].clientX - startX.current;
    const clamped = Math.max(-120, Math.min(120, dx));
    setOffset(clamped);
  }

  function handleTouchEnd() {
    if (!isAdmin || (pedido.estado !== "PENDING")) return;
    if (offset > SWIPE_THRESHOLD) {
      onApprove?.(pedido.id);
    } else if (offset < -SWIPE_THRESHOLD) {
      onReject?.(pedido.id);
    }
    setOffset(0);
  }

  const showActions = isAdmin && pedido.estado === "PENDING";

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[var(--gold)]/20 bg-card"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Acciones de fondo */}
      {showActions && (
        <>
          <div
            className={cn(
              "absolute inset-y-0 left-0 flex w-24 items-center justify-center bg-emerald-500/30 transition-opacity",
              offset > 20 ? "opacity-100" : "opacity-0"
            )}
          >
            <Check className="size-8 text-emerald-400" />
          </div>
          <div
            className={cn(
              "absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-destructive/30 transition-opacity",
              offset < -20 ? "opacity-100" : "opacity-0"
            )}
          >
            <X className="size-8 text-destructive" />
          </div>
        </>
      )}

      {/* Contenido */}
      <div
        className="relative p-4 transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">{pedido.item}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {pedido.cantidad} {pedido.unidad ?? "und"}
              {pedido.costo_estimado != null && (
                <> · ${Number(pedido.costo_estimado).toLocaleString("es-CO")}</>
              )}
            </p>
            {pedido.proyecto?.cliente_nombre && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {pedido.proyecto.cliente_nombre}
              </p>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
              ESTADO_COLORS[pedido.estado] ?? ESTADO_COLORS.PENDING
            )}
          >
            {ESTADO_LABELS[pedido.estado] ?? pedido.estado}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {format(new Date(pedido.created_at), "d MMM yyyy, HH:mm", { locale: es })}
        </p>
        {showActions && (
          <p className="mt-2 text-xs text-[var(--gold)]">
            Desliza para aprobar/rechazar
          </p>
        )}
        {pedido.estado === "DELIVERED" && (
          <Button
            size="sm"
            variant="outline"
            className="mt-3 w-full border-[var(--gold)]/40 text-[var(--gold)] hover:bg-[var(--gold)]/10"
            asChild
          >
            <Link href={`/pedidos/${pedido.id}/actualizar-estado`}>
              <PackageCheck className="size-4" />
              Marcar como consumido
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
