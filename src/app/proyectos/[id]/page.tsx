// @ts-nocheck
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
  Lock,
  ImagePlus,
  X,
  Plus,
  PlusCircle,
  Trash2,
  Pencil,
  HardHat,
  FileText,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Actividad } from "./components/ActividadCard";
import { ProgramacionProyecto } from "@/components/ProgramacionProyecto";
import { AvancesFeed } from "@/components/AvancesFeed";

interface Proyecto {
  id: string;
  cliente_nombre: string | null;
  direccion: string | null;
  presupuesto_total: number | null;
  porcentaje_avance: number;
  estado: string | null;
  residente_asignado: string | null;
  residente: string | null;
  fecha_inicio: string | null;
  fecha_entrega_estimada: string | null;
  conjunto: string | null;
  alcance_imagen: string | null;
  proyecto_nombre: string | null;
  app_origen: string | null;
  link_contrato: string | null;
}

interface AdicionalRow {
  id: string;
  descripcion: string;
  monto: number;
  estado: string;
  solicitado_por: string | null;
  created_at: string;
}

// ── Constants ──

const TABS = [
  { id: "detalle", label: "Detalle" },
  { id: "adicionales", label: "Adicionales" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVO: { bg: "bg-[#34C759]/10", text: "text-[#34C759]", label: "Activo" },
  EN_PAUSA: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "Pausado" },
  PAUSADO: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "Pausado" },
  TERMINADO: { bg: "bg-[#86868B]/10", text: "text-[#86868B]", label: "Finalizado" },
  FINALIZADO: { bg: "bg-[#86868B]/10", text: "text-[#86868B]", label: "Finalizado" },
};

const ADICIONAL_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  solicitado: { bg: "bg-[#86868B]/10", text: "text-[#86868B]", label: "Solicitud" },
  aprobado_gerencia: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "Aprobado" },
  pago_50: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "50% Pagado" },
  trabajo_iniciado: { bg: "bg-[#007AFF]/10", text: "text-[#007AFF]", label: "En ejecución" },
  trabajo_finalizado: { bg: "bg-[#34C759]/10", text: "text-[#34C759]", label: "Finalizado" },
  pagado: { bg: "bg-[#34C759]/10", text: "text-[#34C759]", label: "Pagado" },
  SOLICITUD_CLIENTE: { bg: "bg-[#86868B]/10", text: "text-[#86868B]", label: "Solicitud" },
  APROBADO_GERENCIA: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "Aprobado" },
  PAGO_50_CONFIRMADO: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "50% Pagado" },
  EN_EJECUCION: { bg: "bg-[#007AFF]/10", text: "text-[#007AFF]", label: "En ejecución" },
  FINALIZADO: { bg: "bg-[#34C759]/10", text: "text-[#34C759]", label: "Finalizado" },
  SALDO_PENDIENTE: { bg: "bg-[#FF3B30]/10", text: "text-[#FF3B30]", label: "Saldo pendiente" },
};

// ── Component ──

