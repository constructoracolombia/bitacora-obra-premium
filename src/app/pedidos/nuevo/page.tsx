"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Send,
  AlertTriangle,
  Camera,
  FileSpreadsheet,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MaterialAutocomplete } from "@/components/pedidos/MaterialAutocomplete";
import { FotoEvidenciaInput } from "@/components/pedidos/FotoEvidenciaInput";
import { SwipeableOrderCard } from "@/components/pedidos/SwipeableOrderCard";
import { EmptyState } from "@/components/EmptyState";
import { exportPedidosExcel } from "@/lib/exports";
import { notifyPedidoAprobado } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const UNIDADES = [
  { value: "m2", label: "m²" },
  { value: "m3", label: "m³" },
  { value: "kg", label: "kg" },
  { value: "und", label: "Unidades" },
  { value: "gl", label: "Galones" },
  { value: "bulto", label: "Bultos" },
  { value: "rollo", label: "Rollos" },
  { value: "ml", label: "ml" },
  { value: "mt", label: "Metros lineales" },
];

const PRESUPUESTO_EXCESO_LIMITE = 1.1;
const COSTO_FOTO_REQUERIDA = 500000;

interface ProyectoOption {
  id: string;
  cliente_nombre: string | null;
}

interface PedidoRow {
  id: string;
  proyecto_id: string;
  item: string;
  cantidad: number;
  unidad: string | null;
  estado: string;
  costo_estimado: number | null;
  costo_real?: number | null;
  presupuesto_original: number | null;
  fecha_consumo?: string | null;
  created_at: string;
  proyecto?: { cliente_nombre: string | null };
}

