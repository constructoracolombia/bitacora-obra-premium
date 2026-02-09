"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Building2, Info } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { ProjectCard, type ProjectCardData, type ProjectStatus } from "@/components/dashboard/ProjectCard";
import { cn } from "@/lib/utils";

type FilterStatus = "ACTIVO" | "PAUSADO" | "FINALIZADO" | "TODOS";

interface ProyectoMaestroRow {
  id: string;
  cliente_nombre: string | null;
  direccion?: string | null;
  presupuesto_total?: number | null;
  residente_asignado?: string | null;
  fecha_inicio: string | null;
  fecha_entrega_estimada: string | null;
  porcentaje_avance: number;
  estado: string | null;
  created_at: string;
}

/** Mapea el valor de estado de la BD a los estados normalizados de la UI */
function mapEstado(estado: string | null): ProjectStatus {
  if (!estado) return "ACTIVO";
  const u = estado.toUpperCase();
  if (u === "ACTIVO") return "ACTIVO";
  if (u === "PAUSADO" || u === "EN_PAUSA") return "PAUSADO";
  if (u === "FINALIZADO" || u === "TERMINADO") return "FINALIZADO";
  return "ACTIVO";
}

function toProjectCard(row: ProyectoMaestroRow): ProjectCardData {
  return {
    id: row.id,
    cliente_nombre: row.cliente_nombre,
    direccion: row.direccion ?? null,
    presupuesto_total: row.presupuesto_total ?? null,
    porcentaje_avance: Number(row.porcentaje_avance) || 0,
    estado: mapEstado(row.estado),
    residente_asignado: row.residente_asignado ?? null,
    fecha_entrega_estimada: row.fecha_entrega_estimada,
  };
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("ACTIVO");

  async function fetchProjects() {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("proyectos_maestro")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching projects:", error);
        setProjects([]);
        return;
      }

      const rows = (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        cliente_nombre: (r.cliente_nombre as string | null) ?? null,
        direccion: (r.direccion as string | null) ?? null,
        presupuesto_total: (r.presupuesto_total as number | null) ?? null,
        residente_asignado: (r.residente_asignado as string | null) ?? null,
        fecha_inicio: (r.fecha_inicio as string | null) ?? null,
        fecha_entrega_estimada: (r.fecha_entrega_estimada as string | null) ?? null,
        porcentaje_avance: Number(r.porcentaje_avance) ?? 0,
        estado: (r.estado as string | null) ?? null,
        created_at: (r.created_at as string) ?? "",
      })) as ProyectoMaestroRow[];
      setProjects(rows.map(toProjectCard));
    } catch (err) {
      console.error("Error:", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects =
    filter === "TODOS"
      ? projects
      : projects.filter((p) => p.estado === filter);

  const filters: { value: FilterStatus; label: string }[] = [
    { value: "TODOS", label: "Todos" },
    { value: "ACTIVO", label: "Activos" },
    { value: "PAUSADO", label: "Pausados" },
    { value: "FINALIZADO", label: "Finalizados" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9FA]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-[#2D3748]">Centro de Operaciones</h1>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-gray-200 bg-white p-1">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-smooth",
                    filter === f.value
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Info banner */}
      <div className="border-b border-blue-100 bg-blue-50 px-6 py-2.5">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <Info className="size-4 shrink-0" />
          <span>Los proyectos se gestionan desde la <strong>App de Finanzas</strong>. Aquí se sincronizan automáticamente.</span>
        </div>
      </div>

      {/* Grid de Proyectos */}
      <main className="flex-1 p-6">
        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <Loader2 className="size-10 animate-spin text-blue-600" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <Building2 className="size-12 text-gray-400" />
            <p className="text-gray-600">
              {projects.length === 0
                ? "No hay proyectos disponibles."
                : "No hay proyectos con el filtro seleccionado."}
            </p>
            <p className="text-sm text-gray-500">
              Los proyectos se crean y editan desde la App de Finanzas
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredProjects.map((project) => (
              <Link key={project.id} href={`/proyecto/${project.id}`}>
                <ProjectCard project={project} />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
