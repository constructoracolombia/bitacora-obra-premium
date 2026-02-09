"use client";

import { cn } from "@/lib/utils";
import { MapPin, User, Calendar, DollarSign } from "lucide-react";
import { differenceInDays, format, isPast } from "date-fns";

export type ProjectStatus = "ACTIVO" | "PAUSADO" | "FINALIZADO";

export interface ProjectCardData {
  id: string;
  cliente_nombre: string | null;
  direccion?: string | null;
  presupuesto_total?: number | null;
  porcentaje_avance: number;
  estado: ProjectStatus;
  residente_asignado?: string | null;
  fecha_entrega_estimada: string | null;
}

interface ProjectCardProps {
  project: ProjectCardData;
  className?: string;
}

function CircularProgress({ value }: { value: number }) {
  const size = 64;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          className="text-gray-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-blue-600 transition-all duration-500"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-sm font-bold text-[#2D3748]">{Math.round(value)}%</span>
    </div>
  );
}

const statusLabels: Record<ProjectStatus, string> = {
  ACTIVO: "Activo",
  PAUSADO: "Pausado",
  FINALIZADO: "Finalizado",
};

const statusColors: Record<ProjectStatus, string> = {
  ACTIVO: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PAUSADO: "bg-amber-100 text-amber-700 border-amber-200",
  FINALIZADO: "bg-gray-100 text-gray-600 border-gray-200",
};

function formatDateDMY(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
}

export function ProjectCard({ project, className }: ProjectCardProps) {
  const direccion = project.direccion || "Dirección por definir";
  const residente = project.residente_asignado || "Sin asignar";
  const fechaEntrega = project.fecha_entrega_estimada
    ? new Date(project.fecha_entrega_estimada)
    : null;
  const diasParaEntrega = fechaEntrega
    ? differenceInDays(fechaEntrega, new Date())
    : null;
  const estaRetrasado = fechaEntrega ? isPast(fechaEntrega) && project.porcentaje_avance < 100 : false;

  return (
    <article
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md",
        "cursor-pointer",
        className
      )}
    >
      <div className="flex gap-4">
        <div className="shrink-0">
          <CircularProgress value={project.porcentaje_avance} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-[#2D3748]">
            {project.cliente_nombre || "Proyecto sin nombre"}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{direccion}</span>
          </div>
          {project.presupuesto_total != null && project.presupuesto_total > 0 && (
            <div className="mt-1 flex items-center gap-1.5 text-sm text-blue-600">
              <DollarSign className="size-3.5 shrink-0" />
              <span>
                {project.presupuesto_total.toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-medium",
                statusColors[project.estado]
              )}
            >
              {statusLabels[project.estado]}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <User className="size-3.5" />
              <span>{residente}</span>
            </div>
          </div>
          {fechaEntrega && (
            <div className="mt-2 flex items-center gap-1.5">
              <Calendar className="size-3.5 shrink-0" />
              <span
                className={cn(
                  "text-xs font-medium",
                  estaRetrasado ? "text-red-600" : "text-gray-500"
                )}
              >
                {estaRetrasado
                  ? `Retrasado ${Math.abs(diasParaEntrega ?? 0)} días`
                  : `${diasParaEntrega ?? 0} días para entrega`}
                {" · "}
                {formatDateDMY(project.fecha_entrega_estimada!)}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