export default function ProyectoDetailPage() {
  const supabase = getSupabaseClient();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Proyecto | null>(null);
  const [adicionales, setAdicionales] = useState<AdicionalRow[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("detalle");

  const [editForm, setEditForm] = useState({
    cliente_nombre: "",
    residente: "",
    presupuesto_total: "",
    estado: "ACTIVO" as "ACTIVO" | "PAUSADO" | "FINALIZADO",
  });

  const [alcanceImagen, setAlcanceImagen] = useState<string | null>(null);

  const [referencias, setReferencias] = useState<any>(null);
  const [editandoReferencias, setEditandoReferencias] = useState(false);
  const [guardandoReferencias, setGuardandoReferencias] = useState(false);
  const [formReferencias, setFormReferencias] = useState({
    enchape_piso_general: "",
    enchape_banos_piso: "",
    enchape_muros_banos: "",
    enchape_dilatacion_banos: "",
    enchape_zona_humeda: "",
    enchape_salpicadero: "",
    demolicion_muro_zona_humeda: "",
    poyos_cocina_closets: "",
    ubicacion_poyo_closet_principal: "",
    color_meson_barra: "",
    color_carpinteria: "",
  });

  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // ── Data loading ──

  const fetchData = useCallback(async () => {
    try {
      const [projRes, adRes, actRes, finRes] = await Promise.all([
        supabase.from("proyectos_maestro").select("*").eq("id", projectId).single(),
        supabase.from("adicionales").select("*").eq("proyecto_id", projectId).order("created_at", { ascending: false }),
        supabase.from("actividades_proyecto").select("*").eq("proyecto_id", projectId).order("orden", { ascending: true }),
        // proyectos.contrato_url (tabla propia de Finanzas, mismo id que proyectos_maestro) — fuente
        // automática del PDF del contrato. proyectos_maestro.link_contrato es un enlace manual
        // (Drive) que se guardaba aparte y no siempre coincide; se usa como respaldo.
        supabase.from("proyectos").select("contrato_url").eq("id", projectId).maybeSingle(),
      ]);

      if (projRes.data) {
        const r = projRes.data;
        setProject({
          id: r.id,
          cliente_nombre: r.cliente_nombre ?? null,
          direccion: r.direccion ?? null,
          presupuesto_total: r.presupuesto_total ?? null,
          porcentaje_avance: Number(r.porcentaje_avance) || 0,
          estado: r.estado ?? null,
          residente_asignado: r.residente_asignado ?? null,
          residente: r.residente ?? null,
          fecha_inicio: r.fecha_inicio ?? null,
          fecha_entrega_estimada: r.fecha_entrega_estimada ?? null,
          conjunto: r.conjunto ?? null,
          alcance_imagen: r.alcance_imagen ?? null,
          proyecto_nombre: r.proyecto_nombre ?? null,
          app_origen: r.app_origen ?? null,
          link_contrato: finRes.data?.contrato_url ?? r.link_contrato ?? null,
        });
        setAlcanceImagen(r.alcance_imagen ?? null);
        setEditForm({
          cliente_nombre: r.cliente_nombre ?? "",
          residente: r.residente ?? "",
          presupuesto_total: r.presupuesto_total != null ? String(r.presupuesto_total) : "",
          estado: (r.estado as any) ?? "ACTIVO",
        });
      }

      if (adRes.data) {
        setAdicionales(adRes.data.map((r: any) => ({
          id: r.id,
          descripcion: r.descripcion,
          monto: Number(r.monto) || 0,
          estado: r.estado ?? "SOLICITUD_CLIENTE",
          solicitado_por: r.solicitado_por ?? null,
          created_at: r.created_at ?? "",
        })));
      }

      if (actRes.data) {
        const raw: Actividad[] = actRes.data.map((r: any) => ({
          id: r.id,
          titulo: r.titulo,
          descripcion: r.descripcion ?? null,
          porcentaje: Number(r.porcentaje) || 0,
          estado: r.estado ?? "PENDIENTE",
          orden: r.orden ?? 0,
          duracion_dias: Number(r.duracion_dias) || 1,
          fecha_inicio_estimada: r.fecha_inicio_estimada ?? null,
          fecha_fin_estimada: r.fecha_fin_estimada ?? null,
          es_critica: Boolean(r.es_critica),
          holgura_dias: Number(r.holgura_dias) || 0,
          predecesoras: r.predecesoras ?? [],
        }));
        setActividades(raw);
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

  // ── Computed ──

  const kanbanProgress = (() => {
    const total = actividades.length;
    if (total === 0) return 0;
    const done = actividades.filter((a) => a.estado === "TERMINADO").length;
    return Math.round((done / total) * 100);
  })();

  // ── Info handlers ──

  async function guardarCambios() {
    if (!project) return;
    setGuardando(true);
    try {
      const { error } = await supabase
        .from("proyectos_maestro")
        .update({
          cliente_nombre: editForm.cliente_nombre,
          residente: editForm.residente || null,
          presupuesto_total: editForm.presupuesto_total ? Number(editForm.presupuesto_total) : null,
          estado: editForm.estado,
        } as any)
        .eq("id", project.id);

      if (error) throw error;

      await fetchData();
      setEditando(false);
    } catch (err) {
      console.error("Error:", err);
      alert("Error al guardar cambios");
    } finally {
      setGuardando(false);
    }
  }

  useEffect(() => {
    if (projectId) cargarReferencias();
  }, [projectId]);

  // ── Imagen de alcance handlers ──

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !project) return;

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setAlcanceImagen(localPreview);
    setUploadingImage(true);

    try {
      const ext = file.name.split(".").pop();
      const fileName = `${project.id}-${Date.now()}.${ext}`;
      const filePath = `alcance/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("alcance-imagenes")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("alcance-imagenes")
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;
      setAlcanceImagen(imageUrl);

      await supabase
        .from("proyectos_maestro")
        .update({ alcance_imagen: imageUrl })
        .eq("id", project.id);

      setProject((prev) => prev ? { ...prev, alcance_imagen: imageUrl } : prev);
    } catch (err) {
      console.error("Error uploading image:", err);
      // Keep local preview even if DB save fails
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleRemoveImage() {
    if (!project) return;
    setAlcanceImagen(null);
    setProject((prev) => prev ? { ...prev, alcance_imagen: null } : prev);
    await supabase.from("proyectos_maestro").update({ alcance_imagen: null }).eq("id", project.id);
  }

  // ── Referencias handlers ──

  async function cargarReferencias() {
    if (!projectId) return;
    try {
      const { data, error } = await supabase
        .from("referencias_proyecto")
        .select("*")
        .eq("proyecto_id", projectId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error cargando referencias:", error);
        return;
      }

      if (data) {
        setReferencias(data);
        setFormReferencias({
          enchape_piso_general: data.enchape_piso_general || "",
          enchape_banos_piso: data.enchape_banos_piso || "",
          enchape_muros_banos: data.enchape_muros_banos || "",
          enchape_dilatacion_banos: data.enchape_dilatacion_banos || "",
          enchape_zona_humeda: data.enchape_zona_humeda || "",
          enchape_salpicadero: data.enchape_salpicadero || "",
          demolicion_muro_zona_humeda: data.demolicion_muro_zona_humeda || "",
          poyos_cocina_closets: data.poyos_cocina_closets || "",
          ubicacion_poyo_closet_principal: data.ubicacion_poyo_closet_principal || "",
          color_meson_barra: data.color_meson_barra || "",
          color_carpinteria: data.color_carpinteria || "",
        });
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }

  async function guardarReferencias() {
    if (!project) return;
    setGuardandoReferencias(true);
    try {
      if (referencias) {
        const { error } = await supabase
          .from("referencias_proyecto")
          .update(formReferencias as any)
          .eq("proyecto_id", project.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("referencias_proyecto")
          .insert({ proyecto_id: project.id, ...formReferencias } as any);
        if (error) throw error;
      }
      await cargarReferencias();
      setEditandoReferencias(false);
    } catch (err) {
      console.error("Error:", err);
      alert("Error al guardar referencias");
    } finally {
      setGuardandoReferencias(false);
    }
  }

  // ── Helpers ──

  function formatDate(date: string | null): string {
    if (!date) return "—";
    try {
      return format(new Date(date + "T12:00:00"), "d MMM yyyy", { locale: es });
    } catch {
      return date;
    }
  }

  // ── Loading / Not found ──

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
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-8 py-4">
          <Button variant="ghost" size="icon" className="size-8 text-[#86868B] hover:bg-[#F5F5F7]" asChild>
            <Link href="/proyectos"><ArrowLeft className="size-4" /></Link>
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
        <div className="mx-auto max-w-5xl overflow-x-auto px-8">
          <div className="flex gap-0 border-b-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative whitespace-nowrap px-4 pb-3 pt-1 text-[13px] font-medium transition-colors",
                  activeTab === tab.id ? "text-[#007AFF]" : "text-[#86868B] hover:text-[#1D1D1F]"
                )}
              >
                {tab.label}
                {tab.id === "adicionales" && adicionales.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-[#007AFF]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#007AFF]">
                    {adicionales.length}
                  </span>
                )}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#007AFF]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        {/* ─── SECCIÓN: Información (fechas contractuales + progreso) ─── */}
        {activeTab === "detalle" && projectId && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[20px] font-bold text-[#1D1D1F]">Información</h2>
              {project.link_contrato && (
                <a
                  href={project.link_contrato}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1 rounded-full bg-[#007AFF]/8 px-3 py-1 text-[12px] font-semibold text-[#007AFF] transition-colors hover:bg-[#007AFF]/15"
                >
                  <FileText className="size-3.5" />
                  Ver contrato
                </a>
              )}
            </div>

            <ProgramacionProyecto proyectoId={projectId} />

            {/* Progreso del proyecto (actividades_proyecto) */}
            <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#86868B]">Progreso del proyecto</span>
                <span className="text-lg font-semibold text-[#1D1D1F]">{kanbanProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#F5F5F7]">
                <div className="h-full rounded-full bg-[#34C759] transition-all duration-500" style={{ width: `${kanbanProgress}%` }} />
              </div>
              <p className="mt-2 text-[12px] text-[#86868B]">
                {actividades.filter((a) => a.estado === "TERMINADO").length} de {actividades.length} actividades
              </p>
            </div>
          </div>
        )}

        {/* ─── SECCIÓN: Finanzas ─── */}
        {activeTab === "detalle" && (
          <div className="mt-10 space-y-6">
            <h2 className="text-[20px] font-bold text-[#1D1D1F]">Finanzas</h2>

            {/* Información del proyecto */}
            <div className="rounded-lg border bg-white p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">
                  {isFromFinanzas
                    ? "Proyecto gestionado desde Finanzas"
                    : "Información del Proyecto"}
                </h3>
                {!isFromFinanzas && (
                  <Button
                    onClick={() => setEditando(!editando)}
                    variant="outline"
                    className="border-blue-500 text-blue-500 hover:bg-blue-50"
                  >
                    {editando ? "Cancelar" : "Editar"}
                  </Button>
                )}
              </div>

              {isFromFinanzas && (
                <div className="mb-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-700 border border-blue-200">
                  🔒 Los datos principales son de solo lectura.
                </div>
              )}

              {editando && !isFromFinanzas ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del proyecto *
                    </label>
                    <input
                      value={editForm.cliente_nombre}
                      onChange={(e) => setEditForm({ ...editForm, cliente_nombre: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Residente
                    </label>
                    <input
                      value={editForm.residente}
                      onChange={(e) => setEditForm({ ...editForm, residente: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2"
                      placeholder="Nombre del residente de obra"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Presupuesto total
                    </label>
                    <input
                      type="number"
                      value={editForm.presupuesto_total}
                      onChange={(e) => setEditForm({ ...editForm, presupuesto_total: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      value={editForm.estado}
                      onChange={(e) => setEditForm({ ...editForm, estado: e.target.value as any })}
                      className="w-full rounded-lg border px-3 py-2"
                    >
                      <option value="ACTIVO">Activo</option>
                      <option value="PAUSADO">Pausado</option>
                      <option value="FINALIZADO">Finalizado</option>
                    </select>
                  </div>

                  <Button
                    onClick={guardarCambios}
                    disabled={guardando}
                    className="w-full bg-blue-500 hover:bg-blue-600"
                  >
                    {guardando ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Cliente</p>
                        <p className="font-semibold text-gray-900">{project.cliente_nombre}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Presupuesto</p>
                        <p className="font-semibold text-gray-900">
                          {project.presupuesto_total
                            ? new Intl.NumberFormat("es-CO", {
                                style: "currency",
                                currency: "COP",
                                minimumFractionDigits: 0,
                              }).format(project.presupuesto_total)
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Fecha inicio</p>
                        <p className="font-semibold text-gray-900">
                          {project.fecha_inicio
                            ? new Date(project.fecha_inicio + "T12:00:00").toLocaleDateString("es-CO", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <HardHat className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Residente</p>
                        {!isFromFinanzas && !project.residente ? (
                          <button
                            onClick={() => setEditando(true)}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Agregar residente
                          </button>
                        ) : (
                          <p className="font-semibold text-gray-900">{project.residente || "—"}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── SECCIÓN: Alcance ─── */}
        {activeTab === "detalle" && (
          <div className="mt-10 space-y-6">
            <h2 className="text-[20px] font-bold text-[#1D1D1F]">Alcance</h2>

            {/* Avances — misma data que /bitacora (bitacora_entradas), no un historial paralelo */}
            <AvancesFeed proyectoId={projectId} proyectoNombre={project.cliente_nombre ?? undefined} />

            {/* Imagen de alcance */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagen de alcance
              </label>
              <input type="file" accept="image/*" className="hidden" id="alcance-upload" onChange={handleImageUpload} disabled={uploadingImage} />
              {!alcanceImagen ? (
                <label
                  htmlFor="alcance-upload"
                  className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                >
                  {uploadingImage ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-[#007AFF] mb-2" />
                      <p className="text-sm text-gray-600">Subiendo imagen...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ImagePlus className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Click para subir imagen del alcance</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG hasta 10MB</p>
                    </div>
                  )}
                </label>
              ) : (
                <div className="relative rounded-lg overflow-hidden border border-gray-200">
                  {uploadingImage && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                      <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
                    </div>
                  )}
                  <img src={alcanceImagen} alt="Alcance del proyecto" className="w-full h-auto" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <label
                      htmlFor="alcance-upload"
                      className="bg-blue-500 text-white rounded-full p-2 cursor-pointer hover:bg-blue-600 shadow-lg"
                    >
                      <ImagePlus className="h-4 w-4" />
                    </label>
                    <button
                      onClick={handleRemoveImage}
                      className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 shadow-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Referencias de enchapes y otros */}
            <div className="mt-8 rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-[#1D1D1F]">Referencias</h3>
                <div className="flex gap-2">
                  {editandoReferencias ? (
                    <>
                      <Button
                        onClick={guardarReferencias}
                        disabled={guardandoReferencias}
                        className="rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
                      >
                        {guardandoReferencias ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        Guardar
                      </Button>
                      <Button
                        variant="ghost"
                        className="rounded-xl text-[#86868B]"
                        onClick={() => {
                          setEditandoReferencias(false);
                          if (referencias) {
                            setFormReferencias({
                              enchape_piso_general: referencias.enchape_piso_general || "",
                              enchape_banos_piso: referencias.enchape_banos_piso || "",
                              enchape_muros_banos: referencias.enchape_muros_banos || "",
                              enchape_dilatacion_banos: referencias.enchape_dilatacion_banos || "",
                              enchape_zona_humeda: referencias.enchape_zona_humeda || "",
                              enchape_salpicadero: referencias.enchape_salpicadero || "",
                              demolicion_muro_zona_humeda: referencias.demolicion_muro_zona_humeda || "",
                              poyos_cocina_closets: referencias.poyos_cocina_closets || "",
                              ubicacion_poyo_closet_principal: referencias.ubicacion_poyo_closet_principal || "",
                              color_meson_barra: referencias.color_meson_barra || "",
                              color_carpinteria: referencias.color_carpinteria || "",
                            });
                          }
                        }}
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditandoReferencias(true)}
                      className="rounded-lg text-[13px] text-[#007AFF] hover:bg-[#007AFF]/5"
                    >
                      <Pencil className="size-3.5" />
                      {referencias ? "Editar" : "Agregar referencias"}
                    </Button>
                  )}
                </div>
              </div>

              {editandoReferencias ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="mb-3 text-[13px] font-semibold text-[#1D1D1F]">Enchapes</h4>
                    <div className="space-y-4">
                      {[
                        { key: "enchape_piso_general", label: "Enchape de piso general", placeholder: "Ej: Porcelanato Gris 60x60" },
                        { key: "enchape_banos_piso", label: "Enchape baños piso", placeholder: "Ej: Porcelanato Blanco 40x40" },
                        { key: "enchape_muros_banos", label: "Enchape muros baños", placeholder: "Ej: Cerámica Beige 30x60" },
                        { key: "enchape_dilatacion_banos", label: "Enchape dilatación baños", placeholder: "Ej: Porcelanato Negro 20x120" },
                        { key: "enchape_zona_humeda", label: "Enchape zona húmeda", placeholder: "Ej: Porcelanato Gris 30x60" },
                        { key: "enchape_salpicadero", label: "Enchape salpicadero", placeholder: "Ej: Porcelanato Blanco 60x60" },
                      ].map((field) => (
                        <div key={field.key} className="space-y-1.5">
                          <Label className="text-[13px] text-[#86868B]">{field.label}</Label>
                          <Input
                            value={(formReferencias as any)[field.key]}
                            onChange={(e) => setFormReferencias((f) => ({ ...f, [field.key]: e.target.value }))}
                            placeholder={field.placeholder}
                            className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-[#D2D2D7]/40 pt-5">
                    <h4 className="mb-3 text-[13px] font-semibold text-[#1D1D1F]">Otros</h4>
                    <div className="space-y-4">
                      {[
                        { key: "demolicion_muro_zona_humeda", label: "Demolición muro zona húmeda", placeholder: "Ej: Sí / No" },
                        { key: "poyos_cocina_closets", label: "Poyos cocina y closets", placeholder: "Ej: MDF con cubierta en granito" },
                        { key: "ubicacion_poyo_closet_principal", label: "Ubicación poyo closet habitación principal", placeholder: "Ej: Pared lateral izquierda" },
                        { key: "color_meson_barra", label: "Color de mesón y barra (si aplica)", placeholder: "Ej: Gris Oxford" },
                        { key: "color_carpinteria", label: "Color carpintería seleccionado (si aplica)", placeholder: "Ej: Blanco mate" },
                      ].map((field) => (
                        <div key={field.key} className="space-y-1.5">
                          <Label className="text-[13px] text-[#86868B]">{field.label}</Label>
                          <Input
                            value={(formReferencias as any)[field.key]}
                            onChange={(e) => setFormReferencias((f) => ({ ...f, [field.key]: e.target.value }))}
                            placeholder={field.placeholder}
                            className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : referencias ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="mb-3 text-[13px] font-semibold text-[#1D1D1F]">Enchapes</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { key: "enchape_piso_general", label: "Piso general" },
                        { key: "enchape_banos_piso", label: "Baños piso" },
                        { key: "enchape_muros_banos", label: "Muros baños" },
                        { key: "enchape_dilatacion_banos", label: "Dilatación baños" },
                        { key: "enchape_zona_humeda", label: "Zona húmeda" },
                        { key: "enchape_salpicadero", label: "Salpicadero" },
                      ].map((field) =>
                        referencias[field.key] ? (
                          <div key={field.key}>
                            <p className="text-[12px] text-[#86868B]">{field.label}</p>
                            <p className="text-[14px] font-medium text-[#1D1D1F]">{referencias[field.key]}</p>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>

                  <div className="border-t border-[#D2D2D7]/40 pt-5">
                    <h4 className="mb-3 text-[13px] font-semibold text-[#1D1D1F]">Otros</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { key: "demolicion_muro_zona_humeda", label: "Demolición muro zona húmeda" },
                        { key: "poyos_cocina_closets", label: "Poyos cocina y closets" },
                        { key: "ubicacion_poyo_closet_principal", label: "Ubicación poyo closet principal" },
                        { key: "color_meson_barra", label: "Color mesón y barra" },
                        { key: "color_carpinteria", label: "Color carpintería" },
                      ].map((field) =>
                        referencias[field.key] ? (
                          <div key={field.key}>
                            <p className="text-[12px] text-[#86868B]">{field.label}</p>
                            <p className="text-[14px] font-medium text-[#1D1D1F]">{referencias[field.key]}</p>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-[13px] text-[#86868B]">
                  No hay referencias registradas
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: Adicionales ─── */}
        {activeTab === "adicionales" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-[#86868B]">{adicionales.length} adicional{adicionales.length !== 1 ? "es" : ""}</p>
              <Button asChild className="rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]">
                <Link href="/adicionales/nuevo"><Plus className="size-4" />Nuevo Adicional</Link>
              </Button>
            </div>

            {adicionales.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#D2D2D7] bg-white p-16 text-center">
                <PlusCircle className="size-10 text-[#D2D2D7]" />
                <p className="text-[15px] text-[#1D1D1F]">Sin adicionales</p>
                <p className="text-[13px] text-[#86868B]">Los trabajos adicionales de este proyecto aparecerán aquí</p>
              </div>
            ) : (
              adicionales.map((ad) => {
                const st = ADICIONAL_STYLES[ad.estado] ?? ADICIONAL_STYLES.SOLICITUD_CLIENTE;
                return (
                  <Link key={ad.id} href={`/adicionales/${ad.id}`}>
                    <article className="group rounded-2xl border border-[#D2D2D7]/60 bg-white p-5 transition-all duration-200 hover:shadow-md">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[14px] font-medium text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">{ad.descripcion}</h3>
                          <div className="mt-2 flex items-center gap-3 text-[12px] text-[#86868B]">
                            <span className="font-medium text-[#1D1D1F]">${ad.monto.toLocaleString("es-CO")}</span>
                            {ad.solicitado_por && <span>por {ad.solicitado_por}</span>}
                            <span>{format(new Date(ad.created_at), "d MMM yyyy", { locale: es })}</span>
                          </div>
                        </div>
                        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", st.bg, st.text)}>{st.label}</span>
                      </div>
                    </article>
                  </Link>
                );
              })
            )}
          </div>
        )}

      </main>
    </div>
  );
}

// ── InfoCard helper ──

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
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
