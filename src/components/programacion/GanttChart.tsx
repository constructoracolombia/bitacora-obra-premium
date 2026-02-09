"use client";

import { useMemo } from "react";
import { format, differenceInDays, addDays, startOfWeek, startOfMonth, isPast, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Diamond } from "lucide-react";

export type GanttView = "mensual" | "semanal";

interface GanttActivity {
  id: string;
  actividad: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  hito_critico: boolean;
  porcentaje_avance: number;
}

interface GanttChartProps {
  activities: GanttActivity[];
  view: GanttView;
  proyectoFechaInicio?: string | null;
}

const DAY_WIDTH = 24;
const ROW_HEIGHT = 40;

function getBarColor(activity: GanttActivity, today: Date): string {
  const fin = new Date(activity.fecha_fin);
  const start = new Date(activity.fecha_inicio);
  const totalDays = differenceInDays(fin, start);
  const daysLeft = differenceInDays(fin, today);

  if (isPast(fin) && activity.estado !== "COMPLETED") {
    return "bg-[#FF3B30]"; // Retrasado
  }
  if (daysLeft <= 7 && daysLeft >= 0) {
    return "bg-[#FF9500]"; // Próximo a vencerse
  }
  return "bg-[#007AFF]"; // En tiempo
}

export function GanttChart({
  activities,
  view,
  proyectoFechaInicio,
}: GanttChartProps) {
  const today = new Date();

  const { dateHeaders, totalDays, startDate } = useMemo(() => {
    const projStart = proyectoFechaInicio
      ? new Date(proyectoFechaInicio)
      : activities.length > 0
        ? new Date(
            Math.min(
              ...activities.map((a) => new Date(a.fecha_inicio).getTime())
            )
          )
        : subDays(today, 30);

    const projEnd =
      activities.length > 0
        ? new Date(
            Math.max(...activities.map((a) => new Date(a.fecha_fin).getTime()))
          )
        : addDays(today, 90);

    const rangeStart =
      view === "mensual"
        ? startOfMonth(projStart)
        : startOfWeek(projStart, { weekStartsOn: 1 });
    const rangeEnd = addDays(projEnd, 30);
    const totalDays = differenceInDays(rangeEnd, rangeStart);

    const headers: { date: Date; label: string; isWeekend?: boolean }[] = [];
    let d = rangeStart;
    while (d <= rangeEnd) {
      const dayOfWeek = d.getDay();
      headers.push({
        date: d,
        label: format(d, view === "mensual" ? "d" : "EEE d", { locale: es }),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
      d = addDays(d, 1);
    }

    return {
      dateHeaders: headers,
      totalDays,
      startDate: rangeStart,
    };
  }, [activities, view, proyectoFechaInicio, today]);

  const chartWidth = Math.max(
    dateHeaders.length * DAY_WIDTH,
    800
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <div
        className="min-w-max"
        style={{ width: chartWidth + 200 }}
      >
        {/* Header: fechas */}
        <div className="flex border-b border-gray-200">
          <div className="flex w-[200px] shrink-0 items-center border-r border-gray-200 px-3 py-2 font-semibold text-[#1D1D1F]">
            Actividad
          </div>
          <div
            className="flex"
            style={{ width: chartWidth }}
          >
            {dateHeaders.map((h, i) => (
              <div
                key={i}
                className={cn(
                  "shrink-0 border-r border-white/5 py-1 text-center text-xs",
                  h.isWeekend && "bg-white/5",
                  format(h.date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") &&
                    "bg-[#007AFF]/10"
                )}
                style={{ width: DAY_WIDTH }}
              >
                {h.label}
              </div>
            ))}
          </div>
        </div>

        {/* Filas de actividades */}
        {activities.map((activity) => {
          const start = new Date(activity.fecha_inicio);
          const end = new Date(activity.fecha_fin);
          const leftDays = differenceInDays(start, startDate);
          const durationDays = differenceInDays(end, start) + 1;
          const leftPx = Math.max(0, leftDays * DAY_WIDTH);
          const widthPx = durationDays * DAY_WIDTH;
          const progress = Number(activity.porcentaje_avance) || 0;
          const barColor = getBarColor(activity, today);

          return (
            <div
              key={activity.id}
              className="group flex border-b border-white/5 hover:bg-white/5"
            >
              <div className="flex w-[200px] shrink-0 items-center gap-2 border-r border-gray-200 px-3 py-2">
                <span className="truncate text-sm font-medium">
                  {activity.actividad}
                </span>
                {activity.hito_critico && (
                  <span title="Hito crítico">
                    <Diamond className="size-4 shrink-0 text-[#007AFF]" />
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {progress}%
                </span>
              </div>
              <div
                className="relative flex items-center py-1"
                style={{ width: chartWidth }}
              >
                {/* Barra de fondo */}
                <div
                  className={cn(
                    "absolute h-6 rounded-md opacity-80 transition-opacity group-hover:opacity-100",
                    barColor
                  )}
                  style={{
                    left: leftPx,
                    width: widthPx,
                  }}
                  title={`${format(start, "d MMM yyyy", { locale: es })} - ${format(end, "d MMM yyyy", { locale: es })} · ${progress}%`}
                />
                {/* Progreso (overlay más oscuro) */}
                {progress > 0 && (
                  <div
                    className="absolute h-6 rounded-l-md bg-[#007AFF]/30"
                    style={{
                      left: leftPx,
                      width: (widthPx * progress) / 100,
                    }}
                  />
                )}
                {/* Marcador hito crítico en fecha fin */}
                {activity.hito_critico && (
                  <div
                    className="absolute -translate-x-1/2"
                    style={{ left: leftPx + widthPx - DAY_WIDTH / 2 }}
                    title={`Hito crítico: ${format(end, "d MMM yyyy", { locale: es })}`}
                  >
                    <Diamond className="size-5 text-[#007AFF] drop-shadow-lg" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

