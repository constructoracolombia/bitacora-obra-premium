"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  DollarSign,
  User,
  Calendar,
  Save,
  CheckCircle2,
  Percent,
  Info,
  Lock,
} from "lucide-react";
import { getSupabase, getProyectosTable } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  conjunto: string | null;
  alcance_text: string | null;
  proyecto_nombre: string | null;
  margen_objetivo: number | null;
  app_origen: string | null;
}

interface Actividad {
  id: string;
  actividad: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  porcentaje_avance: number;
  hito_critico: boolean;
}

const TABS = [
  { id: "info", label: "Información" },
  { id: "alcance", label: "Alcance" },
  { id: "programacion", label: "Programación" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVO: { bg: "bg-[#34C759]/10", text: "text-[#34C759]", label: "Activo" },
  EN_PAUSA: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "Pausado" },
  PAUSADO: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "Pausado" },
  TERMINADO: { bg: "bg-[#86868B]/10", text: "text-[#86868B]", label: "Finalizado" },
  FINALIZADO: { bg: "bg-[#86868B]/10", text: "text-[#86868B]", label: "Finalizado" },
};

const ACTIVIDAD_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-[#86868B]/10", text: "text-[#86868B]", label: "Pendiente" },
  IN_PROGRESS: { bg: "bg-[#007AFF]/10", text: "text-[#007AFF]", label: "En progreso" },
  COMPLETED: { bg: "bg-[#34C759]/10", text: "text-[#34C759]", label: "Completado" },
  DELAYED: { bg: "bg-[#FF3B30]/10", text: "text-[#FF3B30]", label: "Retrasado" },
};

