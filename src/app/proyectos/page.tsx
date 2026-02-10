"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Building2, MapPin, DollarSign, User, Plus, Calendar } from "lucide-react";
import { getSupabase, getProyectosTable } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type FilterStatus = "TODOS" | "ACTIVO" | "PAUSADO" | "FINALIZADO";

interface Proyecto {
  id: string;
  cliente_nombre: string | null;
  direccion: string | null;
  presupuesto_total: number | null;
  porcentaje_avance: number;
  estado: string | null;
  residente_asignado: string | null;
  fecha_inicio: string | null;
  fecha_entrega_estimada: string | null;
  app_origen: string | null;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVO: { bg: "bg-[#34C759]/10", text: "text-[#34C759]", label: "Activo" },
  PAUSADO: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "Pausado" },
  EN_PAUSA: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "Pausado" },
  FINALIZADO: { bg: "bg-[#86868B]/10", text: "text-[#86868B]", label: "Finalizado" },
  TERMINADO: { bg: "bg-[#86868B]/10", text: "text-[#86868B]", label: "Finalizado" },
};

function normalizeEstado(estado: string | null): string {
  if (!estado) return "ACTIVO";
  const u = estado.toUpperCase();
  if (u === "EN_PAUSA") return "PAUSADO";
  if (u === "TERMINADO") return "FINALIZADO";
  return u;
}

export default function ProyectosPage() {
  const [projects, setProjects] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("ACTIVO");

  useEffect(() => {
    async function fetchProjects() {
      try {
        const supabase = getSupabase();
        const table = await getProyectosTable();

        const { data, error } = await supabase
          .from(table)
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        console.log(`[${table}] Proyectos cargados:`, data?.length);

        setProjects(
          (data ?? []).map((r: Record<string, unknown>) => ({
            id: r.id as string,
            cliente_nombre: (r.cliente_nombre as string) ?? null,
            direccion: (r.direccion as string) ?? null,
            presupuesto_total: (r.presupuesto_total as number) ?? null,
            porcentaje_avance: Number(r.porcentaje_avance) || 0,
            estado: (r.estado as string) ?? null,
            residente_asignado: (r.residente_asignado as string) ?? null,
            fecha_inicio: (r.fecha_inicio as string) ?? null,
            fecha_entrega_estimada: (r.fecha_entrega_estimada as string) ?? null,
            app_origen: (r.app_origen as string) ?? null,
          }))
        );
      } catch (err) {
        console.error("Error fetching projects:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const filtered =
    filter === "TODOS"
      ? projects
      : projects.filter((p) => normalizeEstado(p.estado) === filter);

  const filters: { value: FilterStatus; label: string }[] = [
    { value: "TODOS", label: "Todos" },
    { value: "ACTIVO", label: "Activos" },
    { value: "PAUSADO", label: "Pausados" },
    { value: "FINALIZADO", label: "Finalizados" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">
            Proyectos
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl bg-[#F5F5F7] p-1">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all duration-200",
                  filter === f.value
                    ? "bg-white text-[#1D1D1F] shadow-sm"
                    : "text-[#86868B] hover:text-[#1D1D1F]"
                )}
              >
                {f.label}
              </button>
            ))}
            </div>
            <Button asChild className="rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]">
              <Link href="/proyectos/nuevo">
                <Plus className="size-4" />
                Nuevo Proyecto
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-8 py-8">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-[#007AFF]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
            <Building2 className="size-12 text-[#D2D2D7]" />
            <p className="text-[15px] text-[#1D1D1F]">
              {projects.length === 0
                ? "No hay proyectos disponibles"
                : "Sin resultados para este filtro"}
            </p>
            <p className="text-sm text-[#86868B]">
              Crea tu primer proyecto para comenzar
            </p>
            <Button asChild className="mt-2 rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]">
              <Link href="/proyectos/nuevo">
                <Plus className="size-4" />
                Nuevo Proyecto
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {filtered.map((project) => {
              const status = STATUS_STYLES[normalizeEstado(project.estado)] ?? STATUS_STYLES.ACTIVO;
              return (
                <Link key={project.id} href={`/proyectos/${project.id}`}>
                  <article className="group rounded-2xl border border-[#D2D2D7]/60 bg-white p-6 transition-all duration-200 hover:border-[#D2D2D7] hover:shadow-md">
                    {/* Top: name + badges */}
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-[15px] font-semibold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">
                        {project.cliente_nombre || "Sin nombre"}
                      </h2>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {project.app_origen === "FINANZAS" && (
                          <span className="rounded-full bg-[#007AFF]/8 px-2 py-0.5 text-[10px] font-medium text-[#007AFF]">
                            Finanzas
                          </span>
                        )}
                        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", status.bg, status.text)}>
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* Address */}
                    {project.direccion && (
                      <div className="mt-2 flex items-center gap-1.5 text-[13px] text-[#86868B]">
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="truncate">{project.direccion}</span>
                      </div>
                    )}

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-[12px]">
                        <span className="text-[#86868B]">Avance</span>
                        <span className="font-medium text-[#1D1D1F]">{project.porcentaje_avance}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#F5F5F7]">
                        <div
                          className="h-full rounded-full bg-[#007AFF] transition-all duration-500"
                          style={{ width: `${Math.min(project.porcentaje_avance, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[#F5F5F7] pt-4">
                      {project.presupuesto_total != null && (
                        <div className="flex items-center gap-1.5 text-[12px] text-[#86868B]">
                          <DollarSign className="size-3.5" />
                          <span>${project.presupuesto_total.toLocaleString("es-CO")}</span>
                        </div>
                      )}
                      {project.fecha_inicio && (
                        <div className="flex items-center gap-1.5 text-[12px] text-[#86868B]">
                          <Calendar className="size-3.5" />
                          <span>{format(new Date(project.fecha_inicio + "T12:00:00"), "d MMM yyyy", { locale: es })}</span>
                        </div>
                      )}
                      {project.residente_asignado && (
                        <div className="flex items-center gap-1.5 text-[12px] text-[#86868B]">
                          <User className="size-3.5" />
                          <span>{project.residente_asignado}</span>
                        </div>
                      )}
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
