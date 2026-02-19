// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  DollarSign,
  Building2,
  User,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Adicional {
  id: string;
  proyecto_id: string;
  descripcion: string;
  monto: number;
  estado: string;
  solicitado_por: string | null;
  notas: string | null;
  fecha_solicitud: string | null;
  fecha_aprobacion: string | null;
  fecha_primer_pago: string | null;
  fecha_inicio_trabajo: string | null;
  fecha_fin_trabajo: string | null;
  fecha_pago_final: string | null;
  created_at: string;
}

const STEPS = [
  {
    key: "solicitado",
    label: "Solicitud del cliente",
    description: "El cliente solicita el adicional",
    dateField: "fecha_solicitud",
    action: null,
  },
  {
    key: "aprobado_gerencia",
    label: "Aprobado por gerencia",
    description: "Gerencia aprueba el adicional",
    dateField: "fecha_aprobacion",
    action: "Aprobar",
  },
  {
    key: "pago_50",
    label: "Cliente pagó 50%",
    description: "Primer pago recibido",
    dateField: "fecha_primer_pago",
    action: "Registrar pago 50%",
  },
  {
    key: "trabajo_iniciado",
    label: "Trabajo iniciado",
    description: "Inicio de trabajos",
    dateField: "fecha_inicio_trabajo",
    action: "Iniciar trabajo",
  },
  {
    key: "trabajo_finalizado",
    label: "Trabajo finalizado",
    description: "Trabajos completados",
    dateField: "fecha_fin_trabajo",
    action: "Marcar finalizado",
  },
  {
    key: "pagado",
    label: "Pagó segundo 50%",
    description: "Pago final recibido",
    dateField: "fecha_pago_final",
    action: "Registrar pago final",
  },
];

const STEP_KEYS = STEPS.map((s) => s.key);

function getStepIndex(estado: string): number {
  const idx = STEP_KEYS.indexOf(estado);
  return idx >= 0 ? idx : 0;
}

