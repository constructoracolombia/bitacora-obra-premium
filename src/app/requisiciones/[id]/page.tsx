"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Circle,
  Building2,
  Home,
  Tag,
  Package,
  User,
  Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
  solicitado_por: string | null;
  aprobado_por: string | null;
  fecha_solicitud: string | null;
  fecha_aprobacion: string | null;
  fecha_compra: string | null;
  fecha_entrega_estimada: string | null;
  fecha_recepcion: string | null;
  notas: string | null;
  created_at: string;
}

const STEPS = [
  {
    key: "SOLICITADO",
    label: "Solicitado",
    dateField: "fecha_solicitud",
    action: "Solicitar",
    description: "Requisición creada por el residente",
  },
  {
    key: "APROBADO_COMPRA",
    label: "Aprobado para compra",
    dateField: "fecha_aprobacion",
    action: "Aprobar Compra",
    description: "Gerencia aprueba la compra",
  },
  {
    key: "COMPRADO",
    label: "Comprado",
    dateField: "fecha_compra",
    action: "Marcar como Comprado",
    description: "Material adquirido",
  },
  {
    key: "RECIBIDO",
    label: "Recibido en obra",
    dateField: "fecha_recepcion",
    action: "Confirmar Recepción",
    description: "Residente confirma recepción",
  },
] as const;

const STEP_ORDER = STEPS.map((s) => s.key);

function getStepIndex(estado: string): number {
  const idx = STEP_ORDER.indexOf(estado as (typeof STEP_ORDER)[number]);
  return idx >= 0 ? idx : 0;
}

export default function RequisicionDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [requisicion, setRequisicion] = useState<Requisicion | null>(null);
  const [proyectoNombre, setProyectoNombre] = useState<string>("—");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient();
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
          estado: (r.estado as string) ?? "SOLICITADO",
          solicitado_por: (r.solicitado_por as string) ?? null,
          aprobado_por: (r.aprobado_por as string) ?? null,
          fecha_solicitud: (r.fecha_solicitud as string) ?? null,
          fecha_aprobacion: (r.fecha_aprobacion as string) ?? null,
          fecha_compra: (r.fecha_compra as string) ?? null,
          fecha_entrega_estimada: (r.fecha_entrega_estimada as string) ?? null,
          fecha_recepcion: (r.fecha_recepcion as string) ?? null,
          notas: (r.notas as string) ?? null,
          created_at: (r.created_at as string) ?? "",
        };
        setRequisicion(req);

        const { data: proj } = await supabase
          .from("proyectos_maestro")
          .select("cliente_nombre")
          .eq("id", req.proyecto_id)
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
    if (!requisicion) return;
    const currentIdx = getStepIndex(requisicion.estado);
    if (currentIdx >= STEPS.length - 1) return;

    const nextStep = STEPS[currentIdx + 1];
    setActing(true);

    try {
      const supabase = createClient();
      const update: Record<string, unknown> = {
        estado: nextStep.key,
        [nextStep.dateField]: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("requisiciones")
        .update(update)
        .eq("id", requisicion.id);

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

  const currentStepIdx = getStepIndex(requisicion.estado);
  const nextStep = currentStepIdx < STEPS.length - 1 ? STEPS[currentStepIdx + 1] : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-8 py-4">
          <Button variant="ghost" size="icon" className="size-8 text-[#86868B] hover:bg-[#F5F5F7]" asChild>
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
          <h2 className="text-[16px] font-semibold text-[#1D1D1F]">{requisicion.descripcion}</h2>

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
              <span className="font-medium text-[#1D1D1F]">{requisicion.cantidad} {requisicion.unidad}</span>
            </div>
            {requisicion.solicitado_por && (
              <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
                <User className="size-4" />
                <span>{requisicion.solicitado_por}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
              <Calendar className="size-4" />
              <span>{formatDate(requisicion.created_at)}</span>
            </div>
          </div>

          {requisicion.notas && (
            <div className="mt-4 rounded-xl bg-[#F5F5F7]/60 p-4">
              <p className="text-[12px] font-medium text-[#86868B]">Notas</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#1D1D1F]">{requisicion.notas}</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
          <h3 className="mb-6 text-[14px] font-semibold text-[#1D1D1F]">Flujo de requisición</h3>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-[#F5F5F7]" />

            <div className="space-y-6">
              {STEPS.map((step, idx) => {
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const dateValue = requisicion[step.dateField as keyof Requisicion] as string | null;

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
                      <p className="text-[12px] text-[#C7C7CC]">{step.description}</p>
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
              Material recibido en obra
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
