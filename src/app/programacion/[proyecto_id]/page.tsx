"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Bell,
  RefreshCw,
  Image,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GanttChart, type GanttView } from "@/components/programacion/GanttChart";
import { ActivitySidePanel } from "@/components/programacion/ActivitySidePanel";
import { exportGanttAsImage } from "@/lib/exports";
import { notifyProyectoRetrasado } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { differenceInDays, isPast, addDays } from "date-fns";

interface ProyectoOption {
  id: string;
  cliente_nombre: string | null;
  fecha_inicio: string | null;
}

interface GanttActivity {
  id: string;
  proyecto_id: string;
  actividad: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  hito_critico: boolean;
  porcentaje_avance: number;
}

export default function ProgramacionPage() {
  const params = useParams();
  const router = useRouter();
  const proyectoId = params.proyecto_id as string;

  const [projects, setProjects] = useState<ProyectoOption[]>([]);
  const [project, setProject] = useState<ProyectoOption | null>(null);
  const [activities, setActivities] = useState<GanttActivity[]>([]);
  const [bitacoraDates, setBitacoraDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<GanttView>("mensual");
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<GanttActivity[]>([]);
  const ganttRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = getSupabase();

        const [projectsRes, activitiesRes, bitacoraRes] = await Promise.all([
          supabase
            .from("hoja_vida_proyecto")
            .select("id, cliente_nombre, fecha_inicio")
            .order("cliente_nombre"),
          supabase
            .from("programacion_gantt")
            .select("*")
            .eq("proyecto_id", proyectoId)
            .order("fecha_inicio"),
          supabase
            .from("bitacora_diaria")
            .select("fecha")
            .eq("proyecto_id", proyectoId),
        ]);

        if (projectsRes.data) {
          setProjects(projectsRes.data as ProyectoOption[]);
          const current = (projectsRes.data as ProyectoOption[]).find(
            (p) => p.id === proyectoId
          );
          setProject(current ?? null);
        }

        if (activitiesRes.data) {
          const rows = activitiesRes.data as Record<string, unknown>[];
          setActivities(
            rows.map((r) => ({
              id: r.id as string,
              proyecto_id: r.proyecto_id as string,
              actividad: r.actividad as string,
              fecha_inicio: r.fecha_inicio as string,
              fecha_fin: r.fecha_fin as string,
              estado: r.estado as string,
              hito_critico: Boolean(r.hito_critico),
              porcentaje_avance: Number(r.porcentaje_avance) ?? 0,
            }))
          );
        }

        if (bitacoraRes.data) {
          const dates = new Set(
            (bitacoraRes.data as { fecha: string }[]).map((b) => b.fecha)
          );
          setBitacoraDates(dates);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (proyectoId) fetchData();
  }, [proyectoId]);

  const prevAlertsRef = useRef<number>(0);
  useEffect(() => {
    const delayed = activities.filter(
      (a) =>
        isPast(new Date(a.fecha_fin)) &&
        a.estado !== "COMPLETED" &&
        a.porcentaje_avance < 100
    );
    if (delayed.length > 0 && prevAlertsRef.current === 0 && project) {
      notifyProyectoRetrasado(project.cliente_nombre ?? "Proyecto");
    }
    prevAlertsRef.current = delayed.length;
    setAlerts(delayed);
  }, [activities, project]);

  async function handleUpdateProgress(id: string, porcentaje: number) {
    const supabase = getSupabase();
    const newEstado =
      porcentaje >= 100 ? "COMPLETED" : porcentaje > 0 ? "IN_PROGRESS" : "PENDING";

    const { data } = await supabase
      .from("programacion_gantt")
      .update({
        porcentaje_avance: porcentaje,
        estado: newEstado,
      })
      .eq("id", id)
      .select()
      .single();

    if (data) {
      setActivities((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                porcentaje_avance: porcentaje,
                estado: newEstado,
              }
            : a
        )
      );
    }
  }

  async function syncProgressFromBitacora() {
    const supabase = getSupabase();
    const updated: GanttActivity[] = [];

    for (const act of activities) {
      const start = new Date(act.fecha_inicio);
      const end = new Date(act.fecha_fin);
      const totalDays = differenceInDays(end, start) + 1;

      let daysWithBitacora = 0;
      let d = new Date(start);
      const endDate = new Date(end);
      while (d <= endDate) {
        const dateStr = d.toISOString().split("T")[0];
        if (bitacoraDates.has(dateStr)) daysWithBitacora++;
        d = addDays(d, 1);
      }

      const estimatedProgress = Math.min(
        100,
        Math.round((daysWithBitacora / totalDays) * 100)
      );

      if (estimatedProgress !== act.porcentaje_avance) {
        const newEstado =
          estimatedProgress >= 100
            ? "COMPLETED"
            : estimatedProgress > 0
              ? "IN_PROGRESS"
              : "PENDING";

        await supabase
          .from("programacion_gantt")
          .update({
            porcentaje_avance: estimatedProgress,
            estado: newEstado,
          })
          .eq("id", act.id);

        updated.push({
          ...act,
          porcentaje_avance: estimatedProgress,
          estado: newEstado,
        });
      }
    }

    if (updated.length > 0) {
      setActivities((prev) =>
        prev.map((a) => {
          const u = updated.find((x) => x.id === a.id);
          return u ?? a;
        })
      );
    }
  }

  function handleProjectChange(newId: string) {
    router.push(`/programacion/${newId}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-12 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Proyecto no encontrado</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Volver al dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[var(--gold)]/20 bg-background/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/proyecto/${proyectoId}`}>
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <h1 className="text-lg font-bold text-foreground">
              Gantt Maestro
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={proyectoId}
              onValueChange={handleProjectChange}
            >
              <SelectTrigger className="w-[200px] border-[var(--gold)]/30">
                <SelectValue placeholder="Proyecto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.cliente_nombre || "Sin nombre"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex rounded-lg border border-[var(--gold)]/30 p-1">
              <button
                onClick={() => setView("mensual")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  view === "mensual"
                    ? "bg-[var(--gold)]/20 text-[var(--gold)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Mensual
              </button>
              <button
                onClick={() => setView("semanal")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  view === "semanal"
                    ? "bg-[var(--gold)]/20 text-[var(--gold)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Semanal
              </button>
            </div>
          </div>
        </div>

        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2">
            <Bell className="size-5 shrink-0 text-destructive" />
            <span className="text-sm text-destructive">
              {alerts.length} actividad(es) retrasada(s):{" "}
              {alerts.map((a) => a.actividad).join(", ")}
            </span>
          </div>
        )}
      </header>

      {/* Contenido principal */}
      <main className="flex gap-4 p-4">
        {/* Panel lateral */}
        <ActivitySidePanel
          activities={activities}
          selectedId={selectedActivityId}
          onSelect={setSelectedActivityId}
          onUpdateProgress={handleUpdateProgress}
        />

        {/* Gráfico Gantt */}
        <div className="min-w-0 flex-1" ref={ganttRef}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-[var(--gold)]">
              Cronograma
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-[var(--gold)]/40"
                onClick={() => exportGanttAsImage(ganttRef.current)}
              >
                <Image className="size-4" />
                Exportar imagen
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[var(--gold)]/40"
                onClick={syncProgressFromBitacora}
              >
                <RefreshCw className="size-4" />
                Sincronizar con bitácora
              </Button>
            </div>
          </div>

          {activities.length === 0 ? (
            <div className="glass-card flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-xl border border-[var(--gold)]/30 p-12">
              <Calendar className="size-16 text-[var(--gold)]/40" />
              <p className="text-center text-muted-foreground">
                No hay actividades en el cronograma.
              </p>
              <Button variant="outline" className="border-[var(--gold)]/40" asChild>
                <Link href={`/proyecto/${proyectoId}`}>
                  Ir al proyecto para añadir actividades
                </Link>
              </Button>
            </div>
          ) : (
            <GanttChart
              activities={activities}
              view={view}
              proyectoFechaInicio={project.fecha_inicio}
            />
          )}
        </div>
      </main>
    </div>
  );
}
