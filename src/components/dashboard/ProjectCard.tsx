"use client";

import { cn } from "@/lib/utils";
import { MapPin, User, Calendar } from "lucide-react";
import { differenceInDays, format, isPast } from "date-fns";
import { es } from "date-fns/locale";

export type ProjectStatus = "ACTIVO" | "EN_PAUSA" | "TERMINADO";

export interface ProjectCardData {
  id: string;
  cliente_nombre: string | null;
  direccion?: string | null;
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
          className="text-muted/30"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-[var(--gold)] transition-all duration-500"
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
      <span className="absolute text-sm font-bold text-foreground">{Math.round(value)}%</span>
    </div>
  );
}

const statusLabels: Record<ProjectStatus, string> = {
  ACTIVO: "Activo",
  EN_PAUSA: "En Pausa",
  TERMINADO: "Terminado",
};

const statusColors: Record<ProjectStatus, string> = {
  ACTIVO: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  EN_PAUSA: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  TERMINADO: "bg-muted text-muted-foreground border-muted",
};

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
        "glass-card rounded-xl p-5 transition-all duration-200",
        "hover:translate-y-[-4px] hover:shadow-[0_12px_40px_rgba(255,184,0,0.15)]",
        "cursor-pointer border border-white/10",
        className
      )}
    >
      <div className="flex gap-4">
        <div className="shrink-0">
          <CircularProgress value={project.porcentaje_avance} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">
            {project.cliente_nombre || "Proyecto sin nombre"}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{direccion}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-medium",
                statusColors[project.estado]
              )}
            >
              {statusLabels[project.estado]}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
                  estaRetrasado ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {estaRetrasado
                  ? `Retrasado ${Math.abs(diasParaEntrega ?? 0)} días`
                  : `${diasParaEntrega ?? 0} días para entrega`}
                {" · "}
                {format(fechaEntrega, "d MMM yyyy", { locale: es })}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
