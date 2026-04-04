// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
  PackageCheck,
  Truck,
  ShoppingCart,
  Clock,
  CheckCheck,
  CalendarClock,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Requisicion {
  id: string;
  proyecto_id: string;
  apartamento: string;
  tipo_material: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  estado: string;
  urgencia: string | null;
  solicitado_por: string | null;
  aprobado_por: string | null;
  notas: string | null;
  fecha_solicitada: string | null;
  fecha_por_aprobar: string | null;
  fecha_en_compras: string | null;
  fecha_recepcion_obra: string | null;
  fecha_asignado_proyecto: string | null;
  fecha_estimada_entrega: string | null;
  created_at: string;
}

interface RequisicionItem {
  id: string;
  descripcion: string;
  cantidad: number | null;
  unidad: string | null;
  comprado: boolean;
  recibido: boolean;
  orden: number;
  proveedor: string | null;
  precio: number | null;
}

const STEPS = [
  { key: "solicitada", label: "Solicitada", description: "Requisición creada", dateField: "fecha_solicitada" },
  { key: "por_aprobar", label: "Por Aprobar", description: "Pendiente de aprobación", dateField: "fecha_por_aprobar" },
  { key: "en_compras", label: "En Compras", description: "En proceso de compra", dateField: "fecha_en_compras" },
  { key: "recepcion_obra", label: "Recepción obra", description: "Materiales en obra", dateField: "fecha_recepcion_obra" },
  { key: "asignado_proyecto", label: "Asignado", description: "Completado", dateField: "fecha_asignado_proyecto" },
];

const STEP_KEYS = STEPS.map((s) => s.key);

function getStepIndex(estado: string): number {
  const idx = STEP_KEYS.indexOf(estado);
  return idx >= 0 ? idx : 0;
}

function itemStatus(item: RequisicionItem): "recibido" | "transito" | "pendiente" {
  if (item.recibido) return "recibido";
  if (item.comprado) return "transito";
  return "pendiente";
}

const STATUS_ROW: Record<string, string> = {
  recibido: "bg-green-50 border-green-200",
  transito: "bg-amber-50 border-amber-200",
  pendiente: "bg-white border-gray-100",
};

