// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
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
  solicitado_por: string | null;
  aprobado_por: string | null;
  notas: string | null;
  fecha_solicitada: string | null;
  fecha_aprobada: string | null;
  fecha_comprada: string | null;
  fecha_recibida: string | null;
  created_at: string;
}

const STEPS = [
  {
    key: "solicitada",
    label: "Solicitada",
    description: "Requisición creada",
    dateField: "fecha_solicitada",
    action: null,
  },
  {
    key: "aprobada",
    label: "Aprobada",
    description: "Requisición aprobada",
    dateField: "fecha_aprobada",
    action: "Aprobar",
  },
  {
    key: "comprada",
    label: "Comprada",
    description: "Materiales comprados",
    dateField: "fecha_comprada",
    action: "Marcar comprada",
  },
  {
    key: "recibida",
    label: "Recibida en obra",
    description: "Materiales recibidos",
    dateField: "fecha_recibida",
    action: "Marcar recibida",
  },
];

const STEP_KEYS = STEPS.map((s) => s.key);

function getStepIndex(estado: string): number {
  const idx = STEP_KEYS.indexOf(estado);
  return idx >= 0 ? idx : 0;
}

export default function RequisicionDetailPage() {
  const supabase = getSupabaseClient();
  const params = useParams();
  const id = params.id as string;

  const [requisicion, setRequisicion] = useState<Requisicion | null>(null);
  const [proyectoNombre, setProyectoNombre] = useState<string>("—");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

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
          solicitado_por: (r.solicitado_por as string) ?? null,
          aprobado_por: (r.aprobado_por as string) ?? null,
          notas: (r.notas as string) ?? null,
          fecha_solicitada: (r.fecha_solicitada as string) ?? null,
          fecha_aprobada: (r.fecha_aprobada as string) ?? null,
          fecha_comprada: (r.fecha_comprada as string) ?? null,
          fecha_recibida: (r.fecha_recibida as string) ?? null,
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

  async function avanzarPaso() {
    if (!requisicion) return;

    const currentIdx = getStepIndex(requisicion.estado);

    if (currentIdx + 1 >= STEPS.length) {
      alert("La requisición ya esta completada");
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
            <Link href="/requisiciones">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="truncate text-lg font-semibold tracking-tight text-[#1D1D1F]">
            Detalle Requisición
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-8 py-8">
        {/* Info card */}
        <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
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
          {requisicion.notas && (
            <div className="mt-4 rounded-xl bg-[#F5F5F7]/60 p-4">
              <p className="text-[12px] font-medium text-[#86868B]">Notas</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#1D1D1F]">
                {requisicion.notas}
              </p>
            </div>
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
                <div key={step.key} className="flex gap-4 items-start">
                  {/* Checkbox + line */}
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
                          <svg
                            className="w-4 h-4 text-white"
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
                        className={`w-0.5 h-12 mt-2 transition-colors ${
                          isCompleted ? "bg-blue-500" : "bg-gray-300"
                        }`}
                      />
                    )}
                  </div>

                  {/* Content */}
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
                        isCompleted || isCurrent
                          ? "text-gray-600"
                          : "text-gray-400"
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
              Material recibido en obra
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
