"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Upload,
  Image as ImageIcon,
  Plus,
  FileText,
  FileCheck,
  RefreshCw,
  MapPin,
  DollarSign,
  User,
  Target,
  Clock,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { UploadEvidenciaModal } from "@/components/proyecto/UploadEvidenciaModal";
import { UploadReferenciaModal } from "@/components/proyecto/UploadReferenciaModal";
import { ImageLightbox } from "@/components/proyecto/ImageLightbox";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isPast } from "date-fns";

interface ActividadAlcance {
  id: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  completado: boolean;
  evidencia_url?: string | null;
}

interface EvidenciaCalidad {
  url: string;
  fecha: string;
}

interface ItemCalidad {
  id: string;
  descripcion: string;
  terminado: boolean;
  evidencias: EvidenciaCalidad[];
}

interface ProyectoData {
  id: string;
  cliente_nombre: string | null;
  direccion: string | null;
  presupuesto_total: number | null;
  fecha_inicio: string | null;
  fecha_entrega_estimada: string | null;
  margen_objetivo: number | null;
  residente_asignado: string | null;
  estado: string | null;
  porcentaje_avance: number;
  lista_actividades: ActividadAlcance[];
  planos_url: string[];
  renders_url: string[];
  checklist_calidad: ItemCalidad[];
}

function parseActividades(raw: unknown): ActividadAlcance[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((a: Record<string, unknown>, i: number) => ({
    id: (a.id as string) ?? `act-${i}`,
    descripcion: (a.descripcion as string) ?? "",
    unidad: (a.unidad as string) ?? "",
    cantidad: Number(a.cantidad) ?? 0,
    completado: Boolean(a.completado),
    evidencia_url: (a.evidencia_url as string) ?? null,
  }));
}

function parseChecklistCalidad(raw: unknown): ItemCalidad[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c: Record<string, unknown>, i: number) => ({
    id: (c.id as string) ?? `cal-${i}`,
    descripcion: (c.descripcion as string) ?? "",
    terminado: Boolean(c.terminado),
    evidencias: Array.isArray(c.evidencias)
      ? (c.evidencias as EvidenciaCalidad[])
      : [],
  }));
}

function formatDateDMY(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
}

function mapEstadoLabel(estado: string | null): string {
  if (!estado) return "Activo";
  const u = estado.toUpperCase();
  if (u === "ACTIVO") return "Activo";
  if (u === "PAUSADO" || u === "EN_PAUSA") return "Pausado";
  if (u === "FINALIZADO" || u === "TERMINADO") return "Finalizado";
  return "Activo";
}

function mapEstadoColor(estado: string | null): string {
  if (!estado) return "bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20";
  const u = estado.toUpperCase();
  if (u === "ACTIVO") return "bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20";
  if (u === "PAUSADO" || u === "EN_PAUSA") return "bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20";
  if (u === "FINALIZADO" || u === "TERMINADO") return "bg-[#F5F5F7] text-[#86868B] border-[#D2D2D7]";
  return "bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20";
}

