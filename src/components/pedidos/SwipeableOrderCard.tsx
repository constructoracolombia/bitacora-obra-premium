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
  PENDING: "bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20",
  APPROVED: "bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20",
  DELIVERED: "bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20",
  CONSUMED: "bg-[#F5F5F7] text-[#86868B] border-[#D2D2D7]",
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
      className="relative overflow-hidden rounded-2xl border border-[#D2D2D7]/60 bg-white"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {showActions && (
        <>
          <div
            className={cn(
              "absolute inset-y-0 left-0 flex w-24 items-center justify-center bg-[#34C759]/10 transition-opacity",
              offset > 20 ? "opacity-100" : "opacity-0"
            )}
          >
            <Check className="size-7 text-[#34C759]" />
          </div>
          <div
            className={cn(
              "absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-[#FF3B30]/10 transition-opacity",
              offset < -20 ? "opacity-100" : "opacity-0"
            )}
          >
            <X className="size-7 text-[#FF3B30]" />
          </div>
        </>
      )}

      <div
        className="relative p-4 transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-[#1D1D1F] truncate">{pedido.item}</h3>
            <p className="mt-1 text-[13px] text-[#86868B]">
              {pedido.cantidad} {pedido.unidad ?? "und"}
              {pedido.costo_estimado != null && (
                <> · ${Number(pedido.costo_estimado).toLocaleString("es-CO")}</>
              )}
            </p>
            {pedido.proyecto?.cliente_nombre && (
              <p className="mt-0.5 text-[12px] text-[#86868B]">
                {pedido.proyecto.cliente_nombre}
              </p>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
              ESTADO_COLORS[pedido.estado] ?? ESTADO_COLORS.PENDING
            )}
          >
            {ESTADO_LABELS[pedido.estado] ?? pedido.estado}
          </span>
        </div>
        <p className="mt-2 text-[12px] text-[#86868B]">
          {format(new Date(pedido.created_at), "d MMM yyyy, HH:mm", { locale: es })}
        </p>
        {showActions && (
          <p className="mt-2 text-[12px] text-[#007AFF]">
            Desliza para aprobar/rechazar
          </p>
        )}
        {pedido.estado === "DELIVERED" && (
          <Button
            size="sm"
            variant="outline"
            className="mt-3 w-full rounded-xl border-[#D2D2D7] text-[#007AFF] hover:bg-[#007AFF]/5"
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
