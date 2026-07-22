"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  calcularDiasHabiles,
  calcularProgreso,
  calcularDiasRestantes,
  obtenerProgramacionProyecto,
  type ProgramacionProyecto as ProgramacionData,
} from "@/lib/programacion";

// Reutiliza la misma lógica de conciliación calendario_proyectos ↔
// proyectos_maestro que usa /calendario (lista global), pero para un solo
// proyecto — así el detalle del proyecto en Bitácora muestra la barra de
// progreso y días de atraso sin importar si el proyecto tiene una fila
// manual en calendario_proyectos o solo los campos del contrato.

export function ProgramacionProyecto({ proyectoId }: { proyectoId: string }) {
  const supabase = getSupabaseClient();
  const [datos, setDatos] = useState<ProgramacionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!proyectoId) return;
    setLoading(true);
    obtenerProgramacionProyecto(supabase, proyectoId)
      .then(setDatos)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectoId]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-6 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6 text-center text-[13px] text-[#86868B]">
        No hay datos de programación registrados para este proyecto.
      </div>
    );
  }

  const duracion = calcularDiasHabiles(datos.fechaInicio, datos.fechaFin);
  const progreso = calcularProgreso(datos.fechaInicio, datos.fechaFin);
  const diasRestantes = calcularDiasRestantes(datos.fechaFin);
  const estaRetrasado = diasRestantes < 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-5">
          <div className="space-y-3">
            <div>
              <span className="text-[13px] text-[#86868B]">Fecha de inicio</span>
              <p className="text-[14px] font-medium capitalize text-[#1D1D1F]">
                {new Date(datos.fechaInicio + "T12:00:00").toLocaleDateString("es-CO", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <span className="text-[13px] text-[#86868B]">Fecha de entrega contractual</span>
              <p className="text-[14px] font-medium capitalize text-[#1D1D1F]">
                {new Date(datos.fechaFin + "T12:00:00").toLocaleDateString("es-CO", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <span className="text-[13px] text-[#86868B]">Duración</span>
              <p className="text-[14px] font-medium text-[#1D1D1F]">{duracion} días hábiles</p>
            </div>
            {datos.notas && (
              <div>
                <span className="text-[13px] text-[#86868B]">Notas</span>
                <p className="text-[13px] text-[#1D1D1F]">{datos.notas}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-5">
          <span className="text-[13px] text-[#86868B]">Días restantes</span>
          <p
            className={cn(
              "mt-1 text-2xl font-bold",
              estaRetrasado ? "text-[#FF3B30]" : diasRestantes <= 7 ? "text-[#FF9500]" : "text-[#34C759]"
            )}
          >
            {estaRetrasado ? `${Math.abs(diasRestantes)} días de retraso` : `${diasRestantes} días`}
          </p>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-[12px] text-[#86868B]">
              <span>Progreso del tiempo</span>
              <span className="text-[13px] font-semibold text-[#1D1D1F]">{progreso}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F5F5F7]">
              <div
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  estaRetrasado ? "bg-[#FF3B30]" : progreso > 90 ? "bg-[#FF9500]" : "bg-[#007AFF]"
                )}
                style={{ width: `${Math.min(progreso, 100)}%` }}
              />
            </div>
          </div>

          {estaRetrasado && (
            <div className="mt-4 rounded-xl bg-[#FF3B30]/5 p-3 text-[13px] text-[#FF3B30]">
              Este proyecto está retrasado. La fecha de entrega contractual ya pasó.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
