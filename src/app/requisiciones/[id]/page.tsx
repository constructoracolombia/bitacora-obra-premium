// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Building2,
  Home,
  Tag,
  Package,
  User,
  Calendar,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  created_at: string;
}

const STEPS = [
  {
    key: "solicitada",
    label: "Solicitada",
    description: "Requisición creada",
    dateField: "fecha_solicitada",
  },
  {
    key: "por_aprobar",
    label: "Por Aprobar",
    description: "Pendiente de aprobación",
    dateField: "fecha_por_aprobar",
  },
  {
    key: "en_compras",
    label: "En Compras",
    description: "En proceso de compra",
    dateField: "fecha_en_compras",
  },
  {
    key: "recepcion_obra",
    label: "Recepción por obra",
    description: "Materiales en obra",
    dateField: "fecha_recepcion_obra",
  },
  {
    key: "asignado_proyecto",
    label: "Asignado a proyecto",
    description: "Completado",
    dateField: "fecha_asignado_proyecto",
  },
];

const STEP_KEYS = STEPS.map((s) => s.key);

function getStepIndex(estado: string): number {
  const idx = STEP_KEYS.indexOf(estado);
  return idx >= 0 ? idx : 0;
}

const URGENCIA_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  baja: { bg: "bg-[#86868B]/10", text: "text-[#86868B]", label: "Baja" },
  normal: { bg: "bg-[#007AFF]/10", text: "text-[#007AFF]", label: "Normal" },
  alta: { bg: "bg-[#FF3B30]/10", text: "text-[#FF3B30]", label: "Alta" },
};

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
  });

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
          created_at: (r.created_at as string) ?? "",
        };
        setRequisicion(req);

        const { data: proj } = await supabase
          .from("proyectos_maestro")
          .select("cliente_nombre")
          .eq("id", req.proyecto_id)
          .single();
        if (proj)
          setProyectoNombre(
            ((proj as Record<string, unknown>).cliente_nombre as string) ?? "—"
          );
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
      setFormEdit({
        descripcion: requisicion.descripcion || "",
        urgencia: requisicion.urgencia || "normal",
        cantidad: requisicion.cantidad?.toString() || "",
        unidad: requisicion.unidad || "",
        notas: requisicion.notas || "",
      });
    }
  }, [requisicion]);

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
        } as any)
        .eq("id", requisicion.id);

      if (error) throw error;

      await fetchData();
      setEditando(false);
    } catch (err) {
      console.error("Error:", err);
      alert("Error al guardar cambios");
    } finally {
      setActing(false);
    }
  }

  async function eliminarRequisicion() {
    if (!requisicion) return;
    if (!confirm("¿Estás seguro de eliminar esta requisición? Esta acción no se puede deshacer.")) return;

    try {
      const { error } = await supabase
        .from("requisiciones")
        .delete()
        .eq("id", requisicion.id);

      if (error) throw error;
      router.push("/requisiciones");
    } catch (err) {
      console.error("Error:", err);
      alert("Error al eliminar requisición");
    }
  }

  async function avanzarPaso() {
    if (!requisicion) return;

    const currentIdx = getStepIndex(requisicion.estado);

    if (currentIdx + 1 >= STEPS.length) {
      alert("La requisición ya está completada");
      return;
    }

    const nextStep = STEPS[currentIdx + 1];
    setActing(true);

    try {
      const update: any = {
        estado: nextStep.key,
        [nextStep.dateField]: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("requisiciones")
        .update(update as any)
        .eq("id", requisicion.id);

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error("Error:", err);
      alert("Error al avanzar paso");
    } finally {
      setActing(false);
    }
  }

  async function retrocederPaso(targetIdx: number) {
    if (!requisicion) return;

    if (targetIdx === 0) {
      alert("No se puede retroceder más");
      return;
    }

    const previousStep = STEPS[targetIdx - 1];
    setActing(true);

    try {
      const update: any = {
        estado: previousStep.key,
        [STEPS[targetIdx].dateField]: null,
      };

      const { error } = await supabase
        .from("requisiciones")
        .update(update as any)
        .eq("id", requisicion.id);

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error("Error:", err);
      alert("Error al retroceder paso");
    } finally {
      setActing(false);
    }
  }

  function fmtDate(date: string | null): string {
    if (!date) return "";
    try {
      return format(new Date(date), "d MMM yyyy, HH:mm", { locale: es });
    } catch {
      return date;
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
  const urg = URGENCIA_STYLES[requisicion.urgencia || "normal"] ?? URGENCIA_STYLES.normal;

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-[#86868B] hover:bg-[#F5F5F7]"
              asChild
            >
              <Link href="/requisiciones">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <h1 className="truncate text-lg font-semibold tracking-tight text-[#1D1D1F]">
              Detalle Requisición
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (editando) {
                  setEditando(false);
                  if (requisicion) {
                    setFormEdit({
                      descripcion: requisicion.descripcion || "",
                      urgencia: requisicion.urgencia || "normal",
                      cantidad: requisicion.cantidad?.toString() || "",
                      unidad: requisicion.unidad || "",
                      notas: requisicion.notas || "",
                    });
                  }
                } else {
                  setEditando(true);
                }
              }}
              className={cn(
                "rounded-lg text-[13px]",
                editando
                  ? "text-[#86868B] hover:bg-[#F5F5F7]"
                  : "text-[#007AFF] hover:bg-[#007AFF]/5"
              )}
            >
              {editando ? (
                <>
                  <X className="size-3.5" />
                  Cancelar
                </>
              ) : (
                <>
                  <Pencil className="size-3.5" />
                  Editar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={eliminarRequisicion}
              className="rounded-lg text-[13px] text-[#FF3B30] hover:bg-[#FF3B30]/5"
            >
              <Trash2 className="size-3.5" />
              Eliminar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-8 py-8">
        {/* Info card */}
        <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
          {editando ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Descripción *</Label>
                <textarea
                  value={formEdit.descripcion}
                  onChange={(e) => setFormEdit((f) => ({ ...f, descripcion: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-[#D2D2D7] px-4 py-3 text-[14px] text-[#1D1D1F] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Urgencia</Label>
                <select
                  value={formEdit.urgencia}
                  onChange={(e) => setFormEdit((f) => ({ ...f, urgencia: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-[#D2D2D7] bg-white px-4 text-[14px] text-[#1D1D1F] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
                >
                  <option value="baja">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Cantidad</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formEdit.cantidad}
                    onChange={(e) => setFormEdit((f) => ({ ...f, cantidad: e.target.value }))}
                    className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Unidad</Label>
                  <Input
                    value={formEdit.unidad}
                    onChange={(e) => setFormEdit((f) => ({ ...f, unidad: e.target.value }))}
                    placeholder="m², kg, unidades..."
                    className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Notas</Label>
                <textarea
                  value={formEdit.notas}
                  onChange={(e) => setFormEdit((f) => ({ ...f, notas: e.target.value }))}
                  rows={3}
                  placeholder="Notas adicionales..."
                  className="w-full rounded-xl border border-[#D2D2D7] px-4 py-3 text-[14px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
                />
              </div>

              <Button
                onClick={guardarCambios}
                disabled={acting || !formEdit.descripcion.trim()}
                className="w-full rounded-xl bg-[#007AFF] py-3 text-white shadow-sm hover:bg-[#0051D5] disabled:opacity-50"
              >
                {acting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Save className="size-4" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-[16px] font-semibold text-[#1D1D1F]">
                {requisicion.descripcion}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
                  <Building2 className="size-4" />
                  <span>{proyectoNombre}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
                  <Home className="size-4" />
                  <span>{requisicion.apartamento}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
                  <Tag className="size-4" />
                  <span>{requisicion.tipo_material}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
                  <Package className="size-4" />
                  <span className="font-medium text-[#1D1D1F]">
                    {requisicion.cantidad} {requisicion.unidad}
                  </span>
                </div>
                {requisicion.solicitado_por && (
                  <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
                    <User className="size-4" />
                    <span>{requisicion.solicitado_por}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
                  <Calendar className="size-4" />
                  <span>{fmtDate(requisicion.created_at)}</span>
                </div>
              </div>

              {requisicion.urgencia && (
                <div className="mt-3">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                      urg.bg,
                      urg.text
                    )}
                  >
                    Urgencia: {urg.label}
                  </span>
                </div>
              )}

              {requisicion.notas && (
                <div className="mt-4 rounded-xl bg-[#F5F5F7]/60 p-4">
                  <p className="text-[12px] font-medium text-[#86868B]">Notas</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#1D1D1F]">
                    {requisicion.notas}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Timeline with checkboxes */}
        <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
          <h3 className="mb-6 text-[14px] font-semibold text-[#1D1D1F]">
            Flujo de requisición
          </h3>

          <div className="space-y-2">
            {STEPS.map((step, idx) => {
              const isCompleted = currentStepIndex > idx;
              const isCurrent = currentStepIndex === idx;
              const canCheck = isCurrent;
              const stepDate =
                requisicion[step.dateField as keyof Requisicion] as
                  | string
                  | null;

              return (
                <div key={step.key} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <label className="relative cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        disabled={acting}
                        onChange={async () => {
                          if (acting) return;
                          if (isCompleted) {
                            await retrocederPaso(idx);
                          } else if (canCheck) {
                            await avanzarPaso();
                          }
                        }}
                        className="peer sr-only"
                      />
                      <div
                        className={cn(
                          "flex size-6 items-center justify-center rounded border-2 transition-all",
                          isCompleted
                            ? "cursor-pointer border-[#007AFF] bg-[#007AFF] hover:bg-[#0051D5]"
                            : canCheck
                              ? "cursor-pointer border-[#007AFF] hover:bg-[#007AFF]/5"
                              : "cursor-not-allowed border-[#D2D2D7] bg-[#F5F5F7]"
                        )}
                      >
                        {isCompleted && (
                          <svg
                            className="size-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </label>
                    {idx < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "mt-2 h-12 w-0.5 transition-colors",
                          isCompleted ? "bg-[#007AFF]" : "bg-[#D2D2D7]"
                        )}
                      />
                    )}
                  </div>

                  <div className="flex-1 pb-2">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          isCompleted
                            ? "bg-[#007AFF] text-white"
                            : isCurrent
                              ? "border-2 border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]"
                              : "bg-[#F5F5F7] text-[#86868B]"
                        )}
                      >
                        {idx + 1}
                      </span>
                      <h4
                        className={cn(
                          "font-semibold",
                          isCompleted
                            ? "text-[#1D1D1F]"
                            : isCurrent
                              ? "text-[#007AFF]"
                              : "text-[#86868B]"
                        )}
                      >
                        {step.label}
                      </h4>
                    </div>

                    <p
                      className={cn(
                        "ml-8 mt-1 text-sm",
                        isCompleted || isCurrent
                          ? "text-[#86868B]"
                          : "text-[#C7C7CC]"
                      )}
                    >
                      {step.description}
                    </p>

                    {stepDate && (
                      <p className="ml-8 mt-1 text-xs text-[#86868B]">
                        {new Date(stepDate).toLocaleString("es-CO", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}

                    {isCurrent && !acting && (
                      <p className="ml-8 mt-1 text-xs font-medium text-[#007AFF]">
                        ← Marca la casilla para avanzar
                      </p>
                    )}

                    {acting && isCurrent && (
                      <div className="ml-8 mt-2 flex items-center gap-2 text-[#007AFF]">
                        <div className="size-3 animate-spin rounded-full border-2 border-[#007AFF] border-t-transparent" />
                        <span className="text-xs">Procesando...</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {currentStepIndex >= STEPS.length - 1 && (
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