export default function ProyectoDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Proyecto | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("info");

  // Editable fields (info tab - only for BITACORA origin)
  const [editForm, setEditForm] = useState({
    cliente_nombre: "",
    direccion: "",
    presupuesto_total: "",
    fecha_inicio: "",
    fecha_entrega_estimada: "",
    margen_objetivo: "",
    residente_asignado: "",
  });

  // Alcance (always editable)
  const [alcance, setAlcance] = useState("");

  const [savingInfo, setSavingInfo] = useState(false);
  const [savedInfo, setSavedInfo] = useState(false);
  const [savingAlcance, setSavingAlcance] = useState(false);
  const [savedAlcance, setSavedAlcance] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const table = await getProyectosTable();
      const [projRes, actRes] = await Promise.all([
        supabase
          .from(table)
          .select("*")
          .eq("id", projectId)
          .single(),
        supabase
          .from("programacion_gantt")
          .select("*")
          .eq("proyecto_id", projectId)
          .order("fecha_inicio", { ascending: true }),
      ]);

      if (projRes.data) {
        const r = projRes.data as Record<string, unknown>;
        const p: Proyecto = {
          id: r.id as string,
          cliente_nombre: (r.cliente_nombre as string) ?? null,
          direccion: (r.direccion as string) ?? null,
          presupuesto_total: (r.presupuesto_total as number) ?? null,
          porcentaje_avance: Number(r.porcentaje_avance) || 0,
          estado: (r.estado as string) ?? null,
          residente_asignado: (r.residente_asignado as string) ?? null,
          fecha_inicio: (r.fecha_inicio as string) ?? null,
          fecha_entrega_estimada: (r.fecha_entrega_estimada as string) ?? null,
          conjunto: (r.conjunto as string) ?? null,
          alcance_text: (r.alcance_text as string) ?? null,
          proyecto_nombre: (r.proyecto_nombre as string) ?? null,
          margen_objetivo: (r.margen_objetivo as number) ?? null,
          app_origen: (r.app_origen as string) ?? null,
        };
        setProject(p);
        setAlcance(p.alcance_text ?? "");
        setEditForm({
          cliente_nombre: p.cliente_nombre ?? "",
          direccion: p.direccion ?? "",
          presupuesto_total: p.presupuesto_total != null ? String(p.presupuesto_total) : "",
          fecha_inicio: p.fecha_inicio ?? "",
          fecha_entrega_estimada: p.fecha_entrega_estimada ?? "",
          margen_objetivo: p.margen_objetivo != null ? String(p.margen_objetivo) : "20",
          residente_asignado: p.residente_asignado ?? "",
        });
      }

      if (actRes.data) {
        setActividades(
          (actRes.data as Record<string, unknown>[]).map((r) => ({
            id: r.id as string,
            actividad: r.actividad as string,
            fecha_inicio: r.fecha_inicio as string,
            fecha_fin: r.fecha_fin as string,
            estado: (r.estado as string) ?? "PENDING",
            porcentaje_avance: Number(r.porcentaje_avance) || 0,
            hito_critico: Boolean(r.hito_critico),
          }))
        );
      }
    } catch (err) {
      console.error("Error fetching project:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId, fetchData]);

  const isFromFinanzas = project?.app_origen === "FINANZAS";

  async function handleSaveInfo() {
    if (!project || isFromFinanzas) return;
    setSavingInfo(true);
    setSavedInfo(false);
    try {
      const supabase = getSupabase();
      const table = await getProyectosTable();
      await supabase
        .from(table)
        .update({
          cliente_nombre: editForm.cliente_nombre.trim() || null,
          direccion: editForm.direccion.trim() || null,
          presupuesto_total: Number(editForm.presupuesto_total) || null,
          fecha_inicio: editForm.fecha_inicio || null,
          fecha_entrega_estimada: editForm.fecha_entrega_estimada || null,
          margen_objetivo: Number(editForm.margen_objetivo) || 20,
          residente_asignado: editForm.residente_asignado.trim() || null,
        })
        .eq("id", project.id);
      setSavedInfo(true);
      setTimeout(() => setSavedInfo(false), 2000);
      fetchData();
    } catch (err) {
      console.error("Error saving info:", err);
    } finally {
      setSavingInfo(false);
    }
  }

  async function handleSaveAlcance() {
    if (!project) return;
    setSavingAlcance(true);
    setSavedAlcance(false);
    try {
      const supabase = getSupabase();
      const table = await getProyectosTable();
      await supabase
        .from(table)
        .update({ alcance_text: alcance })
        .eq("id", project.id);
      setSavedAlcance(true);
      setTimeout(() => setSavedAlcance(false), 2000);
    } catch (err) {
      console.error("Error saving alcance:", err);
    } finally {
      setSavingAlcance(false);
    }
  }

  function formatDate(date: string | null): string {
    if (!date) return "—";
    try {
      return format(new Date(date + "T12:00:00"), "d MMM yyyy", { locale: es });
    } catch {
      return date;
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8">
        <p className="text-[#86868B]">Proyecto no encontrado</p>
        <Button variant="outline" asChild>
          <Link href="/proyectos">Volver</Link>
        </Button>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[project.estado ?? "ACTIVO"] ?? STATUS_STYLES.ACTIVO;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-8 py-4">
          <Button variant="ghost" size="icon" className="size-8 text-[#86868B] hover:bg-[#F5F5F7]" asChild>
            <Link href="/proyectos">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight text-[#1D1D1F]">
              {project.cliente_nombre || "Proyecto"}
            </h1>
            {project.direccion && (
              <p className="truncate text-[13px] text-[#86868B]">{project.direccion}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              isFromFinanzas ? "bg-[#007AFF]/8 text-[#007AFF]" : "bg-[#FF9500]/10 text-[#FF9500]"
            )}>
              {isFromFinanzas ? "Finanzas" : "Bitácora"}
            </span>
            <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", statusStyle.bg, statusStyle.text)}>
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-4xl px-8">
          <div className="flex gap-0 border-b-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative px-4 pb-3 pt-1 text-[13px] font-medium transition-colors",
                  activeTab === tab.id
                    ? "text-[#007AFF]"
                    : "text-[#86868B] hover:text-[#1D1D1F]"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#007AFF]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-8 py-8">
        {/* ─── TAB: Info ─── */}
        {activeTab === "info" && (
          <div className="space-y-6">
            {/* Progress */}
            <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#86868B]">Avance general</span>
                <span className="text-2xl font-semibold text-[#1D1D1F]">{project.porcentaje_avance}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#F5F5F7]">
                <div
                  className="h-full rounded-full bg-[#007AFF] transition-all duration-500"
                  style={{ width: `${Math.min(project.porcentaje_avance, 100)}%` }}
                />
              </div>
            </div>

            {/* Read-only notice for Finanzas */}
            {isFromFinanzas && (
              <div className="flex items-start gap-3 rounded-2xl border border-[#007AFF]/20 bg-[#007AFF]/5 p-4">
                <Lock className="mt-0.5 size-4 shrink-0 text-[#007AFF]" />
                <div>
                  <p className="text-[13px] font-medium text-[#1D1D1F]">Proyecto gestionado desde Finanzas</p>
                  <p className="mt-0.5 text-[12px] text-[#86868B]">Los datos principales son de solo lectura. Usa la App de Finanzas para editarlos.</p>
                </div>
              </div>
            )}

            {/* Editable form (Bitácora) or Read-only cards (Finanzas) */}
            {isFromFinanzas ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard icon={User} label="Cliente" value={project.cliente_nombre || "—"} />
                <InfoCard icon={MapPin} label="Dirección" value={project.direccion || "—"} />
                <InfoCard icon={DollarSign} label="Presupuesto" value={project.presupuesto_total ? `$${project.presupuesto_total.toLocaleString("es-CO")}` : "—"} />
                <InfoCard icon={Percent} label="Margen objetivo" value={project.margen_objetivo != null ? `${project.margen_objetivo}%` : "—"} />
                <InfoCard icon={Calendar} label="Fecha inicio" value={formatDate(project.fecha_inicio)} />
                <InfoCard icon={Calendar} label="Fecha entrega" value={formatDate(project.fecha_entrega_estimada)} />
                <InfoCard icon={User} label="Residente" value={project.residente_asignado || "—"} />
                {project.conjunto && (
                  <InfoCard icon={MapPin} label="Conjunto" value={project.conjunto} />
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[13px] text-[#86868B]">Cliente</Label>
                    <Input
                      value={editForm.cliente_nombre}
                      onChange={(e) => setEditForm((f) => ({ ...f, cliente_nombre: e.target.value }))}
                      className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] text-[#86868B]">Dirección</Label>
                    <Input
                      value={editForm.direccion}
                      onChange={(e) => setEditForm((f) => ({ ...f, direccion: e.target.value }))}
                      className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] text-[#86868B]">Presupuesto (COP)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editForm.presupuesto_total}
                      onChange={(e) => setEditForm((f) => ({ ...f, presupuesto_total: e.target.value }))}
                      className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] text-[#86868B]">Margen objetivo (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.margen_objetivo}
                      onChange={(e) => setEditForm((f) => ({ ...f, margen_objetivo: e.target.value }))}
                      className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] text-[#86868B]">Fecha inicio</Label>
                    <Input
                      type="date"
                      value={editForm.fecha_inicio}
                      onChange={(e) => setEditForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
                      className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] text-[#86868B]">Fecha entrega</Label>
                    <Input
                      type="date"
                      value={editForm.fecha_entrega_estimada}
                      onChange={(e) => setEditForm((f) => ({ ...f, fecha_entrega_estimada: e.target.value }))}
                      className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-[13px] text-[#86868B]">Residente asignado</Label>
                    <Input
                      value={editForm.residente_asignado}
                      onChange={(e) => setEditForm((f) => ({ ...f, residente_asignado: e.target.value }))}
                      placeholder="Nombre del residente"
                      className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-[#F5F5F7] pt-5">
                  <Button
                    onClick={handleSaveInfo}
                    disabled={savingInfo}
                    className="rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
                  >
                    {savingInfo ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Guardar cambios
                  </Button>
                  {savedInfo && (
                    <span className="flex items-center gap-1.5 text-[13px] text-[#34C759]">
                      <CheckCircle2 className="size-4" />
                      Guardado
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: Alcance ─── */}
        {activeTab === "alcance" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
              <Label className="text-[13px] text-[#86868B]">Alcance del proyecto</Label>
              <textarea
                value={alcance}
                onChange={(e) => setAlcance(e.target.value)}
                placeholder="Describe el alcance del proyecto: actividades incluidas, entregables, especificaciones técnicas..."
                rows={12}
                className="mt-2 w-full rounded-xl border border-[#D2D2D7] px-4 py-3 text-[14px] leading-relaxed text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
              />
              <div className="mt-4 flex items-center gap-3">
                <Button
                  onClick={handleSaveAlcance}
                  disabled={savingAlcance}
                  className="rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
                >
                  {savingAlcance ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Guardar cambios
                </Button>
                {savedAlcance && (
                  <span className="flex items-center gap-1.5 text-[13px] text-[#34C759]">
                    <CheckCircle2 className="size-4" />
                    Guardado
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: Programación ─── */}
        {activeTab === "programacion" && (
          <div className="space-y-4">
            {actividades.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#D2D2D7] bg-white p-16 text-center">
                <Calendar className="size-10 text-[#D2D2D7]" />
                <p className="text-[15px] text-[#1D1D1F]">Sin actividades programadas</p>
                <p className="text-[13px] text-[#86868B]">Próximamente: programación de actividades</p>
              </div>
            ) : (
              actividades.map((act) => {
                const st = ACTIVIDAD_STATUS[act.estado] ?? ACTIVIDAD_STATUS.PENDING;
                return (
                  <div
                    key={act.id}
                    className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-5 transition-all duration-200 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-medium text-[#1D1D1F]">
                            {act.actividad}
                          </h3>
                          {act.hito_critico && (
                            <span className="rounded-full bg-[#FF3B30]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FF3B30]">
                              Hito
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[12px] text-[#86868B]">
                          {formatDate(act.fecha_inicio)} — {formatDate(act.fecha_fin)}
                        </p>
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", st.bg, st.text)}>
                        {st.label}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="text-[#86868B]">Progreso</span>
                        <span className="font-medium text-[#1D1D1F]">{act.porcentaje_avance}%</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-[#F5F5F7]">
                        <div
                          className="h-full rounded-full bg-[#007AFF] transition-all"
                          style={{ width: `${act.porcentaje_avance}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Helper component ─── */

function InfoCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-5 transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[#F5F5F7]">
          <Icon className="size-4 text-[#86868B]" />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] text-[#86868B]">{label}</p>
          <p className="truncate text-[14px] font-medium text-[#1D1D1F]">{value}</p>
        </div>
      </div>
    </div>
  );
}
