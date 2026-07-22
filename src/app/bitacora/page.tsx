"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import {
  BookOpen,
  Plus,
  X,
  Pencil,
  Trash2,
  Calendar,
  PlayCircle,
  Link2,
  Share2,
  Check,
  ArrowUp,
  ArrowDown,
  Circle,
  CheckCircle2,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ProyectoCombobox, type Proyecto } from "@/components/proyecto-combobox";

const BUCKET = "alcance-imagenes";

interface Foto {
  id: string;
  foto_url: string;
  orden: number;
}

interface Entrada {
  id: string;
  proyecto_id: string;
  fecha: string;
  titulo: string;
  descripcion: string | null;
  video_url: string | null;
  fotos: Foto[];
}

interface Tarea {
  id: string;
  proyecto_id: string;
  descripcion: string;
  hecha: boolean;
  orden: number;
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function BitacoraPage() {
  const supabase = getSupabaseClient();

  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [proyectoId, setProyectoId] = useState("");
  const [loadingProyectos, setLoadingProyectos] = useState(true);

  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loadingDatos, setLoadingDatos] = useState(false);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Entrada | null>(null);

  const [compartiendo, setCompartiendo] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    void cargarProyectos();
  }, []);

  useEffect(() => {
    if (proyectoId) void cargarDatosProyecto(proyectoId);
    else {
      setEntradas([]);
      setTareas([]);
    }
  }, [proyectoId]);

  async function cargarProyectos() {
    setLoadingProyectos(true);
    const { data } = await supabase
      .from("proyectos_maestro")
      .select("id, cliente_nombre")
      .order("cliente_nombre");
    if (data) setProyectos(data as Proyecto[]);
    setLoadingProyectos(false);
  }

  async function cargarDatosProyecto(id: string) {
    setLoadingDatos(true);
    const [entradasRes, tareasRes] = await Promise.all([
      supabase
        .from("bitacora_entradas")
        .select("id, proyecto_id, fecha, titulo, descripcion, video_url, bitacora_fotos(id, foto_url, orden)")
        .eq("proyecto_id", id)
        .order("fecha", { ascending: false }),
      supabase
        .from("bitacora_tareas")
        .select("*")
        .eq("proyecto_id", id)
        .order("orden", { ascending: true }),
    ]);

    if (entradasRes.data) {
      setEntradas(
        (entradasRes.data as Array<Omit<Entrada, "fotos"> & { bitacora_fotos: Foto[] }>).map((e) => ({
          id: e.id,
          proyecto_id: e.proyecto_id,
          fecha: e.fecha,
          titulo: e.titulo,
          descripcion: e.descripcion,
          video_url: e.video_url,
          fotos: [...(e.bitacora_fotos ?? [])].sort((a: Foto, b: Foto) => a.orden - b.orden),
        }))
      );
    }
    if (tareasRes.data) setTareas(tareasRes.data as Tarea[]);
    setLoadingDatos(false);
  }

  // ── Compartir ─────────────────────────────────────────────────────────

  async function compartirObra() {
    if (!proyectoId) return;
    setCompartiendo(true);
    try {
      let token: string;
      const { data: existente } = await supabase
        .from("bitacora_compartidos")
        .select("token")
        .eq("proyecto_id", proyectoId)
        .maybeSingle();

      if (existente) {
        token = existente.token;
      } else {
        const { data: creado, error } = await supabase
          .from("bitacora_compartidos")
          .insert({ proyecto_id: proyectoId })
          .select("token")
          .single();
        if (error || !creado) throw error ?? new Error("No se pudo crear el link");
        token = creado.token;
      }

      const url = `${window.location.origin}/obra/${token}`;
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);

      const proyecto = proyectos.find((p) => p.id === proyectoId);
      const msg = encodeURIComponent(
        `Hola${proyecto?.cliente_nombre ? " " + proyecto.cliente_nombre : ""}, te comparto los avances de tu obra: ${url}`
      );
      window.open(`https://wa.me/?text=${msg}`, "_blank");
    } catch (err) {
      const message = err instanceof Error ? err.message : "desconocido";
      alert("Error al generar el link: " + message);
    } finally {
      setCompartiendo(false);
    }
  }

  // ── Avances ───────────────────────────────────────────────────────────

  function abrirNuevoAvance() {
    setEditando(null);
    setMostrarForm(true);
  }

  function abrirEditarAvance(entrada: Entrada) {
    setEditando(entrada);
    setMostrarForm(true);
  }

  async function eliminarAvance(entrada: Entrada) {
    if (!window.confirm(`¿Eliminar el avance "${entrada.titulo}"?`)) return;
    if (entrada.fotos.length > 0) {
      const paths = entrada.fotos.map((f) => pathFromPublicUrl(f.foto_url)).filter(Boolean) as string[];
      if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);
    }
    const { error } = await supabase.from("bitacora_entradas").delete().eq("id", entrada.id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    setEntradas((prev) => prev.filter((e) => e.id !== entrada.id));
  }

  function pathFromPublicUrl(url: string): string | null {
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.slice(idx + marker.length);
  }

  // ── Por Hacer ─────────────────────────────────────────────────────────

  const [nuevaTarea, setNuevaTarea] = useState("");
  const [guardandoTarea, setGuardandoTarea] = useState(false);
  const [editandoTareaId, setEditandoTareaId] = useState<string | null>(null);
  const [textoEdicion, setTextoEdicion] = useState("");

  async function agregarTarea() {
    if (!nuevaTarea.trim() || !proyectoId) return;
    setGuardandoTarea(true);
    const orden = tareas.length > 0 ? Math.max(...tareas.map((t) => t.orden)) + 1 : 0;
    const { data, error } = await supabase
      .from("bitacora_tareas")
      .insert({ proyecto_id: proyectoId, descripcion: nuevaTarea.trim(), orden })
      .select()
      .single();
    setGuardandoTarea(false);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    setTareas((prev) => [...prev, data as Tarea]);
    setNuevaTarea("");
  }

  async function toggleTarea(tarea: Tarea) {
    setTareas((prev) => prev.map((t) => (t.id === tarea.id ? { ...t, hecha: !t.hecha } : t)));
    const { error } = await supabase
      .from("bitacora_tareas")
      .update({ hecha: !tarea.hecha })
      .eq("id", tarea.id);
    if (error) {
      setTareas((prev) => prev.map((t) => (t.id === tarea.id ? { ...t, hecha: tarea.hecha } : t)));
      alert("Error: " + error.message);
    }
  }

  function iniciarEdicionTarea(tarea: Tarea) {
    setEditandoTareaId(tarea.id);
    setTextoEdicion(tarea.descripcion);
  }

  async function guardarEdicionTarea(tarea: Tarea) {
    const texto = textoEdicion.trim();
    setEditandoTareaId(null);
    if (!texto || texto === tarea.descripcion) return;
    setTareas((prev) => prev.map((t) => (t.id === tarea.id ? { ...t, descripcion: texto } : t)));
    const { error } = await supabase
      .from("bitacora_tareas")
      .update({ descripcion: texto })
      .eq("id", tarea.id);
    if (error) alert("Error: " + error.message);
  }

  async function eliminarTarea(tarea: Tarea) {
    if (!window.confirm(`¿Eliminar "${tarea.descripcion}"?`)) return;
    const { error } = await supabase.from("bitacora_tareas").delete().eq("id", tarea.id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    setTareas((prev) => prev.filter((t) => t.id !== tarea.id));
  }

  async function moverTarea(tarea: Tarea, direccion: -1 | 1) {
    const idx = tareas.findIndex((t) => t.id === tarea.id);
    const vecino = tareas[idx + direccion];
    if (!vecino) return;

    const nuevas = [...tareas];
    [nuevas[idx], nuevas[idx + direccion]] = [nuevas[idx + direccion]!, nuevas[idx]!];
    setTareas(nuevas);

    await Promise.all([
      supabase.from("bitacora_tareas").update({ orden: vecino.orden }).eq("id", tarea.id),
      supabase.from("bitacora_tareas").update({ orden: tarea.orden }).eq("id", vecino.id),
    ]);
  }

  const pendientes = tareas.filter((t) => !t.hecha).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="size-6 text-blue-600" />
            Bitácora
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Registro de avances y pendientes por proyecto
          </p>
        </div>
      </div>

      {/* Selector de proyecto */}
      <div className="mb-5">
        <ProyectoCombobox
          value={proyectoId}
          onChange={setProyectoId}
          proyectos={proyectos}
          placeholder={loadingProyectos ? "Cargando proyectos..." : "Selecciona un proyecto"}
          className="w-full sm:max-w-sm"
        />
      </div>

      {!proyectoId ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          Selecciona un proyecto para ver su bitácora.
        </div>
      ) : (
        <Tabs defaultValue="avances">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <TabsList>
              <TabsTrigger value="avances">Avances</TabsTrigger>
              <TabsTrigger value="tareas">
                Por Hacer{pendientes > 0 ? ` (${pendientes})` : ""}
              </TabsTrigger>
            </TabsList>

            <Button
              variant="outline"
              onClick={() => void compartirObra()}
              disabled={compartiendo}
              className="h-9"
            >
              {compartiendo ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : copiado ? (
                <Check className="size-4 mr-1 text-green-600" />
              ) : (
                <Share2 className="size-4 mr-1" />
              )}
              {copiado ? "Link copiado" : "Compartir al cliente"}
            </Button>
          </div>

          {/* ── AVANCES ── */}
          <TabsContent value="avances">
            <div className="flex justify-end mb-3">
              <Button onClick={abrirNuevoAvance} className="h-11 sm:h-9">
                <Plus className="size-4 mr-1" />
                Nuevo avance
              </Button>
            </div>

            {loadingDatos ? (
              <div className="flex justify-center py-16 text-gray-400 text-sm">Cargando...</div>
            ) : entradas.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                Sin avances registrados. Agrega el primero con el botón de arriba.
              </div>
            ) : (
              <div className="space-y-4">
                {entradas.map((entrada) => (
                  <EntradaCard
                    key={entrada.id}
                    entrada={entrada}
                    onEditar={() => abrirEditarAvance(entrada)}
                    onEliminar={() => void eliminarAvance(entrada)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── POR HACER ── */}
          <TabsContent value="tareas">
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {tareas.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">
                  Sin tareas registradas.
                </div>
              ) : (
                tareas.map((tarea, i) => (
                  <div
                    key={tarea.id}
                    className={cn(
                      "flex items-center gap-1.5 border-b border-gray-100 pl-1.5 pr-1.5 last:border-b-0",
                      tarea.hecha && "bg-green-50/30"
                    )}
                  >
                    <button
                      onClick={() => void toggleTarea(tarea)}
                      title={tarea.hecha ? "Marcar como pendiente" : "Marcar como hecha"}
                      className="flex size-11 shrink-0 items-center justify-center rounded-lg active:bg-gray-100"
                    >
                      {tarea.hecha ? (
                        <CheckCircle2 className="size-5 text-green-500" />
                      ) : (
                        <Circle className="size-5 text-gray-300" />
                      )}
                    </button>

                    {editandoTareaId === tarea.id ? (
                      <input
                        autoFocus
                        value={textoEdicion}
                        onChange={(e) => setTextoEdicion(e.target.value)}
                        onBlur={() => void guardarEdicionTarea(tarea)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void guardarEdicionTarea(tarea);
                          if (e.key === "Escape") setEditandoTareaId(null);
                        }}
                        className="h-9 flex-1 min-w-0 rounded-lg border border-blue-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span
                        onClick={() => iniciarEdicionTarea(tarea)}
                        className={cn(
                          "flex-1 min-w-0 truncate text-sm cursor-text py-3",
                          tarea.hecha ? "text-gray-400 line-through" : "text-gray-900"
                        )}
                      >
                        {tarea.descripcion}
                      </span>
                    )}

                    <div className="flex shrink-0 items-center">
                      <button
                        onClick={() => void moverTarea(tarea, -1)}
                        disabled={i === 0}
                        title="Subir"
                        className="flex size-7 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        onClick={() => void moverTarea(tarea, 1)}
                        disabled={i === tareas.length - 1}
                        title="Bajar"
                        className="flex size-7 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                      <button
                        onClick={() => iniciarEdicionTarea(tarea)}
                        title="Editar"
                        className="flex size-7 items-center justify-center rounded-lg text-gray-300 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        onClick={() => void eliminarTarea(tarea)}
                        title="Eliminar"
                        className="flex size-7 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Agregar tarea */}
            <div className="mt-3 flex gap-2">
              <input
                value={nuevaTarea}
                onChange={(e) => setNuevaTarea(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void agregarTarea()}
                placeholder="Nueva tarea..."
                className="h-11 flex-1 rounded-lg border border-gray-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:h-10"
              />
              <Button
                onClick={() => void agregarTarea()}
                disabled={guardandoTarea || !nuevaTarea.trim()}
                className="h-11 sm:h-10"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {mostrarForm && (
        <AvanceModal
          proyectoId={proyectoId}
          entrada={editando}
          onClose={() => setMostrarForm(false)}
          onSaved={async () => {
            setMostrarForm(false);
            await cargarDatosProyecto(proyectoId);
          }}
        />
      )}
    </div>
  );
}

// ─── Card de entrada del feed ───────────────────────────────────────────────

function EntradaCard({
  entrada,
  onEditar,
  onEliminar,
}: {
  entrada: Entrada;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="size-3.5" />
          {new Date(entrada.fecha).toLocaleDateString("es-CO", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
        <div className="flex shrink-0 items-center">
          <button
            onClick={onEditar}
            title="Editar"
            className="flex size-8 items-center justify-center rounded-lg text-gray-300 hover:bg-blue-50 hover:text-blue-600"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={onEliminar}
            title="Eliminar"
            className="flex size-8 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <h3 className="text-base font-semibold text-gray-900 mb-1.5">{entrada.titulo}</h3>

      {entrada.descripcion && (
        <p className="text-sm text-gray-600 whitespace-pre-wrap mb-3">{entrada.descripcion}</p>
      )}

      {entrada.fotos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 mb-3">
          {entrada.fotos.map((foto) => (
            <a key={foto.id} href={foto.foto_url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto.foto_url}
                alt={entrada.titulo}
                className="aspect-square w-full rounded-lg object-cover"
              />
            </a>
          ))}
        </div>
      )}

      {entrada.video_url && (
        <a
          href={entrada.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
        >
          <PlayCircle className="size-4" />
          Ver video
        </a>
      )}
    </div>
  );
}

// ─── Modal: nuevo / editar avance ───────────────────────────────────────────

function AvanceModal({
  proyectoId,
  entrada,
  onClose,
  onSaved,
}: {
  proyectoId: string;
  entrada: Entrada | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = getSupabaseClient();
  const [titulo, setTitulo] = useState(entrada?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(entrada?.descripcion ?? "");
  const [videoUrl, setVideoUrl] = useState(entrada?.video_url ?? "");
  const [fotosExistentes, setFotosExistentes] = useState<Foto[]>(entrada?.fotos ?? []);
  const [fotosNuevas, setFotosNuevas] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  function pathFromPublicUrl(url: string): string | null {
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.slice(idx + marker.length);
  }

  async function eliminarFotoExistente(foto: Foto) {
    const path = pathFromPublicUrl(foto.foto_url);
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    await supabase.from("bitacora_fotos").delete().eq("id", foto.id);
    setFotosExistentes((prev) => prev.filter((f) => f.id !== foto.id));
  }

  function agregarFotosNuevas(files: FileList | null) {
    if (!files) return;
    setFotosNuevas((prev) => [...prev, ...Array.from(files)]);
  }

  function quitarFotoNueva(idx: number) {
    setFotosNuevas((prev) => prev.filter((_, i) => i !== idx));
  }

  async function subirFotos(entradaId: string, ordenInicial: number) {
    let orden = ordenInicial;
    for (const file of fotosNuevas) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `bitacora/${entradaId}/${Date.now()}-${orden}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (uploadError) {
        console.error("Error subiendo foto:", uploadError);
        continue;
      }
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      await supabase.from("bitacora_fotos").insert({
        entrada_id: entradaId,
        foto_url: urlData.publicUrl,
        orden,
      });
      orden++;
    }
  }

  async function guardar() {
    if (!titulo.trim() || !proyectoId) return;
    setSaving(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        video_url: videoUrl.trim() || null,
      };

      if (entrada) {
        const { error } = await supabase.from("bitacora_entradas").update(payload).eq("id", entrada.id);
        if (error) throw error;
        await subirFotos(entrada.id, fotosExistentes.length);
      } else {
        const { data: creada, error } = await supabase
          .from("bitacora_entradas")
          .insert({ ...payload, proyecto_id: proyectoId })
          .select()
          .single();
        if (error || !creada) throw error ?? new Error("No se pudo crear el avance");
        await subirFotos(creada.id, 0);
      }

      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "desconocido";
      alert("Error: " + message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-6 sm:pb-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {entrada ? "Editar avance" : "Nuevo avance"}
          </h2>
          <button
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-lg text-gray-400 active:bg-gray-100 sm:size-8 sm:hover:text-gray-600"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="ej. Instalación de drywall - Apto 302"
              className="h-11 w-full rounded-lg border border-gray-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalles del avance..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Link2 className="size-3.5" /> Link de video (opcional)
            </label>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://drive.google.com/... o YouTube"
              className="h-11 w-full rounded-lg border border-gray-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Fotos</label>

            {(fotosExistentes.length > 0 || fotosNuevas.length > 0) && (
              <div className="mb-2 grid grid-cols-4 gap-1.5">
                {fotosExistentes.map((foto) => (
                  <div key={foto.id} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={foto.foto_url} alt="" className="aspect-square w-full rounded-lg object-cover" />
                    <button
                      onClick={() => void eliminarFotoExistente(foto)}
                      className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-red-500 text-white shadow"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                {fotosNuevas.map((file, i) => (
                  <div key={i} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(file)} alt="" className="aspect-square w-full rounded-lg object-cover" />
                    <button
                      onClick={() => quitarFotoNueva(i)}
                      className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-red-500 text-white shadow"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50">
              <ImagePlus className="size-4" />
              Agregar fotos
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={(e) => agregarFotosNuevas(e.target.files)}
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} className="h-12 w-full sm:h-9 sm:w-auto">
            Cancelar
          </Button>
          <Button
            onClick={() => void guardar()}
            disabled={saving || !titulo.trim()}
            className="h-12 w-full sm:h-9 sm:w-auto"
          >
            {saving ? "Guardando..." : entrada ? "Guardar cambios" : "Publicar avance"}
          </Button>
        </div>
      </div>
    </div>
  );
}