const STATUS_BADGE: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  recibido: {
    label: "Recibido",
    className: "bg-green-100 text-green-700",
    icon: <PackageCheck className="size-3" />,
  },
  transito: {
    label: "En tránsito",
    className: "bg-amber-100 text-amber-700",
    icon: <Truck className="size-3" />,
  },
  pendiente: {
    label: "Pendiente",
    className: "bg-gray-100 text-gray-500",
    icon: <Clock className="size-3" />,
  },
};

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold">{value}/{total}</span>
        <span className="text-gray-400">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function RequisicionDetailPage() {
  const supabase = getSupabaseClient();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [requisicion, setRequisicion] = useState<Requisicion | null>(null);
  const [proyectoNombre, setProyectoNombre] = useState<string>("—");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [editando, setEditando] = useState(false);
  const [formEdit, setFormEdit] = useState({
    descripcion: "",
    urgencia: "normal",
    cantidad: "",
    unidad: "",
    notas: "",
    fecha_estimada_entrega: "",
  });
  const [items, setItems] = useState<RequisicionItem[]>([]);
  const [nuevoItem, setNuevoItem] = useState({ descripcion: "", cantidad: "", unidad: "" });
  const [agregandoItem, setAgregandoItem] = useState(false);
  const [marcandoTodo, setMarcandoTodo] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("requisiciones")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) {
        const r = data as Record<string, unknown>;
        const req: Requisicion = {
          id: r.id as string,
          proyecto_id: r.proyecto_id as string,
          apartamento: r.apartamento as string,
          tipo_material: (r.tipo_material as string) ?? "Otros",
          descripcion: r.descripcion as string,
          cantidad: Number(r.cantidad) || 0,
          unidad: (r.unidad as string) ?? "und",
          estado: (r.estado as string) ?? "solicitada",
          urgencia: (r.urgencia as string) ?? null,
          solicitado_por: (r.solicitado_por as string) ?? null,
          aprobado_por: (r.aprobado_por as string) ?? null,
          notas: (r.notas as string) ?? null,
          fecha_solicitada: (r.fecha_solicitada as string) ?? null,
          fecha_por_aprobar: (r.fecha_por_aprobar as string) ?? null,
          fecha_en_compras: (r.fecha_en_compras as string) ?? null,
          fecha_recepcion_obra: (r.fecha_recepcion_obra as string) ?? null,
          fecha_asignado_proyecto: (r.fecha_asignado_proyecto as string) ?? null,
          fecha_estimada_entrega: (r.fecha_estimada_entrega as string) ?? null,
          created_at: (r.created_at as string) ?? "",
        };
        setRequisicion(req);

        const { data: proj } = await supabase
          .from("proyectos_maestro")
          .select("cliente_nombre")
          .eq("id", req.proyecto_id)
          .single();
        if (proj)
          setProyectoNombre(((proj as Record<string, unknown>).cliente_nombre as string) ?? "—");
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  useEffect(() => {
    if (requisicion) {
      cargarItems();
      setFormEdit({
        descripcion: requisicion.descripcion || "",
        urgencia: requisicion.urgencia || "normal",
        cantidad: requisicion.cantidad?.toString() || "",
        unidad: requisicion.unidad || "",
        notas: requisicion.notas || "",
        fecha_estimada_entrega: requisicion.fecha_estimada_entrega || "",
      });
    }
  }, [requisicion]);

  async function cargarItems() {
    if (!requisicion) return;
    try {
      const { data, error } = await supabase
        .from("requisicion_items")
        .select("*")
        .eq("requisicion_id", requisicion.id)
        .order("orden", { ascending: true });

      if (error) throw error;
      setItems(
        (data || []).map((d) => ({
          id: d.id,
          descripcion: d.descripcion,
          cantidad: d.cantidad ?? null,
          unidad: d.unidad ?? null,
          comprado: d.comprado ?? false,
          recibido: d.recibido ?? false,
          orden: d.orden ?? 0,
          proveedor: d.proveedor ?? null,
          precio: d.precio ?? null,
        }))
      );
    } catch (err) {
      console.error("Error cargando items:", err);
    }
  }

  async function agregarItem() {
    if (!requisicion || !nuevoItem.descripcion.trim()) return;
    setAgregandoItem(true);
    try {
      const { error } = await supabase.from("requisicion_items").insert({
        requisicion_id: requisicion.id,
        descripcion: nuevoItem.descripcion,
        cantidad: nuevoItem.cantidad ? Number(nuevoItem.cantidad) : null,
        unidad: nuevoItem.unidad || null,
        orden: items.length,
      } as any);
      if (error) throw error;
      setNuevoItem({ descripcion: "", cantidad: "", unidad: "" });
      await cargarItems();
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setAgregandoItem(false);
    }
  }

  async function toggleCheckbox(itemId: string, campo: "comprado" | "recibido", valorActual: boolean) {
    try {
      const { error } = await supabase
        .from("requisicion_items")
        .update({ [campo]: !valorActual } as any)
        .eq("id", itemId);
      if (error) throw error;
      await cargarItems();
    } catch (err) {
      console.error("Error:", err);
    }
  }

  async function updateItemField(itemId: string, campo: string, valor: string | number | null) {
    try {
      await supabase
        .from("requisicion_items")
        .update({ [campo]: valor } as any)
        .eq("id", itemId);
    } catch (err) {
      console.error("Error actualizando campo:", err);
    }
  }

  async function marcarTodoRecibido() {
    const pendientes = items.filter((i) => !i.recibido);
    if (pendientes.length === 0) return;
    setMarcandoTodo(true);
    try {
      await Promise.all(
        pendientes.map((i) =>
          supabase
            .from("requisicion_items")
            .update({ recibido: true, comprado: true } as any)
            .eq("id", i.id)
        )
      );
      await cargarItems();
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setMarcandoTodo(false);
    }
  }

  async function eliminarItem(itemId: string) {
    if (!confirm("¿Eliminar este item?")) return;
    try {
      const { error } = await supabase.from("requisicion_items").delete().eq("id", itemId);
      if (error) throw error;
      await cargarItems();
    } catch (err) {
      console.error("Error:", err);
    }
  }

  async function guardarCambios() {
    if (!requisicion) return;
    setActing(true);
    try {
      const { error } = await supabase
        .from("requisiciones")
        .update({
          descripcion: formEdit.descripcion,
          urgencia: formEdit.urgencia,
          cantidad: formEdit.cantidad ? Number(formEdit.cantidad) : null,
          unidad: formEdit.unidad || null,
          notas: formEdit.notas || null,
          fecha_estimada_entrega: formEdit.fecha_estimada_entrega || null,
        } as any)
        .eq("id", requisicion.id);
      if (error) throw error;
      await fetchData();
      setEditando(false);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setActing(false);
    }
  }

  async function eliminarRequisicion() {
    if (!requisicion) return;
    if (!confirm("¿Eliminar esta requisición? Esta acción no se puede deshacer.")) return;
    try {
      const { error } = await supabase.from("requisiciones").delete().eq("id", requisicion.id);
      if (error) throw error;
      router.push("/requisiciones");
    } catch (err) {
      console.error("Error:", err);
    }
  }

  async function avanzarPaso() {
    if (!requisicion) return;
    const currentIdx = getStepIndex(requisicion.estado);
    if (currentIdx + 1 >= STEPS.length) return;
    const nextStep = STEPS[currentIdx + 1];
    setActing(true);
    try {
      const { error } = await supabase
        .from("requisiciones")
        .update({ estado: nextStep.key, [nextStep.dateField]: new Date().toISOString() } as any)
        .eq("id", requisicion.id);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setActing(false);
    }
  }

  async function retrocederPaso(targetIdx: number) {
    if (!requisicion || targetIdx === 0) return;
    const previousStep = STEPS[targetIdx - 1];
    setActing(true);
    try {
      const { error } = await supabase
        .from("requisiciones")
        .update({ estado: previousStep.key, [STEPS[targetIdx].dateField]: null } as any)
        .eq("id", requisicion.id);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  if (!requisicion) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8">
        <p className="text-[#86868B]">Requisición no encontrada</p>
        <Button variant="outline" asChild>
          <Link href="/requisiciones">Volver</Link>
        </Button>
      </div>
    );
  }

  const currentStepIndex = getStepIndex(requisicion.estado);
  const totalItems = items.length;
  const comprados = items.filter((i) => i.comprado).length;
  const recibidos = items.filter((i) => i.recibido).length;
  const enTransito = items.filter((i) => i.comprado && !i.recibido).length;
  const isCompleted = currentStepIndex >= STEPS.length - 1;

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="size-8 text-[#86868B] hover:bg-[#F5F5F7]" asChild>
              <Link href="/requisiciones">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <h1 className="truncate text-[15px] font-semibold text-[#1D1D1F] leading-tight">
                {requisicion.descripcion}
              </h1>
              <p className="text-[12px] text-[#86868B]">{proyectoNombre} · {requisicion.apartamento}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (editando) {
                  setEditando(false);
                  setFormEdit({
                    descripcion: requisicion.descripcion || "",
                    urgencia: requisicion.urgencia || "normal",
                    cantidad: requisicion.cantidad?.toString() || "",
                    unidad: requisicion.unidad || "",
                    notas: requisicion.notas || "",
                    fecha_estimada_entrega: requisicion.fecha_estimada_entrega || "",
                  });
                } else {
                  setEditando(true);
                }
              }}
              className={cn(
                "rounded-lg text-[13px]",
                editando ? "text-[#86868B]" : "text-[#007AFF] hover:bg-[#007AFF]/5"
              )}
            >
              {editando ? <><X className="size-3.5" /> Cancelar</> : <><Pencil className="size-3.5" /> Editar</>}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={eliminarRequisicion}
              className="rounded-lg text-[13px] text-[#FF3B30] hover:bg-[#FF3B30]/5"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Stepper horizontal compacto */}
        <div className="mx-auto max-w-3xl px-4 pb-3 sm:px-8">
          <div className="flex items-center gap-0">
            {STEPS.map((step, idx) => {
              const done = currentStepIndex > idx;
              const current = currentStepIndex === idx;
              return (
                <div key={step.key} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full text-[10px] font-bold transition-all",
                        done
                          ? "bg-[#007AFF] text-white"
                          : current
                            ? "border-2 border-[#007AFF] bg-white text-[#007AFF]"
                            : "bg-[#D2D2D7] text-white"
                      )}
                    >
                      {done ? "✓" : idx + 1}
                    </div>
                    <span
                      className={cn(
                        "hidden text-center text-[9px] leading-tight sm:block",
                        current ? "font-semibold text-[#007AFF]" : done ? "text-[#1D1D1F]" : "text-[#C7C7CC]"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={cn("mx-1 h-0.5 flex-1 rounded-full transition-colors", done ? "bg-[#007AFF]" : "bg-[#D2D2D7]")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-8">

        {/* Urgencia + acción principal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {requisicion.urgencia === "alta" && (
              <span className="rounded-full border-2 border-red-300 bg-red-100 px-3 py-1 text-xs font-bold text-red-700 animate-pulse">
                🚨 URGENTE
              </span>
            )}
            {requisicion.urgencia === "normal" && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">Normal</span>
            )}
            {requisicion.urgencia === "baja" && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">Baja</span>
            )}
            {requisicion.solicitado_por && (
              <span className="text-[12px] text-[#86868B]">por {requisicion.solicitado_por}</span>
            )}
          </div>
          {!isCompleted && (
            <Button
              onClick={avanzarPaso}
              disabled={acting}
              className="rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5] text-[13px]"
              size="sm"
            >
              {acting ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Avanzar → {STEPS[currentStepIndex + 1]?.label}
            </Button>
          )}
        </div>

        {/* Items */}
        <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white overflow-hidden">
          {/* Header items */}
          <div className="flex items-center justify-between border-b border-[#D2D2D7]/40 px-5 py-4">
            <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Items de la requisición</h3>
            {totalItems > 0 && recibidos < totalItems && (
              <Button
                onClick={marcarTodoRecibido}
                disabled={marcandoTodo}
                size="sm"
                className="rounded-xl bg-green-600 text-white text-[12px] hover:bg-green-700"
              >
                {marcandoTodo ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCheck className="size-3.5" />}
                Todo recibido
              </Button>
            )}
          </div>

          {/* Progress bars */}
          {totalItems > 0 && (
            <div className="grid grid-cols-3 gap-4 border-b border-[#D2D2D7]/40 px-5 py-4">
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#86868B]">Total</p>
                <p className="text-2xl font-bold text-[#1D1D1F]">{totalItems}</p>
                <p className="text-[11px] text-[#86868B]">items</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#007AFF]">Comprados</p>
                <ProgressBar value={comprados} total={totalItems} color={comprados === totalItems ? "bg-[#007AFF]" : "bg-[#007AFF]/70"} />
                {enTransito > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-600">
                    <Truck className="size-3" />{enTransito} en tránsito
                  </p>
                )}
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#34C759]">Recibidos</p>
                <ProgressBar
                  value={recibidos}
                  total={totalItems}
                  color={recibidos === totalItems ? "bg-[#34C759]" : recibidos > 0 ? "bg-[#34C759]/70" : "bg-gray-200"}
                />
              </div>
            </div>
          )}

          {/* Lista de items */}
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#86868B]">No hay items. Agrega el primero abajo.</p>
          ) : (
            <div className="divide-y divide-[#D2D2D7]/30">
              {items.map((item) => {
                const st = itemStatus(item);
                const badge = STATUS_BADGE[st];
                return (
                  <div
                    key={item.id}
                    className={cn("border-l-4 px-5 py-3 transition-colors", STATUS_ROW[st], {
                      "border-l-green-400": st === "recibido",
                      "border-l-amber-400": st === "transito",
                      "border-l-transparent": st === "pendiente",
                    })}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[14px] text-[#1D1D1F]">{item.descripcion}</span>
                          {item.cantidad && (
                            <span className="text-[12px] text-[#86868B]">{item.cantidad} {item.unidad || ""}</span>
                          )}
                          <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", badge.className)}>
                            {badge.icon}{badge.label}
                          </span>
                        </div>

                        {/* Proveedor y precio — visibles cuando está comprado */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <input
                            defaultValue={item.proveedor || ""}
                            placeholder="Proveedor"
                            onBlur={(e) => updateItemField(item.id, "proveedor", e.target.value || null)}
                            className={cn(
                              "h-7 rounded-lg border px-2 text-[12px] text-[#1D1D1F] placeholder-[#C7C7CC] focus:border-[#007AFF] focus:outline-none focus:ring-1 focus:ring-[#007AFF]/20 w-36",
                              item.comprado ? "border-[#D2D2D7] bg-white" : "border-dashed border-[#D2D2D7] bg-transparent"
                            )}
                          />
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[#86868B]">$</span>
                            <input
                              type="number"
                              defaultValue={item.precio ?? ""}
                              placeholder="Precio"
                              onBlur={(e) => updateItemField(item.id, "precio", e.target.value ? Number(e.target.value) : null)}
                              className={cn(
                                "h-7 w-28 rounded-lg border pl-5 pr-2 text-[12px] text-[#1D1D1F] placeholder-[#C7C7CC] focus:border-[#007AFF] focus:outline-none focus:ring-1 focus:ring-[#007AFF]/20",
                                item.comprado ? "border-[#D2D2D7] bg-white" : "border-dashed border-[#D2D2D7] bg-transparent"
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Toggles */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-3">
                          <label className="flex flex-col items-center gap-0.5 cursor-pointer">
                            <span className="text-[10px] font-medium text-[#007AFF]">Comprado</span>
                            <input
                              type="checkbox"
                              checked={item.comprado}
                              onChange={() => toggleCheckbox(item.id, "comprado", item.comprado)}
                              className="peer sr-only"
                            />
                            <div className="h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#007AFF] peer-checked:after:translate-x-4 relative after:border after:border-gray-300" />
                          </label>
                          <label className="flex flex-col items-center gap-0.5 cursor-pointer">
                            <span className="text-[10px] font-medium text-[#34C759]">Recibido</span>
                            <input
                              type="checkbox"
                              checked={item.recibido}
                              onChange={() => toggleCheckbox(item.id, "recibido", item.recibido)}
                              className="peer sr-only"
                            />
                            <div className="h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#34C759] peer-checked:after:translate-x-4 relative after:border after:border-gray-300" />
                          </label>
                        </div>
                        <button
                          onClick={() => eliminarItem(item.id)}
                          className="text-[#C7C7CC] hover:text-[#FF3B30] transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Agregar item */}
          <div className="border-t border-[#D2D2D7]/40 bg-[#F5F5F7] px-5 py-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#86868B]">Agregar item</p>
            <div className="flex flex-wrap gap-2">
              <input
                value={nuevoItem.descripcion}
                onChange={(e) => setNuevoItem({ ...nuevoItem, descripcion: e.target.value })}
                className="h-8 flex-1 min-w-[160px] rounded-lg border border-[#D2D2D7] bg-white px-3 text-[13px] focus:border-[#007AFF] focus:outline-none"
                placeholder="Descripción *"
                onKeyDown={(e) => { if (e.key === "Enter" && !agregandoItem) agregarItem(); }}
              />
              <input
                type="number"
                value={nuevoItem.cantidad}
                onChange={(e) => setNuevoItem({ ...nuevoItem, cantidad: e.target.value })}
                className="h-8 w-20 rounded-lg border border-[#D2D2D7] bg-white px-3 text-[13px] focus:border-[#007AFF] focus:outline-none"
                placeholder="Cant."
              />
              <input
                value={nuevoItem.unidad}
                onChange={(e) => setNuevoItem({ ...nuevoItem, unidad: e.target.value })}
                className="h-8 w-20 rounded-lg border border-[#D2D2D7] bg-white px-3 text-[13px] focus:border-[#007AFF] focus:outline-none"
                placeholder="Und."
              />
              <Button
                onClick={agregarItem}
                disabled={agregandoItem || !nuevoItem.descripcion.trim()}
                size="sm"
                className="h-8 rounded-xl bg-[#007AFF] text-white text-[12px] hover:bg-[#0051D5]"
              >
                {agregandoItem ? "..." : "+ Agregar"}
              </Button>
            </div>
          </div>
        </div>

        {/* Información */}
        <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Información</h3>
            {editando && (
              <Button onClick={guardarCambios} disabled={acting} size="sm" className="bg-[#007AFF] text-white rounded-xl text-[12px] hover:bg-[#0051D5]">
                {acting ? "Guardando..." : "Guardar cambios"}
              </Button>
            )}
          </div>

          {editando ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#86868B]">Descripción</label>
                <textarea
                  value={formEdit.descripcion}
                  onChange={(e) => setFormEdit({ ...formEdit, descripcion: e.target.value })}
                  className="w-full rounded-xl border border-[#D2D2D7] px-3 py-2 text-[13px] focus:border-[#007AFF] focus:outline-none"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#86868B]">Urgencia</label>
                  <select
                    value={formEdit.urgencia}
                    onChange={(e) => setFormEdit({ ...formEdit, urgencia: e.target.value })}
                    className="w-full rounded-xl border border-[#D2D2D7] px-3 py-2 text-[13px] focus:border-[#007AFF] focus:outline-none"
                  >
                    <option value="baja">Baja</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-[12px] font-medium text-[#86868B]">
                    <CalendarClock className="size-3" />Fecha estimada de entrega
                  </label>
                  <input
                    type="date"
                    value={formEdit.fecha_estimada_entrega}
                    onChange={(e) => setFormEdit({ ...formEdit, fecha_estimada_entrega: e.target.value })}
                    className="w-full rounded-xl border border-[#D2D2D7] px-3 py-2 text-[13px] focus:border-[#007AFF] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#86868B]">Notas</label>
                <textarea
                  value={formEdit.notas}
                  onChange={(e) => setFormEdit({ ...formEdit, notas: e.target.value })}
                  className="w-full rounded-xl border border-[#D2D2D7] px-3 py-2 text-[13px] focus:border-[#007AFF] focus:outline-none"
                  rows={2}
                  placeholder="Observaciones..."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-[13px]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[#86868B]">Proyecto</p>
                  <p className="font-medium text-[#1D1D1F]">{proyectoNombre}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[#86868B]">Apartamento</p>
                  <p className="font-medium text-[#1D1D1F]">{requisicion.apartamento}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[#86868B]">Tipo material</p>
                  <p className="font-medium text-[#1D1D1F]">{requisicion.tipo_material}</p>
                </div>
                {requisicion.fecha_estimada_entrega && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[#86868B] flex items-center gap-1">
                      <CalendarClock className="size-3" />Entrega estimada
                    </p>
                    <p className="font-medium text-[#1D1D1F]">
                      {new Date(requisicion.fecha_estimada_entrega + "T12:00:00").toLocaleDateString("es-CO", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
              {requisicion.notas && (
                <div className="rounded-xl bg-[#F5F5F7] px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-[#86868B]">Notas</p>
                  <p className="mt-1 text-[#1D1D1F]">{requisicion.notas}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timeline detallado */}
        <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-5">
          <h3 className="mb-5 text-[14px] font-semibold text-[#1D1D1F]">Historial del flujo</h3>
          <div className="space-y-1">
            {STEPS.map((step, idx) => {
              const isCompleted = currentStepIndex > idx;
              const isCurrent = currentStepIndex === idx;
              const stepDate = requisicion[step.dateField as keyof Requisicion] as string | null;

              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <label className="relative cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        disabled={acting}
                        onChange={async () => {
                          if (acting) return;
                          if (isCompleted) await retrocederPaso(idx);
                          else if (isCurrent) await avanzarPaso();
                        }}
                        className="peer sr-only"
                      />
                      <div className={cn(
                        "flex size-5 items-center justify-center rounded border-2 transition-all",
                        isCompleted
                          ? "cursor-pointer border-[#007AFF] bg-[#007AFF] hover:bg-[#0051D5]"
                          : isCurrent
                            ? "cursor-pointer border-[#007AFF] hover:bg-[#007AFF]/5"
                            : "cursor-not-allowed border-[#D2D2D7] bg-[#F5F5F7]"
                      )}>
                        {isCompleted && (
                          <svg className="size-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </label>
                    {idx < STEPS.length - 1 && (
                      <div className={cn("mt-1 h-8 w-0.5 transition-colors", isCompleted ? "bg-[#007AFF]" : "bg-[#D2D2D7]")} />
                    )}
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex items-center gap-2">
                      <h4 className={cn("text-[13px] font-semibold",
                        isCompleted ? "text-[#1D1D1F]" : isCurrent ? "text-[#007AFF]" : "text-[#C7C7CC]"
                      )}>
                        {step.label}
                      </h4>
                      {isCurrent && !acting && (
                        <span className="text-[11px] text-[#007AFF]">← activo</span>
                      )}
                    </div>
                    {stepDate ? (
                      <p className="text-[11px] text-[#86868B]">
                        {new Date(stepDate).toLocaleString("es-CO", {
                          day: "numeric", month: "long", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#C7C7CC]">{step.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {isCompleted && (
          <div className="rounded-2xl border border-[#34C759]/30 bg-[#34C759]/5 p-5 text-center">
            <CheckCircle2 className="mx-auto size-8 text-[#34C759]" />
            <p className="mt-2 text-[14px] font-medium text-[#34C759]">
              Requisición completada — Asignada a proyecto
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
