// @ts-nocheck
"use client";

import { Calendar, Clock, AlertTriangle, Edit2 } from "lucide-react";

export interface Actividad {
  id: string;
  titulo: string;
  descripcion: string | null;
  porcentaje: number;
  estado: string;
  orden: number;
  duracion_dias: number;
  fecha_inicio_estimada: string | null;
  fecha_fin_estimada: string | null;
  es_critica: boolean;
  holgura_dias: number;
  predecesoras: string[];
}

interface ActividadCardProps {
  actividad: Actividad;
  onMoverEstado: (id: string, nuevoEstado: string) => void;
  onEditar: (actividad: Actividad) => void;
  onEliminar: (id: string) => void;
}

export function ActividadCard({ actividad, onMoverEstado, onEditar, onEliminar }: ActividadCardProps) {
  const formatFecha = (fecha: string | null) => {
    if (!fecha) return "—";
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit" });
  };

  const calcularRetraso = () => {
    if (actividad.estado === "TERMINADO" || !actividad.fecha_fin_estimada) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fin = new Date(actividad.fecha_fin_estimada + "T12:00:00");
    if (hoy > fin) {
      return Math.floor((hoy.getTime() - fin.getTime()) / (1000 * 60 * 60 * 24));
    }
    return null;
  };

  const diasRetraso = calcularRetraso();

  return (
    <div className="group rounded-xl border border-[#D2D2D7]/60 bg-white p-4 transition-all hover:shadow-md">
      <div className="mb-2 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-semibold text-[#1D1D1F]">{actividad.titulo}</h4>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => onEditar(actividad)} className="rounded-md p-1 text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]">
            <Edit2 className="size-3.5" />
          </button>
          <button onClick={() => onEliminar(actividad.id)} className="rounded-md p-1 text-[#86868B] hover:bg-[#FF3B30]/10 hover:text-[#FF3B30]">
            <AlertTriangle className="size-3.5" />
          </button>
        </div>
      </div>

      {actividad.descripcion && (
        <p className="mb-2 text-[12px] text-[#86868B] line-clamp-2">{actividad.descripcion}</p>
      )}

      {(actividad.fecha_inicio_estimada || actividad.duracion_dias > 0) && (
        <div className="mb-2 flex items-center gap-2 text-[11px] text-[#86868B]">
          <Calendar className="size-3" />
          <span>{formatFecha(actividad.fecha_inicio_estimada)} — {formatFecha(actividad.fecha_fin_estimada)}</span>
          {actividad.duracion_dias > 0 && (
            <>
              <Clock className="ml-1 size-3" />
              <span>{actividad.duracion_dias}d</span>
            </>
          )}
        </div>
      )}

      {actividad.holgura_dias > 0 && !actividad.es_critica && (
        <p className="mb-2 text-[10px] text-[#86868B]">Holgura: {actividad.holgura_dias} días</p>
      )}

      {diasRetraso != null && diasRetraso > 0 && (
        <div className="mb-2 rounded-lg bg-[#FF9500]/10 p-2 text-[11px] text-[#FF9500]">
          <AlertTriangle className="mr-1 inline size-3" />
          Retrasada {diasRetraso} días
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        {actividad.estado === "PENDIENTE" && (
          <button onClick={() => onMoverEstado(actividad.id, "EN_PROCESO")} className="rounded-md bg-[#007AFF]/10 px-2 py-0.5 text-[10px] font-medium text-[#007AFF] hover:opacity-80">
            → En Proceso
          </button>
        )}
        {actividad.estado === "EN_PROCESO" && (
          <>
            <button onClick={() => onMoverEstado(actividad.id, "PENDIENTE")} className="rounded-md bg-[#86868B]/10 px-2 py-0.5 text-[10px] font-medium text-[#86868B] hover:opacity-80">
              ← Pendiente
            </button>
            <button onClick={() => onMoverEstado(actividad.id, "TERMINADO")} className="rounded-md bg-[#34C759]/10 px-2 py-0.5 text-[10px] font-medium text-[#34C759] hover:opacity-80">
              → Terminado
            </button>
          </>
        )}
        {actividad.estado === "TERMINADO" && (
          <button onClick={() => onMoverEstado(actividad.id, "EN_PROCESO")} className="rounded-md bg-[#007AFF]/10 px-2 py-0.5 text-[10px] font-medium text-[#007AFF] hover:opacity-80">
            ← En Proceso
          </button>
        )}
      </div>
    </div>
  );
}