function PedidosNuevoContent() {
  const searchParams = useSearchParams();
  const proyectoFromUrl = searchParams.get("proyecto") ?? "";
  const [step, setStep] = useState(1);
  const [proyectos, setProyectos] = useState<ProyectoOption[]>([]);
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState<string>("TODOS");
  const [isAdmin] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("admin") === "1";
  });

  const [form, setForm] = useState({
    proyecto_id: proyectoFromUrl,
    item: "",
    cantidad: "",
    unidad: "und",
    costo_estimado: "",
    presupuesto_original: "",
    justificacion: "",
    fotos_url: [] as string[],
  });

  const costoEstimado = Number(form.costo_estimado) || 0;
  const presupuestoOriginal = Number(form.presupuesto_original) || 0;
  const excedePresupuesto =
    presupuestoOriginal > 0 &&
    costoEstimado > presupuestoOriginal * PRESUPUESTO_EXCESO_LIMITE;
  const requiereFoto = costoEstimado > COSTO_FOTO_REQUERIDA;

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = getSupabase();

        const [proyectosRes, pedidosRes] = await Promise.all([
          supabase
            .from("proyectos_maestro")
            .select("id, cliente_nombre")
            .order("cliente_nombre"),
          supabase
            .from("pedidos_material")
            .select(
              "id, proyecto_id, item, cantidad, unidad, estado, costo_estimado, costo_real, presupuesto_original, fecha_consumo, created_at"
            )
            .order("created_at", { ascending: false }),
        ]);

        if (proyectosRes.data) {
          const projList = proyectosRes.data as ProyectoOption[];
          setProyectos(projList);
          if (proyectoFromUrl && projList.some((p) => p.id === proyectoFromUrl)) {
            setForm((f) => ({ ...f, proyecto_id: proyectoFromUrl }));
          }
        }
        if (pedidosRes.data) {
          const projMap = new Map(
            (proyectosRes.data as ProyectoOption[]).map((p) => [p.id, p])
          );
          setPedidos(
            (pedidosRes.data as PedidoRow[]).map((p) => ({
              ...p,
              proyecto: projMap.get(p.proyecto_id)
                ? { cliente_nombre: projMap.get(p.proyecto_id)!.cliente_nombre }
                : undefined,
            }))
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [proyectoFromUrl]);

  async function refetchPedidos() {
    const supabase = getSupabase();
    const { data: pedidosData } = await supabase
      .from("pedidos_material")
      .select(
        "id, proyecto_id, item, cantidad, unidad, estado, costo_estimado, costo_real, presupuesto_original, fecha_consumo, created_at"
      )
      .order("created_at", { ascending: false });
    if (pedidosData && proyectos.length > 0) {
      const projMap = new Map(proyectos.map((p) => [p.id, p]));
      setPedidos(
        (pedidosData as PedidoRow[]).map((p) => ({
          ...p,
          proyecto: projMap.get(p.proyecto_id)
            ? { cliente_nombre: projMap.get(p.proyecto_id)!.cliente_nombre }
            : undefined,
        }))
      );
    } else if (pedidosData) {
      setPedidos(pedidosData as PedidoRow[]);
    }
  }

  async function handleSubmit() {
    if (!form.proyecto_id || !form.item || !form.cantidad) return;
    if (excedePresupuesto && !form.justificacion.trim()) return;
    if (requiereFoto && form.fotos_url.length === 0) return;

    setSubmitting(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("pedidos_material").insert({
        proyecto_id: form.proyecto_id,
        item: form.item.trim(),
        cantidad: Number(form.cantidad),
        unidad: form.unidad,
        estado: "PENDING",
        costo_estimado: costoEstimado || null,
        presupuesto_original: presupuestoOriginal || null,
        justificacion: form.justificacion.trim() || null,
        fotos_url: form.fotos_url,
      });

      if (error) throw error;

      setForm({
        proyecto_id: form.proyecto_id,
        item: "",
        cantidad: "",
        unidad: "und",
        costo_estimado: "",
        presupuesto_original: "",
        justificacion: "",
        fotos_url: [],
      });
      setStep(1);
      refetchPedidos();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(id: string) {
    const pedido = pedidos.find((p) => p.id === id);
    const supabase = getSupabase();
    await supabase
      .from("pedidos_material")
      .update({ estado: "APPROVED" })
      .eq("id", id);
    refetchPedidos();
    if (pedido) notifyPedidoAprobado(pedido.item);
  }

  async function handleReject(id: string) {
    const supabase = getSupabase();
    await supabase.from("pedidos_material").delete().eq("id", id);
    refetchPedidos();
  }

  const filteredPedidos =
    estadoFilter === "TODOS"
      ? pedidos
      : pedidos.filter((p) => p.estado === estadoFilter);

  const canNextStep1 = form.proyecto_id && form.item.trim();
  const canNextStep2 = form.cantidad && Number(form.cantidad) > 0;
  const canSubmit =
    canNextStep1 &&
    canNextStep2 &&
    (!excedePresupuesto || form.justificacion.trim()) &&
    (!requiereFoto || form.fotos_url.length > 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-8 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="size-8 text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <h1 className="text-lg font-semibold tracking-tight text-[#1D1D1F]">Pide Fácil</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-[#D2D2D7] text-[13px] text-[#1D1D1F] hover:bg-[#F5F5F7]"
            onClick={() =>
              exportPedidosExcel(
                pedidos.map((p) => ({
                  item: p.item,
                  cantidad: p.cantidad,
                  unidad: p.unidad,
                  estado: p.estado,
                  costo_estimado: p.costo_estimado,
                  costo_real: p.costo_real ?? null,
                  fecha_consumo: p.fecha_consumo ?? null,
                  created_at: p.created_at,
                }))
              )
            }
          >
            <FileSpreadsheet className="size-3.5" />
            Exportar
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-8 py-8">
        {/* Wizard */}
        <section className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
          <div className="mb-6 flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  step >= s ? "bg-[#007AFF]" : "bg-[#F5F5F7]"
                )}
              />
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-[15px] font-semibold text-[#1D1D1F]">
                Paso 1: Seleccionar Material
              </h2>
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Proyecto</Label>
                <Select
                  value={form.proyecto_id}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, proyecto_id: v }))
                  }
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-[#D2D2D7]">
                    <SelectValue placeholder="Selecciona un proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {proyectos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.cliente_nombre || "Sin nombre"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Material</Label>
                <MaterialAutocomplete
                  value={form.item}
                  onChange={(v) => setForm((f) => ({ ...f, item: v }))}
                />
              </div>
              <Button
                className="mt-4 w-full rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
                disabled={!canNextStep1}
                onClick={() => setStep(2)}
              >
                Siguiente
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-[15px] font-semibold text-[#1D1D1F]">
                Paso 2: Cantidad y Unidad
              </h2>
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Cantidad</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cantidad}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cantidad: e.target.value }))
                  }
                  placeholder="0"
                  className="h-16 rounded-xl border-[#D2D2D7] text-center text-3xl focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Unidad</Label>
                <Select
                  value={form.unidad}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, unidad: v }))
                  }
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-[#D2D2D7]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Costo estimado (COP)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.costo_estimado}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, costo_estimado: e.target.value }))
                    }
                    placeholder="0"
                    className="h-11 rounded-xl border-[#D2D2D7] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Presupuesto original (COP)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.presupuesto_original}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        presupuesto_original: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="h-11 rounded-xl border-[#D2D2D7] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl border-[#D2D2D7]"
                  onClick={() => setStep(1)}
                >
                  Atrás
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
                  disabled={!canNextStep2}
                  onClick={() => setStep(3)}
                >
                  Siguiente
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-[15px] font-semibold text-[#1D1D1F]">
                Paso 3: Validación
              </h2>

              {/* Summary */}
              <div className="rounded-xl border border-[#D2D2D7]/40 bg-[#F5F5F7]/50 p-4">
                <p className="text-[13px] text-[#86868B]">
                  Presupuesto original: $
                  {presupuestoOriginal.toLocaleString("es-CO")}
                </p>
                <p className="text-[13px] text-[#86868B]">
                  Cantidad solicitada: $
                  {costoEstimado.toLocaleString("es-CO")}
                </p>
                {excedePresupuesto && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#FF9500]/30 bg-[#FF9500]/10 p-3">
                    <AlertTriangle className="size-4 shrink-0 text-[#FF9500]" />
                    <p className="text-[13px] text-[#FF9500]">
                      La solicitud excede el 10% del presupuesto. Debes
                      justificar.
                    </p>
                  </div>
                )}
              </div>

              {excedePresupuesto && (
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Justificación (obligatorio)</Label>
                  <textarea
                    value={form.justificacion}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, justificacion: e.target.value }))
                    }
                    placeholder="Explica por qué se excede el presupuesto..."
                    className="min-h-[80px] w-full rounded-xl border border-[#D2D2D7] px-4 py-2.5 text-[13px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
                    rows={3}
                  />
                </div>
              )}

              {requiereFoto && (
                <FotoEvidenciaInput
                  fotos={form.fotos_url}
                  proyectoId={form.proyecto_id}
                  onFotosChange={(urls) =>
                    setForm((f) => ({ ...f, fotos_url: urls }))
                  }
                />
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl border-[#D2D2D7]"
                  onClick={() => setStep(2)}
                >
                  Atrás
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5] disabled:opacity-50"
                  disabled={!canSubmit || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="size-4" />
                      Enviar Solicitud
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Orders list */}
        <section>
          <h2 className="mb-4 text-[15px] font-semibold text-[#1D1D1F]">
            Pedidos
          </h2>

          {/* Filters */}
          <div className="mb-4 flex gap-1.5 overflow-x-auto rounded-xl bg-[#F5F5F7] p-1">
            {[
              { value: "TODOS", label: "Todos" },
              { value: "PENDING", label: "Pendientes" },
              { value: "APPROVED", label: "Aprobados" },
              { value: "DELIVERED", label: "Entregados" },
              { value: "CONSUMED", label: "Consumidos" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setEstadoFilter(f.value)}
                className={cn(
                  "shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200",
                  estadoFilter === f.value
                    ? "bg-white text-[#1D1D1F] shadow-sm"
                    : "text-[#86868B] hover:text-[#1D1D1F]"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredPedidos.map((pedido) => (
              <SwipeableOrderCard
                key={pedido.id}
                pedido={pedido}
                isAdmin={isAdmin}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>

          {filteredPedidos.length === 0 && (
            <EmptyState
              variant="pedidos"
              title={
                estadoFilter === "TODOS"
                  ? "No hay pedidos pendientes"
                  : "No hay pedidos con el filtro seleccionado"
              }
              description={
                estadoFilter === "TODOS"
                  ? "Tu obra está al día, Arquitecto."
                  : "Prueba con otro filtro."
              }
            />
          )}
        </section>
      </main>
    </div>
  );
}

export default function PedidosNuevoPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white"><div className="size-8 animate-spin rounded-full border-2 border-[#007AFF] border-t-transparent" /></div>}>
      <PedidosNuevoContent />
    </Suspense>
  );
}