export default function AdicionalDetailPage() {
  const supabase = getSupabaseClient();
  const params = useParams();
  const id = params.id as string;

  const [adicional, setAdicional] = useState<Adicional | null>(null);
  const [proyectoNombre, setProyectoNombre] = useState<string>("—");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("adicionales")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) {
        const r = data as Record<string, unknown>;
        const ad: Adicional = {
          id: r.id as string,
          proyecto_id: r.proyecto_id as string,
          descripcion: r.descripcion as string,
          monto: Number(r.monto) || 0,
          estado: (r.estado as string) ?? "solicitado",
          solicitado_por: (r.solicitado_por as string) ?? null,
          notas: (r.notas as string) ?? null,
          fecha_solicitud: (r.fecha_solicitud as string) ?? null,
          fecha_aprobacion: (r.fecha_aprobacion as string) ?? null,
          fecha_primer_pago: (r.fecha_primer_pago as string) ?? null,
          fecha_inicio_trabajo: (r.fecha_inicio_trabajo as string) ?? null,
          fecha_fin_trabajo: (r.fecha_fin_trabajo as string) ?? null,
          fecha_pago_final: (r.fecha_pago_final as string) ?? null,
          created_at: (r.created_at as string) ?? "",
        };
        setAdicional(ad);

        const { data: proj } = await supabase
          .from("proyectos_maestro")
          .select("cliente_nombre")
          .eq("id", ad.proyecto_id)
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

  async function avanzarPaso() {
    if (!adicional) return;

    const currentIdx = getStepIndex(adicional.estado);
    const nextStep = STEPS[currentIdx + 1];

    if (!nextStep) {
      alert("El adicional ya esta completado");
      return;
    }

    setActing(true);

    try {
      const update: any = {
        estado: nextStep.key,
        [nextStep.dateField]: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("adicionales")
        .update(update as any)
        .eq("id", adicional.id);

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
    if (!adicional) return;

    if (targetIdx === 0) {
      alert("No se puede retroceder mas");
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
        .from("adicionales")
        .update(update as any)
        .eq("id", adicional.id);

      if (error) {
        console.error("Error:", error);
        throw error;
      }

      await fetchData();
    } catch (err) {
      console.error("Error retrocediendo:", err);
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

  if (!adicional) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8">
        <p className="text-[#86868B]">Adicional no encontrado</p>
        <Button variant="outline" asChild>
          <Link href="/adicionales">Volver</Link>
        </Button>
      </div>
    );
  }

  const currentStepIndex = getStepIndex(adicional.estado);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-8 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-[#86868B] hover:bg-[#F5F5F7]"
            asChild
          >
            <Link href="/adicionales">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="truncate text-lg font-semibold tracking-tight text-[#1D1D1F]">
            Detalle Adicional
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-8 py-8">
        {/* Info card */}
        <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
          <h2 className="text-[16px] font-semibold text-[#1D1D1F]">
            {adicional.descripcion}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
              <Building2 className="size-4" />
              <span>{proyectoNombre}</span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
              <DollarSign className="size-4" />
              <span className="font-medium text-[#1D1D1F]">
                ${adicional.monto.toLocaleString("es-CO")}
              </span>
            </div>
            {adicional.solicitado_por && (
              <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
                <User className="size-4" />
                <span>{adicional.solicitado_por}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
              <Calendar className="size-4" />
              <span>{fmtDate(adicional.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
          <h3 className="mb-6 text-[14px] font-semibold text-[#1D1D1F]">
            Flujo de aprobación
          </h3>

          <div className="space-y-2">
            {STEPS.map((step, idx) => {
              const isCompleted = currentStepIndex > idx;
              const isCurrent = currentStepIndex === idx;
              const canCheck = isCurrent;
              const canUncheck = isCompleted;
              const stepDate =
                adicional[step.dateField as keyof Adicional] as string | null;

              return (
                <div key={step.key} className="flex gap-4 items-start">
                  {/* Checkbox + linea vertical */}
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
                        className="sr-only peer"
                      />
                      <div
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                          isCompleted
                            ? "bg-blue-500 border-blue-500 hover:bg-blue-600 cursor-pointer"
                            : canCheck
                              ? "border-blue-500 hover:bg-blue-50 cursor-pointer"
                              : "border-gray-300 bg-gray-100 cursor-not-allowed"
                        }`}
                      >
                        {isCompleted && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </label>
                    {idx < STEPS.length - 1 && (
                      <div
                        className={`w-0.5 h-12 mt-2 transition-colors ${
                          isCompleted ? "bg-blue-500" : "bg-gray-300"
                        }`}
                      />
                    )}
                  </div>

                  {/* Contenido del paso */}
                  <div className="flex-1 pb-2">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                          isCompleted
                            ? "bg-blue-500 text-white"
                            : isCurrent
                              ? "bg-blue-100 text-blue-600 border-2 border-blue-500"
                              : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <h4
                        className={`font-semibold ${
                          isCompleted
                            ? "text-gray-900"
                            : isCurrent
                              ? "text-blue-600"
                              : "text-gray-400"
                        }`}
                      >
                        {step.label}
                      </h4>
                    </div>

                    <p
                      className={`text-sm mt-1 ml-8 ${
                        isCompleted || isCurrent ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      {step.description}
                    </p>

                    {stepDate && (
                      <p className="text-xs text-gray-500 mt-1 ml-8">
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
                      <p className="text-xs text-blue-600 mt-1 ml-8 font-medium">
                        ← Marca la casilla para avanzar
                      </p>
                    )}

                    {acting && isCurrent && (
                      <div className="flex items-center gap-2 text-blue-600 mt-2 ml-8">
                        <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full" />
                        <span className="text-xs">Procesando...</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Final state */}
        {currentStepIndex >= STEPS.length - 1 && (
          <div className="rounded-2xl border border-[#34C759]/30 bg-[#34C759]/5 p-5 text-center">
            <CheckCircle2 className="mx-auto size-8 text-[#34C759]" />
            <p className="mt-2 text-[14px] font-medium text-[#34C759]">
              Adicional completado
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
