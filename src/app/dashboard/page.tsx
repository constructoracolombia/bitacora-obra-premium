"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ProjectCard, type ProjectCardData, type ProjectStatus } from "@/components/dashboard/ProjectCard";
import { NuevoProyectoModal } from "@/components/dashboard/NuevoProyectoModal";
import { cn } from "@/lib/utils";

type FilterStatus = "ACTIVO" | "EN_PAUSA" | "TERMINADO" | "TODOS";

interface HojaVidaRow {
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
  if (u === "ACTIVO" || u === "EN_PAUSA" || u === "TERMINADO") return u as ProjectStatus;
  return "ACTIVO";
}

function toProjectCard(row: HojaVidaRow): ProjectCardData {
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
  const [modalOpen, setModalOpen] = useState(false);

  async function fetchProjects() {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("hoja_vida_proyecto")
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
      })) as HojaVidaRow[];
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
    { value: "EN_PAUSA", label: "Pausados" },
    { value: "TERMINADO", label: "Finalizados" },
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
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              size="sm"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="size-4" />
              Nuevo Proyecto
            </Button>
          </div>
        </div>
      </header>

      {/* Grid de Proyectos */}
      <main className="flex-1 p-6">
        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <Loader2 className="size-10 animate-spin text-blue-600" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-600">
              {projects.length === 0
                ? "No hay proyectos. Crea uno para comenzar."
                : "No hay proyectos con el filtro seleccionado."}
            </p>
            {projects.length === 0 && (
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setModalOpen(true)}
              >
                <Plus className="size-4" />
                Nuevo Proyecto
              </Button>
            )}
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

      <NuevoProyectoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={fetchProjects}
      />
    </div>
  );
}
