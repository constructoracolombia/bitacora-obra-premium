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
  const size = 56;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          className="text-[#F5F5F7]"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-[#007AFF] transition-all duration-500"
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
      <span className="absolute text-xs font-semibold text-[#1D1D1F]">{Math.round(value)}%</span>
    </div>
  );
}

const statusLabels: Record<ProjectStatus, string> = {
  ACTIVO: "Activo",
  PAUSADO: "Pausado",
  FINALIZADO: "Finalizado",
};

const statusColors: Record<ProjectStatus, string> = {
  ACTIVO: "bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20",
  PAUSADO: "bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20",
  FINALIZADO: "bg-[#F5F5F7] text-[#86868B] border-[#D2D2D7]",
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
        "group rounded-2xl border border-[#D2D2D7]/60 bg-white p-5 transition-all duration-200 hover:shadow-md",
        "cursor-pointer",
        className
      )}
    >
      <div className="flex gap-4">
        <div className="shrink-0">
          <CircularProgress value={project.porcentaje_avance} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold tracking-tight text-[#1D1D1F]">
            {project.cliente_nombre || "Proyecto sin nombre"}
          </h3>
          <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#86868B]">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{direccion}</span>
          </div>
          {project.presupuesto_total != null && project.presupuesto_total > 0 && (
            <div className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-[#007AFF]">
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                statusColors[project.estado]
              )}
            >
              {statusLabels[project.estado]}
            </span>
            <div className="flex items-center gap-1.5 text-[12px] text-[#86868B]">
              <User className="size-3.5" />
              <span>{residente}</span>
            </div>
          </div>
          {fechaEntrega && (
            <div className="mt-2.5 flex items-center gap-1.5">
              <Calendar className="size-3.5 shrink-0 text-[#86868B]" />
              <span
                className={cn(
                  "text-[12px] font-medium",
                  estaRetrasado ? "text-[#FF3B30]" : "text-[#86868B]"
                )}
              >
                {estaRetrasado
                  ? `Retrasado ${Math.abs(diasParaEntrega ?? 0)} días`
                  : `${diasParaEntrega ?? 0} días restantes`}
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
