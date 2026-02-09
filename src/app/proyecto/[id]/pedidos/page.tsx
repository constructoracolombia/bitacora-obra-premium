"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Package,
  DollarSign,
  Calendar,
  User,
  X,
  Check,
  Truck,
  CheckCircle2,
  Archive,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

/* ─────────────── Constantes ─────────────── */

/** Mapeo de estados DB (inglés) -> UI (español) */
const ESTADO_MAP: Record<string, string> = {
  PENDING: "PENDIENTE",
  APPROVED: "APROBADO",
  EN_CAMINO: "EN_CAMINO",
  DELIVERED: "ENTREGADO",
  CONSUMED: "CONSUMIDO",
  // Si ya vienen en español, los dejo pasar
  PENDIENTE: "PENDIENTE",
  APROBADO: "APROBADO",
  ENTREGADO: "ENTREGADO",
  CONSUMIDO: "CONSUMIDO",
};

function normalizeEstado(raw: string): string {
  return ESTADO_MAP[raw] ?? raw;
}

const ESTADO_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  PENDIENTE: {
    label: "Pendiente",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  APROBADO: {
    label: "Aprobado",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  EN_CAMINO: {
    label: "En Camino",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  ENTREGADO: {
    label: "Entregado",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  CONSUMIDO: {
    label: "Consumido",
    color: "text-gray-600",
    bg: "bg-gray-50",
    border: "border-gray-200",
  },
};

function getEstadoStyle(estado: string) {
  const norm = normalizeEstado(estado);
  return ESTADO_CONFIG[norm] ?? ESTADO_CONFIG.PENDIENTE;
}

const UNIDADES = [
  { value: "m2", label: "m²" },
  { value: "m3", label: "m³" },
  { value: "kg", label: "kg" },
  { value: "und", label: "Unidades" },
  { value: "bulto", label: "Bultos" },
  { value: "gl", label: "Galones" },
  { value: "rollo", label: "Rollos" },
  { value: "ml", label: "ml" },
  { value: "mt", label: "Metros lineales" },
];

const FILTER_ESTADOS = [
  { value: "TODOS", label: "Todos" },
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "APROBADO", label: "Aprobados" },
  { value: "EN_CAMINO", label: "En Camino" },
  { value: "ENTREGADO", label: "Entregados" },
  { value: "CONSUMIDO", label: "Consumidos" },
];

/** Flujo de transición de estados para las acciones rápidas */
const NEXT_ACTIONS: Record<string, { label: string; nextEstadoDB: string; icon: typeof Check }> = {
  PENDIENTE: { label: "Aprobar", nextEstadoDB: "APPROVED", icon: Check },
  APROBADO: { label: "En Camino", nextEstadoDB: "EN_CAMINO", icon: Truck },
  EN_CAMINO: { label: "Entregado", nextEstadoDB: "DELIVERED", icon: CheckCircle2 },
  ENTREGADO: { label: "Consumido", nextEstadoDB: "CONSUMED", icon: Archive },
};

/* ─────────────── Tipos ─────────────── */

interface PedidoRow {
  id: string;
  proyecto_id: string;
  item: string;
  cantidad: number;
  unidad: string | null;
  estado: string;
  costo_estimado: number | null;
  costo_real: number | null;
  solicitado_por: string | null;
  notas: string | null;
  created_at: string;
}

interface ProyectoInfo {
  id: string;
  cliente_nombre: string | null;
}

function formatCOP(value: number): string {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
}

/* ─────────────── Page ─────────────── */

export default function PedidosProyectoPage() {
  const params = useParams();
  const proyectoId = params.id as string;

  const [project, setProject] = useState<ProyectoInfo | null>(null);
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("TODOS");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const [projectRes, pedidosRes] = await Promise.all([
        supabase
          .from("proyectos_maestro")
          .select("id, cliente_nombre")
          .eq("id", proyectoId)
          .single(),
        supabase
          .from("pedidos_material")
          .select("id, proyecto_id, item, cantidad, unidad, estado, costo_estimado, costo_real, solicitado_por, notas, created_at")
          .eq("proyecto_id", proyectoId)
          .order("created_at", { ascending: false }),
      ]);

      if (projectRes.data) setProject(projectRes.data as ProyectoInfo);
      if (pedidosRes.data) setPedidos(pedidosRes.data as PedidoRow[]);
    } catch (err) {
      console.error("Error fetching pedidos:", err);
    } finally {
      setLoading(false);
    }
  }, [proyectoId]);

  useEffect(() => {
    if (proyectoId) fetchData();
  }, [proyectoId, fetchData]);

  async function handleAdvanceEstado(pedidoId: string, nextEstadoDB: string) {
    const supabase = getSupabase();
    const updates: Record<string, unknown> = { estado: nextEstadoDB };

    // Auto-set fecha_aprobacion when approving
    if (nextEstadoDB === "APPROVED") {
      updates.fecha_aprobacion = format(new Date(), "yyyy-MM-dd");
    }
    // Auto-set fecha_entrega when delivering
    if (nextEstadoDB === "DELIVERED") {
      updates.fecha_entrega = format(new Date(), "yyyy-MM-dd");
    }

    await supabase.from("pedidos_material").update(updates).eq("id", pedidoId);
    fetchData();
  }

  const filteredPedidos =
    filter === "TODOS"
      ? pedidos
      : pedidos.filter((p) => normalizeEstado(p.estado) === filter);

  // Summary counts
  const counts = pedidos.reduce(
    (acc, p) => {
      const norm = normalizeEstado(p.estado);
      acc[norm] = (acc[norm] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="size-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8F9FA] p-6">
        <p className="text-gray-500">Proyecto no encontrado</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Volver al dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/proyecto/${proyectoId}`}>
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-[#2D3748]">Pedidos de Material</h1>
              <p className="text-sm text-gray-500">
                {project.cliente_nombre || "Proyecto"}
              </p>
            </div>
          </div>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="size-4" />
            Nuevo Pedido
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-6">
        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(ESTADO_CONFIG).map(([key, cfg]) => (
            <div
              key={key}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-center",
                cfg.border,
                cfg.bg
              )}
            >
              <p className={cn("text-2xl font-bold", cfg.color)}>
                {counts[key] || 0}
              </p>
              <p className="text-xs text-gray-500">{cfg.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          {FILTER_ESTADOS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.value
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
              )}
            >
              {f.label}
              {f.value !== "TODOS" && counts[f.value]
                ? ` (${counts[f.value]})`
                : ""}
            </button>
          ))}
        </div>

        {/* Pedidos list */}
        {filteredPedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
            <Package className="size-12 text-gray-400" />
            <p className="text-gray-600">
              {pedidos.length === 0
                ? "No hay pedidos de material"
                : "No hay pedidos con el filtro seleccionado"}
            </p>
            {pedidos.length === 0 && (
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setModalOpen(true)}
              >
                <Plus className="size-4" />
                Crear primer pedido
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPedidos.map((pedido) => {
              const estilo = getEstadoStyle(pedido.estado);
              const estadoNorm = normalizeEstado(pedido.estado);
              const action = NEXT_ACTIONS[estadoNorm];
              const ActionIcon = action?.icon;

              return (
                <article
                  key={pedido.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-[#2D3748]">
                          {pedido.item}
                        </h3>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            estilo.color,
                            estilo.bg,
                            estilo.border
                          )}
                        >
                          {estilo.label}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        <span className="flex items-center gap-1 text-sm text-gray-600">
                          <Package className="size-3.5 text-gray-400" />
                          {pedido.cantidad} {pedido.unidad ?? "und"}
                        </span>
                        {pedido.costo_estimado != null && pedido.costo_estimado > 0 && (
                          <span className="flex items-center gap-1 text-sm text-blue-600">
                            <DollarSign className="size-3.5" />
                            {formatCOP(pedido.costo_estimado)}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="size-3.5" />
                          {formatDate(pedido.created_at)}
                        </span>
                        {pedido.solicitado_por && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <User className="size-3.5" />
                            {pedido.solicitado_por}
                          </span>
                        )}
                      </div>

                      {pedido.notas && (
                        <p className="mt-2 text-sm text-gray-500">{pedido.notas}</p>
                      )}

                      {pedido.costo_real != null && pedido.costo_real > 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                          Costo real: <span className="font-medium text-[#2D3748]">{formatCOP(pedido.costo_real)}</span>
                        </p>
                      )}
                    </div>

                    {/* Right: Action button */}
                    {action && ActionIcon && (
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          "shrink-0 border-gray-200 text-sm font-medium",
                          estadoNorm === "PENDIENTE" && "text-blue-600 hover:bg-blue-50",
                          estadoNorm === "APROBADO" && "text-purple-600 hover:bg-purple-50",
                          estadoNorm === "EN_CAMINO" && "text-emerald-600 hover:bg-emerald-50",
                          estadoNorm === "ENTREGADO" && "text-gray-600 hover:bg-gray-50"
                        )}
                        onClick={() =>
                          handleAdvanceEstado(pedido.id, action.nextEstadoDB)
                        }
                      >
                        <ActionIcon className="size-4" />
                        {action.label}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal nuevo pedido */}
      <NuevoPedidoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        proyectoId={proyectoId}
        onSuccess={() => {
          setModalOpen(false);
          fetchData();
        }}
      />
    </div>
  );
}

/* ─────────────── Modal: Nuevo Pedido ─────────────── */

interface NuevoPedidoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proyectoId: string;
  onSuccess: () => void;
}

function NuevoPedidoModal({
  open,
  onOpenChange,
  proyectoId,
  onSuccess,
}: NuevoPedidoModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    item: "",
    cantidad: "",
    unidad: "und",
    costo_estimado: "",
    notas: "",
    solicitado_por: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        item: "",
        cantidad: "",
        unidad: "und",
        costo_estimado: "",
        notas: "",
        solicitado_por: "",
      });
      setError(null);
    }
  }, [open]);

  function formatCOPInput(value: string): string {
    const num = value.replace(/\D/g, "");
    if (!num) return "";
    return Number(num).toLocaleString("es-CO");
  }

  function parseCOPInput(value: string): number {
    return Number(value.replace(/\D/g, "")) || 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.item.trim()) {
      setError("El material es requerido");
      return;
    }
    if (!form.cantidad || Number(form.cantidad) <= 0) {
      setError("La cantidad debe ser mayor a 0");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { error: insertError } = await supabase
        .from("pedidos_material")
        .insert({
          proyecto_id: proyectoId,
          item: form.item.trim(),
          cantidad: Number(form.cantidad),
          unidad: form.unidad,
          estado: "PENDING",
          costo_estimado: parseCOPInput(form.costo_estimado) || null,
          notas: form.notas.trim() || null,
          solicitado_por: form.solicitado_por.trim() || null,
          fecha_solicitud: format(new Date(), "yyyy-MM-dd"),
        });

      if (insertError) throw insertError;
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al crear pedido"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gray-200 bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#2D3748]">Nuevo Pedido de Material</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Material */}
          <div className="space-y-2">
            <Label className="text-[#2D3748]">
              Material / Item <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.item}
              onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
              placeholder="Ej: Cemento Argos x 50kg"
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Cantidad + Unidad */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[#2D3748]">
                Cantidad <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.cantidad}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cantidad: e.target.value }))
                }
                placeholder="0"
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#2D3748]">Unidad</Label>
              <select
                value={form.unidad}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unidad: e.target.value }))
                }
                className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {UNIDADES.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Costo estimado */}
          <div className="space-y-2">
            <Label className="text-[#2D3748]">Costo estimado (COP)</Label>
            <Input
              value={form.costo_estimado}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  costo_estimado: formatCOPInput(e.target.value),
                }))
              }
              placeholder="$ 0"
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label className="text-[#2D3748]">Notas</Label>
            <textarea
              value={form.notas}
              onChange={(e) =>
                setForm((f) => ({ ...f, notas: e.target.value }))
              }
              placeholder="Observaciones, proveedor preferido, urgencia..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Solicitado por */}
          <div className="space-y-2">
            <Label className="text-[#2D3748]">Solicitado por</Label>
            <Input
              value={form.solicitado_por}
              onChange={(e) =>
                setForm((f) => ({ ...f, solicitado_por: e.target.value }))
              }
              placeholder="Nombre del solicitante"
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Crear Pedido"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
