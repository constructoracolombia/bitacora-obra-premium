"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Circle,
  DollarSign,
  Building2,
  User,
  Calendar,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Adicional {
  id: string;
  proyecto_id: string;
  descripcion: string;
  monto: number;
  estado: string;
  solicitado_por: string | null;
  saldo_pendiente: number;
  notas: string | null;
  fecha_solicitud: string | null;
  fecha_aprobacion: string | null;
  fecha_pago_50: string | null;
  fecha_inicio_trabajo: string | null;
  fecha_finalizacion: string | null;
  fecha_saldo: string | null;
  created_at: string;
}

const STEPS = [
  { key: "SOLICITUD_CLIENTE", label: "Solicitud del cliente", dateField: "fecha_solicitud", action: "Solicitar" },
  { key: "APROBADO_GERENCIA", label: "Aprobado por gerencia", dateField: "fecha_aprobacion", action: "Aprobar" },
  { key: "PAGO_50_CONFIRMADO", label: "Cliente pagó 50%", dateField: "fecha_pago_50", action: "Confirmar Pago 50%" },
  { key: "EN_EJECUCION", label: "Trabajo iniciado", dateField: "fecha_inicio_trabajo", action: "Iniciar Trabajo" },
  { key: "FINALIZADO", label: "Trabajo finalizado", dateField: "fecha_finalizacion", action: "Finalizar Trabajo" },
  { key: "SALDO_PENDIENTE", label: "Saldo registrado", dateField: "fecha_saldo", action: "Registrar Saldo" },
] as const;

const STEP_ORDER = STEPS.map((s) => s.key);

function getStepIndex(estado: string): number {
  const idx = STEP_ORDER.indexOf(estado as (typeof STEP_ORDER)[number]);
  return idx >= 0 ? idx : 0;
}

export default function AdicionalDetailPage() {
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
          estado: (r.estado as string) ?? "SOLICITUD_CLIENTE",
          solicitado_por: (r.solicitado_por as string) ?? null,
          saldo_pendiente: Number(r.saldo_pendiente) || 0,
          notas: (r.notas as string) ?? null,
          fecha_solicitud: (r.fecha_solicitud as string) ?? null,
          fecha_aprobacion: (r.fecha_aprobacion as string) ?? null,
          fecha_pago_50: (r.fecha_pago_50 as string) ?? null,
          fecha_inicio_trabajo: (r.fecha_inicio_trabajo as string) ?? null,
          fecha_finalizacion: (r.fecha_finalizacion as string) ?? null,
          fecha_saldo: (r.fecha_saldo as string) ?? null,
          created_at: (r.created_at as string) ?? "",
        };
        setAdicional(ad);

        // Fetch project name
        const { data: proj } = await supabase
          .from("proyectos_maestro")
          .select("cliente_nombre")
          .eq("id", ad.proyecto_id)
          .single();
        if (proj) setProyectoNombre((proj as Record<string, unknown>).cliente_nombre as string ?? "—");
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

  async function advanceStep() {
    if (!adicional) return;
    const currentIdx = getStepIndex(adicional.estado);
    if (currentIdx >= STEPS.length - 1) return;

    const nextStep = STEPS[currentIdx + 1];
    setActing(true);

    try {
      const update: any = {
        estado: nextStep.key,
        [nextStep.dateField]: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("adicionales")
        .update(update)
        .eq("id", adicional.id);

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error("Error advancing:", err);
    } finally {
      setActing(false);
    }
  }

  function formatDate(date: string | null): string {
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

  const currentStepIdx = getStepIndex(adicional.estado);
  const nextStep = currentStepIdx < STEPS.length - 1 ? STEPS[currentStepIdx + 1] : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-8 py-4">
          <Button variant="ghost" size="icon" className="size-8 text-[#86868B] hover:bg-[#F5F5F7]" asChild>
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
          <h2 className="text-[16px] font-semibold text-[#1D1D1F]">{adicional.descripcion}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
              <Building2 className="size-4" />
              <span>{proyectoNombre}</span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
              <DollarSign className="size-4" />
              <span className="font-medium text-[#1D1D1F]">${adicional.monto.toLocaleString("es-CO")}</span>
            </div>
            {adicional.solicitado_por && (
              <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
                <User className="size-4" />
                <span>{adicional.solicitado_por}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
              <Calendar className="size-4" />
              <span>{formatDate(adicional.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
          <h3 className="mb-6 text-[14px] font-semibold text-[#1D1D1F]">Flujo de aprobación</h3>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-[#F5F5F7]" />

            <div className="space-y-6">
              {STEPS.map((step, idx) => {
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const dateValue = adicional[step.dateField as keyof Adicional] as string | null;

                return (
                  <div key={step.key} className="relative flex items-start gap-4">
                    {/* Circle */}
                    <div className="relative z-10">
                      {isCompleted ? (
                        <div className={cn(
                          "flex size-8 items-center justify-center rounded-full",
                          isCurrent ? "bg-[#007AFF]" : "bg-[#34C759]"
                        )}>
                          <CheckCircle2 className="size-4 text-white" />
                        </div>
                      ) : (
                        <div className="flex size-8 items-center justify-center rounded-full border-2 border-[#D2D2D7] bg-white">
                          <Circle className="size-4 text-[#D2D2D7]" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 pb-1">
                      <p className={cn(
                        "text-[14px] font-medium",
                        isCompleted ? "text-[#1D1D1F]" : "text-[#86868B]"
                      )}>
                        {step.label}
                      </p>
                      {dateValue && (
                        <p className="mt-0.5 text-[12px] text-[#86868B]">
                          {formatDate(dateValue)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action button */}
        {nextStep && (
          <Button
            onClick={advanceStep}
            disabled={acting}
            className="w-full rounded-xl bg-[#007AFF] py-3 text-white shadow-sm hover:bg-[#0051D5]"
          >
            {acting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              nextStep.action
            )}
          </Button>
        )}

        {/* Final state */}
        {!nextStep && (
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
