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
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ActividadCard, type Actividad } from "./components/ActividadCard";
import { ActividadModal } from "./components/ActividadModal";

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
  alcance_imagen: string | null;
  proyecto_nombre: string | null;
  app_origen: string | null;
}

interface AdicionalRow {
  id: string;
  descripcion: string;
  monto: number;
  estado: string;
  solicitado_por: string | null;
  created_at: string;
}

// ── CPM helpers ──

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + "T12:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().split("T")[0];
}

function diffDias(a: string, b: string): number {
  return Math.floor(
    (new Date(a + "T12:00:00").getTime() - new Date(b + "T12:00:00").getTime()) / 86400000
  );
}

function calcularRutaCritica(acts: Actividad[]): Actividad[] {
  if (acts.length === 0) return acts;

  // Forward pass
  const withDates = acts.map((act) => {
    let inicio = act.fecha_inicio_estimada;
    if (act.predecesoras?.length > 0) {
      const fines = act.predecesoras
        .map((pid) => acts.find((a) => a.id === pid)?.fecha_fin_estimada)
        .filter(Boolean) as string[];
      if (fines.length > 0) inicio = fines.sort().reverse()[0];
    }
    if (!inicio) inicio = new Date().toISOString().split("T")[0];
    const fin = sumarDias(inicio, act.duracion_dias || 1);
    return { ...act, fecha_inicio_estimada: inicio, fecha_fin_estimada: fin };
  });

  // Project end = latest fin
  const fines = withDates.map((a) => a.fecha_fin_estimada).filter(Boolean) as string[];
  const proyectoFin = fines.sort().reverse()[0] || new Date().toISOString().split("T")[0];

  // Backward pass: holgura = project end - task end
  return withDates.map((act) => {
    const holgura = act.fecha_fin_estimada ? diffDias(proyectoFin, act.fecha_fin_estimada) : 0;
    return { ...act, holgura_dias: Math.max(holgura, 0), es_critica: holgura === 0 };
  });
}

// ── Constants ──

const TABS = [
  { id: "info", label: "Información" },
  { id: "alcance", label: "Alcance" },
  { id: "adicionales", label: "Adicionales" },
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

const ADICIONAL_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  SOLICITUD_CLIENTE: { bg: "bg-[#86868B]/10", text: "text-[#86868B]", label: "Solicitud" },
  APROBADO_GERENCIA: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "Aprobado" },
  PAGO_50_CONFIRMADO: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "50% Pagado" },
  EN_EJECUCION: { bg: "bg-[#007AFF]/10", text: "text-[#007AFF]", label: "En ejecución" },
  FINALIZADO: { bg: "bg-[#34C759]/10", text: "text-[#34C759]", label: "Finalizado" },
  SALDO_PENDIENTE: { bg: "bg-[#FF3B30]/10", text: "text-[#FF3B30]", label: "Saldo pendiente" },
};

const KANBAN_COLUMNS = [
  { key: "PENDIENTE", label: "Pendiente", color: "border-[#86868B]/30", headerBg: "bg-[#86868B]/10", headerText: "text-[#86868B]" },
  { key: "EN_PROCESO", label: "En Proceso", color: "border-[#007AFF]/30", headerBg: "bg-[#007AFF]/10", headerText: "text-[#007AFF]" },
  { key: "TERMINADO", label: "Terminado", color: "border-[#34C759]/30", headerBg: "bg-[#34C759]/10", headerText: "text-[#34C759]" },
];

// ── Component ──

