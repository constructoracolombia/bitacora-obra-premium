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

const PRESUPUESTO_EXCESO_LIMITE = 1.1; // 10%
const COSTO_FOTO_REQUERIDA = 500000; // 500k COP

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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-blue-500/20 bg-white">
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <h1 className="text-lg font-bold text-foreground">Pide Fácil</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-blue-500/40"
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
            <FileSpreadsheet className="size-4" />
            Exportar Excel
          </Button>
        </div>
      </header>

      <main className="space-y-8 px-4 py-6">
        {/* Wizard */}
        <section className="rounded-xl border border-blue-500/30 bg-white p-4 shadow-lg sm:p-6">
          <div className="mb-6 flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  step >= s ? "bg-blue-600" : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* PASO 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-blue-600">
                Paso 1: Seleccionar Material
              </h2>
              <div className="space-y-2">
                <Label>Proyecto</Label>
                <Select
                  value={form.proyecto_id}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, proyecto_id: v }))
                  }
                >
                  <SelectTrigger className="h-12 w-full border-blue-500/30">
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
                <Label>Material</Label>
                <MaterialAutocomplete
                  value={form.item}
                  onChange={(v) => setForm((f) => ({ ...f, item: v }))}
                />
              </div>
              <Button
                className="mt-4 w-full bg-blue-600 text-white"
                disabled={!canNextStep1}
                onClick={() => setStep(2)}
              >
                Siguiente
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}

          {/* PASO 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-blue-600">
                Paso 2: Cantidad y Unidad
              </h2>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cantidad}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cantidad: e.target.value }))
                  }
                  placeholder="0"
                  className="h-16 text-3xl text-center"
                />
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Select
                  value={form.unidad}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, unidad: v }))
                  }
                >
                  <SelectTrigger className="h-12 w-full border-blue-500/30">
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
                  <Label>Costo estimado (COP)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.costo_estimado}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, costo_estimado: e.target.value }))
                    }
                    placeholder="0"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Presupuesto original (COP)</Label>
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
                    className="h-12"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-blue-500/40"
                  onClick={() => setStep(1)}
                >
                  Atrás
                </Button>
                <Button
                  className="flex-1 bg-blue-600 text-white"
                  disabled={!canNextStep2}
                  onClick={() => setStep(3)}
                >
                  Siguiente
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* PASO 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-blue-600">
                Paso 3: Validación
              </h2>

              {/* Resumen */}
              <div className="rounded-lg border border-blue-500/20 bg-gray-50 p-4">
                <p className="text-sm text-muted-foreground">
                  Presupuesto original: $
                  {presupuestoOriginal.toLocaleString("es-CO")}
                </p>
                <p className="text-sm text-muted-foreground">
                  Cantidad solicitada: $
                  {costoEstimado.toLocaleString("es-CO")}
                </p>
                {excedePresupuesto && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                    <AlertTriangle className="size-5 shrink-0 text-amber-400" />
                    <p className="text-sm text-amber-400">
                      La solicitud excede el 10% del presupuesto. Debes
                      justificar.
                    </p>
                  </div>
                )}
              </div>

              {excedePresupuesto && (
                <div className="space-y-2">
                  <Label>Justificación (obligatorio)</Label>
                  <textarea
                    value={form.justificacion}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, justificacion: e.target.value }))
                    }
                    placeholder="Explica por qué se excede el presupuesto..."
                    className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                  className="border-blue-500/40"
                  onClick={() => setStep(2)}
                >
                  Atrás
                </Button>
                <Button
                  className="flex-1 bg-blue-600 text-white disabled:opacity-50"
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

        {/* Lista de Pedidos Pendientes */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-blue-600">
            Pedidos
          </h2>

          {/* Filtros */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
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
                  "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  estadoFilter === f.value
                    ? "border-blue-500 bg-blue-600/20 text-blue-600"
                    : "border-white/20 text-muted-foreground hover:border-blue-500/40"
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
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="size-12 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" /></div>}>
      <PedidosNuevoContent />
    </Suspense>
  );
}