export default function ProyectoDetallePage() {
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<ProyectoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState<{
    open: boolean;
    tipo: "actividad" | "calidad";
    actividadId?: string;
    itemCalidadId?: string;
  }>({ open: false, tipo: "actividad" });
  const [lightbox, setLightbox] = useState<{ open: boolean; src: string }>({
    open: false,
    src: "",
  });
  const [referenciaModal, setReferenciaModal] = useState(false);

  useEffect(() => {
    async function fetchProject() {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("proyectos_maestro")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !data) {
          setProject(null);
          return;
        }

        const row = data as Record<string, unknown>;
        setProject({
          id: row.id as string,
          cliente_nombre: (row.cliente_nombre as string) ?? null,
          direccion: (row.direccion as string) ?? null,
          presupuesto_total: (row.presupuesto_total as number) ?? null,
          fecha_inicio: (row.fecha_inicio as string) ?? null,
          fecha_entrega_estimada: (row.fecha_entrega_estimada as string) ?? null,
          margen_objetivo: (row.margen_objetivo as number) ?? null,
          residente_asignado: (row.residente_asignado as string) ?? null,
          estado: (row.estado as string) ?? null,
          porcentaje_avance: Number(row.porcentaje_avance) || 0,
          lista_actividades: parseActividades(row.lista_actividades),
          planos_url: Array.isArray(row.planos_url) ? (row.planos_url as string[]) : [],
          renders_url: Array.isArray(row.renders_url) ? (row.renders_url as string[]) : [],
          checklist_calidad: parseChecklistCalidad(row.checklist_calidad),
        });
      } catch {
        setProject(null);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchProject();
  }, [id]);

  async function updateActividadEvidencia(actividadId: string, url: string) {
    if (!project) return;
    const updated = project.lista_actividades.map((a) =>
      a.id === actividadId ? { ...a, evidencia_url: url, completado: true } : a
    );
    setProject({ ...project, lista_actividades: updated });

    const supabase = getSupabase();
    await supabase
      .from("proyectos_maestro")
      .update({ lista_actividades: updated })
      .eq("id", id);
  }

  async function toggleActividadCompletado(actividadId: string, checked: boolean) {
    if (!project) return;
    const act = project.lista_actividades.find((a) => a.id === actividadId);
    if (!act) return;
    if (checked && !act.evidencia_url) return;

    const updated = project.lista_actividades.map((a) =>
      a.id === actividadId ? { ...a, completado: checked } : a
    );
    setProject({ ...project, lista_actividades: updated });

    const supabase = getSupabase();
    await supabase
      .from("proyectos_maestro")
      .update({ lista_actividades: updated })
      .eq("id", id);
  }

  async function addCalidadEvidencia(itemId: string, url: string) {
    if (!project) return;
    const evidencia = { url, fecha: new Date().toISOString() };
    const updated = project.checklist_calidad.map((c) =>
      c.id === itemId
        ? { ...c, evidencias: [...c.evidencias, evidencia] }
        : c
    );
    setProject({ ...project, checklist_calidad: updated });

    const supabase = getSupabase();
    await supabase
      .from("proyectos_maestro")
      .update({ checklist_calidad: updated })
      .eq("id", id);
  }

  async function toggleCalidadTerminado(itemId: string, terminado: boolean) {
    if (!project) return;
    const item = project.checklist_calidad.find((c) => c.id === itemId);
    if (!item) return;
    if (terminado && item.evidencias.length === 0) return;

    const updated = project.checklist_calidad.map((c) =>
      c.id === itemId ? { ...c, terminado } : c
    );
    setProject({ ...project, checklist_calidad: updated });

    const supabase = getSupabase();
    await supabase
      .from("proyectos_maestro")
      .update({ checklist_calidad: updated })
      .eq("id", id);
  }

  async function addActividadAlcance() {
    if (!project) return;
    const nueva: ActividadAlcance = {
      id: crypto.randomUUID(),
      descripcion: "Nueva actividad",
      unidad: "und",
      cantidad: 0,
      completado: false,
    };
    const updated = [...project.lista_actividades, nueva];
    setProject({ ...project, lista_actividades: updated });

    const supabase = getSupabase();
    await supabase
      .from("proyectos_maestro")
      .update({ lista_actividades: updated })
      .eq("id", id);
  }

  async function addItemCalidad() {
    if (!project) return;
    const nuevo: ItemCalidad = {
      id: crypto.randomUUID(),
      descripcion: "Nuevo ítem de calidad",
      terminado: false,
      evidencias: [],
    };
    const updated = [...project.checklist_calidad, nuevo];
    setProject({ ...project, checklist_calidad: updated });

    const supabase = getSupabase();
    await supabase
      .from("proyectos_maestro")
      .update({ checklist_calidad: updated })
      .eq("id", id);
  }

  async function addImagenReferencia(tipo: "planos" | "renders", url: string) {
    if (!project) return;
    const key = tipo === "planos" ? "planos_url" : "renders_url";
    const arr = tipo === "planos" ? project.planos_url : project.renders_url;
    const updated = [...arr, url];
    setProject({ ...project, [key]: updated });

    const supabase = getSupabase();
    await supabase
      .from("proyectos_maestro")
      .update({ [key]: updated })
      .eq("id", id);
  }

  function handleReferenciaUpload(url: string, tipo: "plano" | "render") {
    addImagenReferencia(tipo === "plano" ? "planos" : "renders", url);
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-6">
        <p className="text-[#86868B]">Proyecto no encontrado</p>
        <Button variant="outline" className="rounded-xl border-[#D2D2D7]" asChild>
          <Link href="/dashboard">Volver al dashboard</Link>
        </Button>
      </div>
    );
  }

  const todasImagenes = [
    ...project.planos_url.map((url) => ({ url, tipo: "Plano" })),
    ...project.renders_url.map((url) => ({ url, tipo: "Render" })),
  ];

  const fechaEntrega = project.fecha_entrega_estimada
    ? new Date(project.fecha_entrega_estimada)
    : null;
  const diasRestantes = fechaEntrega ? differenceInDays(fechaEntrega, new Date()) : null;
  const estaRetrasado = fechaEntrega ? isPast(fechaEntrega) && project.porcentaje_avance < 100 : false;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-8 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="size-8 text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-[#1D1D1F]">
                {project.cliente_nombre || "Proyecto"}
              </h1>
              {project.direccion && (
                <p className="text-[13px] text-[#86868B]">{project.direccion}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-[#007AFF]/20 bg-[#007AFF]/5 px-3 py-1 text-[11px] font-medium text-[#007AFF]">
              <RefreshCw className="size-3" />
              Sincronizado
            </span>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                mapEstadoColor(project.estado)
              )}
            >
              {mapEstadoLabel(project.estado)}
            </span>
            <Button variant="outline" size="sm" className="h-8 rounded-lg border-[#D2D2D7] text-[13px] text-[#1D1D1F] hover:bg-[#F5F5F7]" asChild>
              <Link href={`/proyecto/${project.id}/bitacora`}>
                <Calendar className="size-3.5" />
                Bitácora
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8 rounded-lg border-[#D2D2D7] text-[13px] text-[#1D1D1F] hover:bg-[#F5F5F7]" asChild>
              <Link href={`/programacion/${project.id}`}>
                Gantt
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-8 py-8">
        {/* Project Data - Read Only */}
        <div className="mb-8 rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#1D1D1F]">Datos del Proyecto</h2>
            <span className="text-[11px] text-[#86868B]">Solo lectura</span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#007AFF]/10">
                <DollarSign className="size-4 text-[#007AFF]" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#86868B]">Presupuesto</p>
                <p className="mt-0.5 text-[15px] font-semibold text-[#1D1D1F]">
                  {project.presupuesto_total
                    ? project.presupuesto_total.toLocaleString("es-CO", {
                        style: "currency",
                        currency: "COP",
                        maximumFractionDigits: 0,
                      })
                    : "—"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#007AFF]/10">
                <MapPin className="size-4 text-[#007AFF]" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#86868B]">Dirección</p>
                <p className="mt-0.5 text-[13px] font-medium text-[#1D1D1F]">{project.direccion || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#007AFF]/10">
                <User className="size-4 text-[#007AFF]" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#86868B]">Residente</p>
                <p className="mt-0.5 text-[13px] font-medium text-[#1D1D1F]">{project.residente_asignado || "Sin asignar"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#007AFF]/10">
                <Target className="size-4 text-[#007AFF]" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#86868B]">Avance</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#F5F5F7]">
                    <div
                      className="h-full rounded-full bg-[#007AFF] transition-all duration-500"
                      style={{ width: `${Math.min(project.porcentaje_avance, 100)}%` }}
                    />
                  </div>
                  <span className="text-[13px] font-semibold text-[#1D1D1F]">{Math.round(project.porcentaje_avance)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dates and margin */}
          <div className="mt-5 grid gap-4 border-t border-[#D2D2D7]/40 pt-5 sm:grid-cols-3 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-[#86868B]" />
              <div>
                <p className="text-[11px] text-[#86868B]">Inicio</p>
                <p className="text-[13px] font-medium text-[#1D1D1F]">
                  {project.fecha_inicio ? formatDateDMY(project.fecha_inicio) : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-[#86868B]" />
              <div>
                <p className="text-[11px] text-[#86868B]">Entrega estimada</p>
                <p className={cn("text-[13px] font-medium", estaRetrasado ? "text-[#FF3B30]" : "text-[#1D1D1F]")}>
                  {project.fecha_entrega_estimada ? formatDateDMY(project.fecha_entrega_estimada) : "—"}
                </p>
              </div>
            </div>
            {diasRestantes !== null && (
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-[#86868B]" />
                <div>
                  <p className="text-[11px] text-[#86868B]">Días restantes</p>
                  <p className={cn("text-[13px] font-semibold", estaRetrasado ? "text-[#FF3B30]" : "text-[#1D1D1F]")}>
                    {estaRetrasado
                      ? `Retrasado ${Math.abs(diasRestantes)} días`
                      : `${diasRestantes} días`}
                  </p>
                </div>
              </div>
            )}
            {project.margen_objetivo != null && (
              <div className="flex items-center gap-2">
                <Target className="size-4 text-[#86868B]" />
                <div>
                  <p className="text-[11px] text-[#86868B]">Margen objetivo</p>
                  <p className="text-[13px] font-medium text-[#1D1D1F]">{project.margen_objetivo}%</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="informacion" className="space-y-6">
          <TabsList variant="line" className="h-auto w-full justify-start gap-0 border-b border-[#D2D2D7]/40 bg-transparent p-0">
            {[
              { value: "informacion", label: "Actividades" },
              { value: "contrato", label: "Contrato" },
              { value: "bitacora", label: "Bitácora" },
              { value: "pedidos", label: "Pedidos" },
              { value: "programacion", label: "Programación" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent bg-transparent px-5 py-2.5 text-[13px] font-medium text-[#86868B] transition-all data-[state=active]:border-[#007AFF] data-[state=active]:text-[#007AFF] data-[state=active]:shadow-none"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* TAB 1: Actividades */}
          <TabsContent value="informacion" className="mt-6 space-y-6">
            <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
              {project.lista_actividades.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-[#86868B]">
                  Actividades pendientes por definir
                </p>
              ) : (
                <>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-[#1D1D1F]">
                  Actividades contratadas
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg border-[#D2D2D7] text-[13px] text-[#007AFF] hover:bg-[#007AFF]/5"
                  onClick={addActividadAlcance}
                >
                  <Plus className="size-3.5" />
                  Añadir
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#D2D2D7]/40 text-left">
                      <th className="pb-3 pr-4 text-[11px] font-medium uppercase tracking-wider text-[#86868B]">Estado</th>
                      <th className="pb-3 pr-4 text-[11px] font-medium uppercase tracking-wider text-[#86868B]">Descripción</th>
                      <th className="pb-3 pr-4 text-[11px] font-medium uppercase tracking-wider text-[#86868B]">Unidad</th>
                      <th className="pb-3 pr-4 text-[11px] font-medium uppercase tracking-wider text-[#86868B]">Cantidad</th>
                      <th className="pb-3 text-[11px] font-medium uppercase tracking-wider text-[#86868B]">Evidencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.lista_actividades.map((act) => (
                      <tr
                        key={act.id}
                        className="border-b border-[#D2D2D7]/20 transition-colors hover:bg-[#F5F5F7]/50"
                      >
                        <td className="py-3 pr-4">
                          <Checkbox
                            checked={act.completado}
                            onCheckedChange={(checked) =>
                              toggleActividadCompletado(act.id, checked === true)
                            }
                            disabled={!act.evidencia_url}
                            className="border-[#D2D2D7] data-[state=checked]:bg-[#007AFF] data-[state=checked]:border-[#007AFF]"
                          />
                        </td>
                        <td className="py-3 pr-4 font-medium text-[#1D1D1F]">{act.descripcion}</td>
                        <td className="py-3 pr-4 text-[#86868B]">{act.unidad}</td>
                        <td className="py-3 pr-4 text-[#86868B]">{act.cantidad}</td>
                        <td className="py-3">
                          {act.evidencia_url ? (
                            <a
                              href={act.evidencia_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#007AFF] hover:underline"
                            >
                              Ver foto
                            </a>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-lg border-[#D2D2D7] text-[12px] text-[#007AFF] hover:bg-[#007AFF]/5"
                              onClick={() =>
                                setUploadModal({
                                  open: true,
                                  tipo: "actividad",
                                  actividadId: act.id,
                                })
                              }
                            >
                              <Upload className="size-3" />
                              Subir
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                </>
              )}
            </div>

            {/* Visual References */}
            <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
              <h2 className="mb-4 text-[15px] font-semibold text-[#1D1D1F]">
                Referencias Visuales
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {todasImagenes.map(({ url, tipo }) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setLightbox({ open: true, src: url })}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-[#D2D2D7]/60 bg-[#F5F5F7] transition-all hover:shadow-md"
                  >
                    <img
                      src={url}
                      alt={tipo}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <span className="absolute bottom-0 left-0 right-0 bg-[#1D1D1F]/60 px-2 py-1 text-[11px] text-white backdrop-blur-sm">
                      {tipo}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setReferenciaModal(true)}
                  className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-[#D2D2D7] bg-[#F5F5F7]/50 transition-colors hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5"
                >
                  <ImageIcon className="size-8 text-[#D2D2D7]" />
                </button>
              </div>
              {todasImagenes.length === 0 && (
                <p className="py-8 text-center text-[13px] text-[#86868B]">
                  No hay planos ni renders. Sube imágenes para comenzar.
                </p>
              )}
            </div>

            {/* Quality Checklist */}
            <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-[#1D1D1F]">
                  Checklist de calidad
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg border-[#D2D2D7] text-[13px] text-[#007AFF] hover:bg-[#007AFF]/5"
                  onClick={addItemCalidad}
                >
                  <Plus className="size-3.5" />
                  Añadir
                </Button>
              </div>
              <div className="space-y-2">
                {project.checklist_calidad.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#D2D2D7]/40 bg-[#F5F5F7]/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={item.terminado}
                          onCheckedChange={(checked) =>
                            toggleCalidadTerminado(item.id, checked === true)
                          }
                          disabled={item.evidencias.length === 0}
                          className="border-[#D2D2D7] data-[state=checked]:bg-[#007AFF] data-[state=checked]:border-[#007AFF]"
                        />
                        <span
                          className={cn(
                            "text-[13px] font-medium text-[#1D1D1F]",
                            item.terminado && "text-[#86868B] line-through"
                          )}
                        >
                          {item.descripcion}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0 rounded-lg border-[#D2D2D7] text-[12px] text-[#007AFF] hover:bg-[#007AFF]/5"
                        onClick={() =>
                          setUploadModal({
                            open: true,
                            tipo: "calidad",
                            itemCalidadId: item.id,
                          })
                        }
                      >
                        <Upload className="size-3" />
                        Evidencia
                      </Button>
                    </div>
                    {item.evidencias.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-[#D2D2D7]/30 pt-3">
                        <p className="text-[11px] font-medium text-[#86868B]">Historial</p>
                        {item.evidencias.map((ev, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[12px]">
                            <a
                              href={ev.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#007AFF] hover:underline"
                            >
                              Evidencia {idx + 1}
                            </a>
                            <span className="text-[#86868B]">
                              {formatDateDMY(ev.fecha)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {project.checklist_calidad.length === 0 && (
                <p className="py-8 text-center text-[13px] text-[#86868B]">
                  No hay ítems en el checklist.
                </p>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: Contrato */}
          <TabsContent value="contrato" className="mt-6">
            <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
              <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-[#1D1D1F]">
                <FileCheck className="size-4 text-[#007AFF]" />
                Analizar Contrato con IA
              </h2>
              <p className="mb-4 text-[13px] text-[#86868B]">
                Sube un PDF o DOCX del contrato para extraer automáticamente cliente, presupuesto, fechas y alcance.
              </p>
              <Button className="rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]" asChild>
                <Link href={`/proyecto/${project.id}/contrato`}>
                  <FileText className="size-4" />
                  Ir a Analizar Contrato
                </Link>
              </Button>
            </div>
          </TabsContent>

          {/* TAB 3: Bitacora */}
          <TabsContent value="bitacora" className="mt-6">
            <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
              <h2 className="mb-3 text-[15px] font-semibold text-[#1D1D1F]">Bitácora Diaria</h2>
              <p className="mb-4 text-[13px] text-[#86868B]">
                Registra las novedades del día, personal y fotos de avance.
              </p>
              <Button className="rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]" asChild>
                <Link href={`/proyecto/${project.id}/bitacora`}>
                  <Calendar className="size-4" />
                  Ir a Bitácora
                </Link>
              </Button>
            </div>
          </TabsContent>

          {/* TAB 4: Pedidos */}
          <TabsContent value="pedidos" className="mt-6">
            <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
              <h2 className="mb-3 text-[15px] font-semibold text-[#1D1D1F]">Pedidos de Material</h2>
              <p className="mb-4 text-[13px] text-[#86868B]">
                Solicita materiales para este proyecto.
              </p>
              <Button className="rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]" asChild>
                <Link href={`/proyecto/${project.id}/pedidos`}>
                  Ver Pedidos
                </Link>
              </Button>
            </div>
          </TabsContent>

          {/* TAB 5: Programacion */}
          <TabsContent value="programacion" className="mt-6">
            <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
              <h2 className="mb-3 text-[15px] font-semibold text-[#1D1D1F]">Gantt de Programación</h2>
              <p className="mb-4 text-[13px] text-[#86868B]">
                Visualiza el cronograma y avance de actividades.
              </p>
              <Button className="rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]" asChild>
                <Link href={`/programacion/${project.id}`}>
                  Ver Gantt
                </Link>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      <UploadEvidenciaModal
        open={uploadModal.open}
        onOpenChange={(open) =>
          setUploadModal((prev) => ({ ...prev, open }))
        }
        proyectoId={id}
        onUploadComplete={(url) => {
          if (uploadModal.tipo === "actividad" && uploadModal.actividadId) {
            updateActividadEvidencia(uploadModal.actividadId, url);
          }
          if (uploadModal.tipo === "calidad" && uploadModal.itemCalidadId) {
            addCalidadEvidencia(uploadModal.itemCalidadId, url);
          }
          setUploadModal({ open: false, tipo: "actividad" });
        }}
      />

      <ImageLightbox
        open={lightbox.open}
        onOpenChange={(open) => setLightbox((prev) => ({ ...prev, open }))}
        src={lightbox.src}
      />

      <UploadReferenciaModal
        open={referenciaModal}
        onOpenChange={setReferenciaModal}
        proyectoId={id}
        onUploadComplete={handleReferenciaUpload}
      />
    </div>
  );
}
