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
  Pencil,
  FileText,
  FileCheck,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { UploadEvidenciaModal } from "@/components/proyecto/UploadEvidenciaModal";
import { UploadReferenciaModal } from "@/components/proyecto/UploadReferenciaModal";
import { ImageLightbox } from "@/components/proyecto/ImageLightbox";
import { EditarProyectoModal } from "@/components/proyecto/EditarProyectoModal";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Tipos para lista_actividades (Alcance Cerrado)
interface ActividadAlcance {
  id: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  completado: boolean;
  evidencia_url?: string | null;
}

// Tipos para checklist_calidad
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
  const [editarModal, setEditarModal] = useState(false);

  useEffect(() => {
    async function fetchProject() {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("hoja_vida_proyecto")
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
      .from("hoja_vida_proyecto")
      .update({ lista_actividades: updated })
      .eq("id", id);
  }

  async function toggleActividadCompletado(actividadId: string, checked: boolean) {
    if (!project) return;
    const act = project.lista_actividades.find((a) => a.id === actividadId);
    if (!act) return;
    if (checked && !act.evidencia_url) return; // Solo marcar si hay evidencia

    const updated = project.lista_actividades.map((a) =>
      a.id === actividadId ? { ...a, completado: checked } : a
    );
    setProject({ ...project, lista_actividades: updated });

    const supabase = getSupabase();
    await supabase
      .from("hoja_vida_proyecto")
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
      .from("hoja_vida_proyecto")
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
      .from("hoja_vida_proyecto")
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
      .from("hoja_vida_proyecto")
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
      .from("hoja_vida_proyecto")
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
      .from("hoja_vida_proyecto")
      .update({ [key]: updated })
      .eq("id", id);
  }

  function handleReferenciaUpload(url: string, tipo: "plano" | "render") {
    addImagenReferencia(tipo === "plano" ? "planos" : "renders", url);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-12 animate-spin text-blue-600" />
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

  const todasImagenes = [
    ...project.planos_url.map((url) => ({ url, tipo: "Plano" })),
    ...project.renders_url.map((url) => ({ url, tipo: "Render" })),
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-blue-500/20 bg-white">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold text-foreground">
              {project.cliente_nombre || "Proyecto"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-medium",
                project.estado === "ACTIVO" && "bg-emerald-100 text-emerald-700 border-emerald-200",
                project.estado === "EN_PAUSA" && "bg-amber-100 text-amber-700 border-amber-200",
                project.estado === "TERMINADO" && "bg-gray-100 text-gray-600 border-gray-200"
              )}
            >
              {project.estado === "ACTIVO" ? "Activo" : project.estado === "EN_PAUSA" ? "Pausado" : "Finalizado"}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-blue-500/40"
              onClick={() => setEditarModal(true)}
            >
              <Pencil className="size-4" />
              Editar
            </Button>
            <Button variant="outline" size="sm" className="border-blue-500/40" asChild>
              <Link href={`/bitacora/${project.id}`}>
                <Calendar className="size-4" />
                Bitácora
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="border-blue-500/40" asChild>
              <Link href={`/programacion/${project.id}`}>
                Gantt
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <Tabs defaultValue="informacion" className="space-y-6">
          <TabsList variant="line" className="h-auto w-full justify-start gap-1 border-b border-gray-200 bg-transparent p-0">
            <TabsTrigger
              value="informacion"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
            >
              Información
            </TabsTrigger>
            <TabsTrigger
              value="contrato"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
            >
              Contrato
            </TabsTrigger>
            <TabsTrigger
              value="bitacora"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
            >
              Bitácora
            </TabsTrigger>
            <TabsTrigger
              value="pedidos"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
            >
              Pedidos
            </TabsTrigger>
            <TabsTrigger
              value="programacion"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
            >
              Programación
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Información (Alcance, Referencias, Calidad) */}
          <TabsContent value="informacion" className="mt-6">
            <div className="rounded-xl border border-blue-500/30 bg-card p-6 shadow-lg">
              {project.lista_actividades.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Actividades pendientes por definir
                </p>
              ) : (
                <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-blue-600">
                  Actividades contratadas
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-500/40 text-blue-600 hover:bg-blue-600/10"
                  onClick={addActividadAlcance}
                >
                  <Plus className="size-4" />
                  Añadir actividad
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-muted-foreground">
                      <th className="pb-3 pr-4">Completado</th>
                      <th className="pb-3 pr-4">Descripción</th>
                      <th className="pb-3 pr-4">Unidad</th>
                      <th className="pb-3 pr-4">Cantidad</th>
                      <th className="pb-3">Evidencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.lista_actividades.map((act) => (
                      <tr
                        key={act.id}
                        className="border-b border-white/5 transition-colors hover:bg-white/5"
                      >
                        <td className="py-3 pr-4">
                          <Checkbox
                            checked={act.completado}
                            onCheckedChange={(checked) =>
                              toggleActividadCompletado(act.id, checked === true)
                            }
                            disabled={!act.evidencia_url}
                            className="border-blue-500/50 data-[state=checked]:bg-blue-600"
                          />
                        </td>
                        <td className="py-3 pr-4 font-medium">{act.descripcion}</td>
                        <td className="py-3 pr-4">{act.unidad}</td>
                        <td className="py-3 pr-4">{act.cantidad}</td>
                        <td className="py-3">
                          {act.evidencia_url ? (
                            <a
                              href={act.evidencia_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Ver foto
                            </a>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-500/40 text-blue-600 hover:bg-blue-600/10"
                              onClick={() =>
                                setUploadModal({
                                  open: true,
                                  tipo: "actividad",
                                  actividadId: act.id,
                                })
                              }
                            >
                              <Upload className="size-3.5" />
                              Subir Evidencia
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

            {/* Referencias Visuales */}
            <div className="rounded-xl border border-blue-500/30 bg-card p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold text-blue-600">
                Referencias Visuales
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {todasImagenes.map(({ url, tipo }) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setLightbox({ open: true, src: url })}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-blue-500/20 bg-gray-100 shadow-md transition-all hover:shadow-md"
                  >
                    <img
                      src={url}
                      alt={tipo}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <span className="absolute bottom-0 left-0 right-0 bg-gray-800/80 px-2 py-1 text-xs text-blue-600">
                      {tipo}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setReferenciaModal(true)}
                  className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-blue-500/40 bg-gray-50 transition-colors hover:border-blue-500/60 hover:bg-gray-50"
                >
                  <ImageIcon className="size-10 text-blue-600/60" />
                  <span className="sr-only">Subir imagen</span>
                </button>
              </div>
              {todasImagenes.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                  No hay planos ni renders. Sube imágenes para comenzar.
                </p>
              )}
            </div>

            {/* Control de Calidad */}
            <div className="rounded-xl border border-blue-500/30 bg-card p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-blue-600">
                  Checklist de calidad
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-500/40 text-blue-600 hover:bg-blue-600/10"
                  onClick={addItemCalidad}
                >
                  <Plus className="size-4" />
                  Añadir ítem
                </Button>
              </div>
              <div className="space-y-4">
                {project.checklist_calidad.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-blue-500/20 bg-gray-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={item.terminado}
                          onCheckedChange={(checked) =>
                            toggleCalidadTerminado(item.id, checked === true)
                          }
                          disabled={item.evidencias.length === 0}
                          className="border-blue-500/50 data-[state=checked]:bg-blue-600"
                        />
                        <span
                          className={cn(
                            "font-medium",
                            item.terminado && "text-muted-foreground line-through"
                          )}
                        >
                          {item.descripcion}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 border-blue-500/40 text-blue-600 hover:bg-blue-600/10"
                        onClick={() =>
                          setUploadModal({
                            open: true,
                            tipo: "calidad",
                            itemCalidadId: item.id,
                          })
                        }
                      >
                        <Upload className="size-3.5" />
                        Subir evidencia
                      </Button>
                    </div>
                    {item.evidencias.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Historial de evidencias
                        </p>
                        {item.evidencias.map((ev, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm"
                          >
                            <a
                              href={ev.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Evidencia {idx + 1}
                            </a>
                            <span className="text-muted-foreground">
                              {format(new Date(ev.fecha), "d MMM yyyy", {
                                locale: es,
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {project.checklist_calidad.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                  No hay ítems en el checklist. Añade uno para comenzar.
                </p>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: Contrato */}
          <TabsContent value="contrato" className="mt-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#2D3748]">
                <FileCheck className="size-5 text-blue-600" />
                Analizar Contrato con IA
              </h2>
              <p className="mb-4 text-muted-foreground">
                Sube un PDF o DOCX del contrato para extraer automáticamente cliente, presupuesto, fechas y alcance.
              </p>
              <Button className="bg-blue-600 text-white hover:bg-blue-700" asChild>
                <Link href={`/proyecto/${project.id}/contrato`}>
                  <FileText className="size-4" />
                  Ir a Analizar Contrato
                </Link>
              </Button>
            </div>
          </TabsContent>

          {/* TAB 3: Bitácora */}
          <TabsContent value="bitacora" className="mt-6">
            <div className="rounded-xl border border-blue-500/30 bg-card p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold text-blue-600">
                Bitácora Diaria
              </h2>
              <p className="mb-4 text-muted-foreground">
                Registra las novedades del día, personal y fotos de avance.
              </p>
              <Button className="bg-blue-600 text-white text-black hover:opacity-90" asChild>
                <Link href={`/bitacora/${project.id}`}>
                  <Calendar className="size-4" />
                  Ir a Bitácora
                </Link>
              </Button>
            </div>
          </TabsContent>

          {/* TAB 4: Pedidos */}
          <TabsContent value="pedidos" className="mt-6">
            <div className="rounded-xl border border-blue-500/30 bg-card p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold text-blue-600">
                Pedidos de Material
              </h2>
              <p className="mb-4 text-muted-foreground">
                Solicita materiales para este proyecto.
              </p>
              <Button className="bg-blue-600 text-white text-black hover:opacity-90" asChild>
                <Link href={`/pedidos/nuevo?proyecto=${project.id}`}>
                  Nuevo Pedido
                </Link>
              </Button>
            </div>
          </TabsContent>

          {/* TAB 5: Programación */}
          <TabsContent value="programacion" className="mt-6">
            <div className="rounded-xl border border-blue-500/30 bg-card p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold text-blue-600">
                Gantt de Programación
              </h2>
              <p className="mb-4 text-muted-foreground">
                Visualiza el cronograma y avance de actividades.
              </p>
              <Button className="bg-blue-600 text-white text-black hover:opacity-90" asChild>
                <Link href={`/programacion/${project.id}`}>
                  Ver Gantt
                </Link>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modales */}
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

      <EditarProyectoModal
        open={editarModal}
        onOpenChange={setEditarModal}
        proyectoId={id}
        datosIniciales={{
          cliente_nombre: project.cliente_nombre,
          direccion: project.direccion,
          presupuesto_total: project.presupuesto_total,
          fecha_inicio: project.fecha_inicio,
          fecha_entrega_estimada: project.fecha_entrega_estimada,
          margen_objetivo: project.margen_objetivo,
          residente_asignado: project.residente_asignado,
          estado: project.estado,
        }}
        onSuccess={async () => {
          if (id) {
            const supabase = getSupabase();
            const { data } = await supabase
              .from("hoja_vida_proyecto")
              .select("*")
              .eq("id", id)
              .single();
            if (data) {
              const row = data as Record<string, unknown>;
              setProject((p) =>
                p
                  ? {
                      ...p,
                      cliente_nombre: (row.cliente_nombre as string) ?? null,
                      direccion: (row.direccion as string) ?? null,
                      presupuesto_total: (row.presupuesto_total as number) ?? null,
                      fecha_inicio: (row.fecha_inicio as string) ?? null,
                      fecha_entrega_estimada: (row.fecha_entrega_estimada as string) ?? null,
                      margen_objetivo: (row.margen_objetivo as number) ?? null,
                      residente_asignado: (row.residente_asignado as string) ?? null,
                      estado: (row.estado as string) ?? null,
                    }
                  : null
              );
            }
          }
        }}
      />
    </div>
  );
}