export default function ProyectoDetailPage() {
  const supabase = getSupabaseClient();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Proyecto | null>(null);
  const [adicionales, setAdicionales] = useState<AdicionalRow[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("info");

  const [editForm, setEditForm] = useState({
    cliente_nombre: "",
    direccion: "",
    presupuesto_total: "",
    fecha_inicio: "",
    fecha_entrega_estimada: "",
    residente_asignado: "",
  });

  const [alcance, setAlcance] = useState("");
  const [alcanceImagen, setAlcanceImagen] = useState<string | null>(null);
  const [historialAlcance, setHistorialAlcance] = useState<any[]>([]);

  const [savingInfo, setSavingInfo] = useState(false);
  const [savedInfo, setSavedInfo] = useState(false);
  const [savingAlcance, setSavingAlcance] = useState(false);
  const [savedAlcance, setSavedAlcance] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Modal state
  const [mostrarModal, setMostrarModal] = useState(false);
  const [actividadEditando, setActividadEditando] = useState<Actividad | null>(null);

  // ── Data loading ──

  const fetchData = useCallback(async () => {
    try {
      const [projRes, adRes, actRes] = await Promise.all([
        supabase.from("proyectos_maestro").select("*").eq("id", projectId).single(),
        supabase.from("adicionales").select("*").eq("proyecto_id", projectId).order("created_at", { ascending: false }),
        supabase.from("actividades_proyecto").select("*").eq("proyecto_id", projectId).order("orden", { ascending: true }),
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
          fecha_inicio: r.fecha_inicio ?? null,
          fecha_entrega_estimada: r.fecha_entrega_estimada ?? null,
          conjunto: r.conjunto ?? null,
          alcance_text: r.alcance_text ?? null,
          alcance_imagen: r.alcance_imagen ?? null,
          proyecto_nombre: r.proyecto_nombre ?? null,
          app_origen: r.app_origen ?? null,
        });
        setAlcance(r.alcance_text ?? "");
        setAlcanceImagen(r.alcance_imagen ?? null);
        setEditForm({
          cliente_nombre: r.cliente_nombre ?? "",
          direccion: r.direccion ?? "",
          presupuesto_total: r.presupuesto_total != null ? String(r.presupuesto_total) : "",
          fecha_inicio: r.fecha_inicio ?? "",
          fecha_entrega_estimada: r.fecha_entrega_estimada ?? "",
          residente_asignado: r.residente_asignado ?? "",
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
        setActividades(calcularRutaCritica(raw));
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

  async function handleSaveInfo() {
    if (!project || isFromFinanzas) return;
    setSavingInfo(true);
    setSavedInfo(false);
    try {
      await supabase.from("proyectos_maestro").update({
        cliente_nombre: editForm.cliente_nombre.trim() || null,
        direccion: editForm.direccion.trim() || null,
        presupuesto_total: Number(editForm.presupuesto_total) || null,
        fecha_inicio: editForm.fecha_inicio || null,
        fecha_entrega_estimada: editForm.fecha_entrega_estimada || null,
        residente_asignado: editForm.residente_asignado.trim() || null,
      }).eq("id", project.id);
      setSavedInfo(true);
      setTimeout(() => setSavedInfo(false), 2000);
      fetchData();
    } catch (err) {
      console.error("Error saving info:", err);
    } finally {
      setSavingInfo(false);
    }
  }

  // ── Alcance handlers ──

  async function cargarHistorialAlcance() {
    if (!projectId) return;
    try {
      console.log("📋 Cargando historial para proyecto:", projectId);
      const { data, error } = await supabase
        .from("alcance_historial")
        .select("*")
        .eq("proyecto_id", projectId)
        .order("created_at", { ascending: false });

      console.log("📋 Historial cargado:", data);
      console.log("❌ Error:", error);

      if (error) {
        console.error("Error cargando historial:", error);
        return;
      }

      setHistorialAlcance(data || []);
    } catch (err) {
      console.error("Exception cargando historial:", err);
    }
  }

  useEffect(() => {
    if (activeTab === "alcance" && projectId) {
      console.log("🔄 Tab Alcance abierto, cargando historial...");
      cargarHistorialAlcance();
    }
  }, [activeTab, projectId]);

  async function handleSaveAlcance() {
    const textoLimpio = alcance.trim();
    if (!project || !textoLimpio) {
      alert("Escribe algo antes de guardar");
      return;
    }

    setSavingAlcance(true);
    setSavedAlcance(false);
    try {
      console.log("💾 Guardando texto...", textoLimpio);

      const { data, error } = await supabase
        .from("alcance_historial")
        .insert({
          proyecto_id: project.id,
          texto: textoLimpio,
        })
        .select();

      console.log("✅ Guardado:", data);
      console.log("❌ Error:", error);

      if (error) {
        console.error("Error guardando:", error);
        alert("Error al guardar: " + error.message);
        return;
      }

      setAlcance("");
      setSavedAlcance(true);
      setTimeout(() => setSavedAlcance(false), 2000);
      await cargarHistorialAlcance();

      console.log("✅ Texto guardado exitosamente");
    } catch (err) {
      console.error("Exception guardando:", err);
      alert("Error al guardar");
    } finally {
      setSavingAlcance(false);
    }
  }

  async function handleDeleteHistorial(id: string) {
    try {
      const { error } = await supabase.from("alcance_historial").delete().eq("id", id);
      if (error) {
        console.error("Error eliminando:", error);
        return;
      }
      setHistorialAlcance((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error("Exception eliminando historial:", err);
    }
  }

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

  // ── Kanban / CPM handlers ──

  async function handleMoveTask(taskId: string, newEstado: string) {
    try {
      await supabase.from("actividades_proyecto").update({ estado: newEstado }).eq("id", taskId);
      const updated = calcularRutaCritica(
        actividades.map((a) => (a.id === taskId ? { ...a, estado: newEstado } : a))
      );
      setActividades(updated);

      const total = updated.length;
      const done = updated.filter((a) => a.estado === "TERMINADO").length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      await supabase.from("proyectos_maestro").update({ porcentaje_avance: pct }).eq("id", project?.id);
    } catch (err) {
      console.error("Error moving task:", err);
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      await supabase.from("actividades_proyecto").delete().eq("id", taskId);
      const remaining = actividades.filter((a) => a.id !== taskId);
      const updated = calcularRutaCritica(remaining);
      setActividades(updated);

      const total = updated.length;
      const done = updated.filter((a) => a.estado === "TERMINADO").length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      await supabase.from("proyectos_maestro").update({ porcentaje_avance: pct }).eq("id", project?.id);
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  }

  async function handleGuardarActividad(data: any) {
    if (!project) return;
    try {
      const fechaFin = data.fecha_fin_estimada || (data.fecha_inicio_estimada
        ? sumarDias(data.fecha_inicio_estimada, data.duracion_dias || 1)
        : null);

      if (actividadEditando) {
        await supabase.from("actividades_proyecto").update({
          titulo: data.titulo,
          descripcion: data.descripcion || null,
          porcentaje: data.porcentaje,
          duracion_dias: data.duracion_dias,
          fecha_inicio_estimada: data.fecha_inicio_estimada || null,
          fecha_fin_estimada: fechaFin,
          predecesoras: data.predecesoras,
        }).eq("id", actividadEditando.id);
      } else {
        await supabase.from("actividades_proyecto").insert({
          proyecto_id: project.id,
          titulo: data.titulo,
          descripcion: data.descripcion || null,
          porcentaje: data.porcentaje,
          duracion_dias: data.duracion_dias,
          fecha_inicio_estimada: data.fecha_inicio_estimada || null,
          fecha_fin_estimada: fechaFin,
          predecesoras: data.predecesoras,
          estado: "PENDIENTE",
          orden: actividades.length,
        });
      }

      await fetchData();
      setMostrarModal(false);
      setActividadEditando(null);
    } catch (err) {
      console.error("Error saving activity:", err);
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

      <main className="mx-auto max-w-5xl px-8 py-8">
        {/* ─── TAB: Info ─── */}
        {activeTab === "info" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#86868B]">Avance general</span>
                <span className="text-2xl font-semibold text-[#1D1D1F]">{kanbanProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#F5F5F7]">
                <div className="h-full rounded-full bg-[#007AFF] transition-all duration-500" style={{ width: `${kanbanProgress}%` }} />
              </div>
              {actividades.length > 0 && (
                <p className="mt-2 text-[12px] text-[#86868B]">
                  {actividades.filter((a) => a.estado === "TERMINADO").length} de {actividades.length} actividades completadas
                </p>
              )}
            </div>

            {isFromFinanzas && (
              <div className="flex items-start gap-3 rounded-2xl border border-[#007AFF]/20 bg-[#007AFF]/5 p-4">
                <Lock className="mt-0.5 size-4 shrink-0 text-[#007AFF]" />
                <div>
                  <p className="text-[13px] font-medium text-[#1D1D1F]">Proyecto gestionado desde Finanzas</p>
                  <p className="mt-0.5 text-[12px] text-[#86868B]">Los datos principales son de solo lectura.</p>
                </div>
              </div>
            )}

            {isFromFinanzas ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard icon={User} label="Cliente" value={project.cliente_nombre || "—"} />
                <InfoCard icon={MapPin} label="Dirección" value={project.direccion || "—"} />
                <InfoCard icon={DollarSign} label="Presupuesto" value={project.presupuesto_total ? `$${project.presupuesto_total.toLocaleString("es-CO")}` : "—"} />
                <InfoCard icon={Calendar} label="Fecha inicio" value={formatDate(project.fecha_inicio)} />
                <InfoCard icon={Calendar} label="Fecha entrega" value={formatDate(project.fecha_entrega_estimada)} />
                <InfoCard icon={User} label="Residente" value={project.residente_asignado || "—"} />
              </div>
            ) : (
              <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[13px] text-[#86868B]">Cliente</Label>
                    <Input value={editForm.cliente_nombre} onChange={(e) => setEditForm((f) => ({ ...f, cliente_nombre: e.target.value }))} className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] text-[#86868B]">Dirección</Label>
                    <Input value={editForm.direccion} onChange={(e) => setEditForm((f) => ({ ...f, direccion: e.target.value }))} className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] text-[#86868B]">Presupuesto (COP)</Label>
                    <Input type="number" min="0" value={editForm.presupuesto_total} onChange={(e) => setEditForm((f) => ({ ...f, presupuesto_total: e.target.value }))} className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] text-[#86868B]">Fecha inicio</Label>
                    <Input type="date" value={editForm.fecha_inicio} onChange={(e) => setEditForm((f) => ({ ...f, fecha_inicio: e.target.value }))} className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] text-[#86868B]">Fecha entrega</Label>
                    <Input type="date" value={editForm.fecha_entrega_estimada} onChange={(e) => setEditForm((f) => ({ ...f, fecha_entrega_estimada: e.target.value }))} className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-[13px] text-[#86868B]">Residente asignado</Label>
                    <Input value={editForm.residente_asignado} onChange={(e) => setEditForm((f) => ({ ...f, residente_asignado: e.target.value }))} placeholder="Nombre del residente" className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10" />
                  </div>
                </div>
                <div className="flex items-center gap-3 border-t border-[#F5F5F7] pt-5">
                  <Button onClick={handleSaveInfo} disabled={savingInfo} className="rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]">
                    {savingInfo ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Guardar cambios
                  </Button>
                  {savedInfo && <span className="flex items-center gap-1.5 text-[13px] text-[#34C759]"><CheckCircle2 className="size-4" />Guardado</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: Alcance ─── */}
        {activeTab === "alcance" && (
          <div className="space-y-6">
            {/* Textarea para nuevo texto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alcance del proyecto
              </label>
              <textarea
                value={alcance}
                onChange={(e) => setAlcance(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={6}
                placeholder="Describe el alcance del proyecto: actividades incluidas, entregables, especificaciones técnicas..."
              />
            </div>

            {/* Boton guardar */}
            <Button
              onClick={handleSaveAlcance}
              disabled={savingAlcance || !alcance.trim()}
              className="rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
            >
              {savingAlcance ? "Guardando..." : "Guardar texto"}
            </Button>

            {/* Historial de textos */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Historial de alcance ({historialAlcance.length})
              </h3>
              {historialAlcance.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay registros de alcance todavia.</p>
              ) : (
                <div className="space-y-3">
                  {historialAlcance.map((registro) => (
                    <div
                      key={registro.id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-xs font-medium text-gray-600">
                            {new Date(registro.created_at).toLocaleString("es-CO", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <button
                          onClick={async () => {
                            if (confirm("Eliminar este registro?")) {
                              await handleDeleteHistorial(registro.id);
                            }
                          }}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {registro.texto}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

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

        {/* ─── TAB: Programación (Kanban + CPM) ─── */}
        {activeTab === "programacion" && (
          <div className="space-y-6">
            {/* Progress bar */}
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

            {/* Add new task button */}
            <div className="flex justify-end">
              <Button
                onClick={() => { setActividadEditando(null); setMostrarModal(true); }}
                className="rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
              >
                <Plus className="size-4" />
                Nueva Actividad
              </Button>
            </div>

            {/* Kanban columns */}
            <div className="grid gap-4 md:grid-cols-3">
              {KANBAN_COLUMNS.map((col) => {
                const tasks = actividades.filter((a) => a.estado === col.key);
                return (
                  <div key={col.key} className={cn("rounded-2xl border-2 bg-white", col.color)}>
                    <div className={cn("rounded-t-xl px-4 py-3", col.headerBg)}>
                      <div className="flex items-center justify-between">
                        <h4 className={cn("text-[13px] font-semibold", col.headerText)}>{col.label}</h4>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", col.headerBg, col.headerText)}>
                          {tasks.length}
                        </span>
                      </div>
                    </div>
                    <div className="min-h-[120px] space-y-3 p-3">
                      {tasks.map((task) => (
                        <ActividadCard
                          key={task.id}
                          actividad={task}
                          onMoverEstado={handleMoveTask}
                          onEditar={(act) => { setActividadEditando(act); setMostrarModal(true); }}
                          onEliminar={handleDeleteTask}
                        />
                      ))}
                      {tasks.length === 0 && (
                        <p className="py-6 text-center text-[12px] text-[#C7C7CC]">Sin actividades</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      {mostrarModal && (
        <ActividadModal
          actividad={actividadEditando}
          actividadesDisponibles={actividades.filter((a) => a.id !== actividadEditando?.id)}
          onGuardar={handleGuardarActividad}
          onCerrar={() => { setMostrarModal(false); setActividadEditando(null); }}
        />
      )}
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
