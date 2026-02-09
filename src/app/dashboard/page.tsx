"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Building2 } from "lucide-react";
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">Proyectos</h1>
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
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-8 py-8">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-[#007AFF]" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
            <Building2 className="size-12 text-[#D2D2D7]" />
            <p className="text-[15px] text-[#1D1D1F]">
              {projects.length === 0
                ? "No hay proyectos disponibles"
                : "Sin resultados para este filtro"}
            </p>
            <p className="text-sm text-[#86868B]">
              Los proyectos se gestionan desde la App de Finanzas
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
