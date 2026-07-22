"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import {
  BookOpen,
  Plus,
  X,
  Pencil,
  Trash2,
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
  proyecto_nombre: string;
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
// Lista global de avances (mismo patrón que /compras): no obliga a elegir
// proyecto para ver o registrar. El filtro de proyecto es opcional y solo
// habilita "Compartir al cliente" y la pestaña "Por Hacer", que sí son
// por-proyecto.

export default function BitacoraPage() {
  const supabase = getSupabaseClient();

  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroProyecto, setFiltroProyecto] = useState("TODOS");

  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loadingTareas, setLoadingTareas] = useState(false);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Entrada | null>(null);

  const [compartiendo, setCompartiendo] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    void cargar();
  }, []);

  useEffect(() => {
    if (filtroProyecto !== "TODOS") void cargarTareas(filtroProyecto);
    else setTareas([]);
  }, [filtroProyecto]);

  async function cargar() {
    setLoading(true);
    const [entradasRes, proyRes] = await Promise.all([
      supabase
        .from("bitacora_entradas")
        .select("id, proyecto_id, fecha, titulo, descripcion, video_url, bitacora_fotos(id, foto_url, orden)")
        .order("fecha", { ascending: false }),
      supabase.from("proyectos_maestro").select("id, cliente_nombre").order("cliente_nombre"),
    ]);

    const projMap = new Map<string, string>();
    if (proyRes.data) {
      setProyectos(proyRes.data as Proyecto[]);
      (proyRes.data as Proyecto[]).forEach((p) => projMap.set(p.id, p.cliente_nombre ?? "Sin nombre"));
    }

    if (entradasRes.data) {
      setEntradas(
        (entradasRes.data as Array<Omit<Entrada, "fotos" | "proyecto_nombre"> & { bitacora_fotos: Foto[] }>).map(
          (e) => ({
            id: e.id,
            proyecto_id: e.proyecto_id,
            proyecto_nombre: projMap.get(e.proyecto_id) ?? "Proyecto desconocido",
            fecha: e.fecha,
            titulo: e.titulo,
            descripcion: e.descripcion,
            video_url: e.video_url,
            fotos: [...(e.bitacora_fotos ?? [])].sort((a: Foto, b: Foto) => a.orden - b.orden),
          })
        )
      );
    }
    setLoading(false);
  }

  async function cargarTareas(proyectoId: string) {
    setLoadingTareas(true);
    const { data } = await supabase
      .from("bitacora_tareas")
      .select("*")
      .eq("proyecto_id", proyectoId)
      .order("orden", { ascending: true });
    if (data) setTareas(data as Tarea[]);
    setLoadingTareas(false);
  }

  const entradasFiltradas =
    filtroProyecto === "TODOS" ? entradas : entradas.filter((e) => e.proyecto_id === filtroProyecto);

  // ── Compartir ─────────────────────────────────────────────────────────

  async function compartirObra() {
    if (filtroProyecto === "TODOS") return;
    setCompartiendo(true);
    try {
      let token: string;
      const { data: existente } = await supabase
        .from("bitacora_compartidos")
        .select("token")
        .eq("proyecto_id", filtroProyecto)
        .maybeSingle();

      if (existente) {
        token = existente.token;
      } else {
        const { data: creado, error } = await supabase
          .from("bitacora_compartidos")
          .insert({ proyecto_id: filtroProyecto })
          .select("token")
          .single();
        if (error || !creado) throw error ?? new Error("No se pudo crear el link");
        token = creado.token;
      }

      const url = `${window.location.origin}/obra/${token}`;
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);

      const proyecto = proyectos.find((p) => p.id === filtroProyecto);
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
    if (!nuevaTarea.trim() || filtroProyecto === "TODOS") return;
    setGuardandoTarea(true);
    const orden = tareas.length > 0 ? Math.max(...tareas.map((t) => t.orden)) + 1 : 0;
    const { data, error } = await supabase
      .from("bitacora_tareas")
      .insert({ proyecto_id: filtroProyecto, descripcion: nuevaTarea.trim(), orden })
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
  const proyectoSeleccionado = filtroProyecto !== "TODOS";

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
            Avances de obra · todos los proyectos
          </p>
        </div>
        <Button onClick={abrirNuevoAvance} className="h-11 sm:h-9">
          <Plus className="size-4 mr-1" />
          Nuevo avance
        </Button>
      </div>

      {/* Filtro por proyecto + compartir */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <ProyectoCombobox
          value={filtroProyecto}
          onChange={setFiltroProyecto}
          proyectos={proyectos}
          incluirTodos
          placeholder="Todos los proyectos"
          className="w-full sm:w-auto sm:min-w-[220px]"
        />

        {proyectoSeleccionado && (
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
        )}
      </div>

      {proyectoSeleccionado ? (
        // ── Proyecto filtrado: habilita "Por Hacer" además de Avances ──
        <Tabs defaultValue="avances" key={filtroProyecto}>
          <TabsList className="mb-4">
            <TabsTrigger value="avances">Avances</TabsTrigger>
            <TabsTrigger value="tareas">
              Por Hacer{pendientes > 0 ? ` (${pendientes})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="avances">
            <ListaAvances
              entradas={entradasFiltradas}
              loading={loading}
              onEditar={abrirEditarAvance}
              onEliminar={(e) => void eliminarAvance(e)}
            />
          </TabsContent>

          <TabsContent value="tareas">
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {loadingTareas ? (
                <div className="text-center py-16 text-gray-400 text-sm">Cargando...</div>
              ) : tareas.length === 0 ? (
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
      ) : (
        // ── Sin filtro: lista global de avances de todos los proyectos ──
        <ListaAvances
          entradas={entradasFiltradas}
          loading={loading}
          onEditar={abrirEditarAvance}
          onEliminar={(e) => void eliminarAvance(e)}
        />
      )}

      {mostrarForm && (
        <AvanceModal
          proyectos={proyectos}
          proyectoIdInicial={proyectoSeleccionado ? filtroProyecto : ""}
          entrada={editando}
          onClose={() => setMostrarForm(false)}
          onSaved={async () => {
            setMostrarForm(false);
            await cargar();
          }}
        />
      )}
    </div>
  );
}

// ─── Lista de avances (global o filtrada) — mismo patrón visual que /compras ──

function ListaAvances({
  entradas,
  loading,
  onEditar,
  onEliminar,
}: {
  entradas: Entrada[];
  loading: boolean;
  onEditar: (entrada: Entrada) => void;
  onEliminar: (entrada: Entrada) => void;
}) {
  if (loading) {
    return <div className="flex justify-center py-16 text-gray-400 text-sm">Cargando...</div>;
  }

  if (entradas.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        Sin avances registrados. Agrega el primero con el botón de arriba.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      {entradas.map((entrada) => (
        <div
          key={entrada.id}
          className="flex items-center gap-2 border-b border-gray-100 px-2 py-2 last:border-b-0 hover:bg-gray-50/60 sm:gap-3 sm:px-3"
        >
          {/* Miniatura */}
          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
            {entrada.fotos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entrada.fotos[0].foto_url} alt="" className="size-full object-cover" />
            ) : (
              <BookOpen className="size-4 text-gray-300" />
            )}
          </div>

          {/* Título + descripción */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium text-gray-900">{entrada.titulo}</span>
              {entrada.video_url && <PlayCircle className="size-3.5 shrink-0 text-blue-500" />}
            </div>
            {entrada.descripcion && (
              <p className="truncate text-xs text-gray-500">{entrada.descripcion}</p>
            )}
          </div>

          {/* Fecha + proyecto */}
          <div className="hidden shrink-0 flex-col items-end text-right sm:flex">
            <span className="text-xs text-gray-400">
              {new Date(entrada.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
            </span>
            <span className="max-w-[140px] truncate text-xs text-gray-400" title={entrada.proyecto_nombre}>
              {entrada.proyecto_nombre}
            </span>
          </div>
          <span
            className="max-w-[72px] shrink-0 truncate text-right text-xs text-gray-400 sm:hidden"
            title={entrada.proyecto_nombre}
          >
            {entrada.proyecto_nombre}
          </span>

          {/* Editar/eliminar */}
          <div className="flex shrink-0 items-center">
            <button
              onClick={() => onEditar(entrada)}
              title="Editar"
              className="flex size-8 items-center justify-center rounded-lg text-gray-300 hover:bg-blue-50 hover:text-blue-600"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              onClick={() => onEliminar(entrada)}
              title="Eliminar"
              className="flex size-8 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Modal: nuevo / editar avance ───────────────────────────────────────────

function AvanceModal({
  proyectos,
  proyectoIdInicial,
  entrada,
  onClose,
  onSaved,
}: {
  proyectos: Proyecto[];
  proyectoIdInicial: string;
  entrada: Entrada | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = getSupabaseClient();
  const [proyectoId, setProyectoId] = useState(entrada?.proyecto_id ?? proyectoIdInicial);
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
        const { error } = await supabase
          .from("bitacora_entradas")
          .update({ ...payload, proyecto_id: proyectoId })
          .eq("id", entrada.id);
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
              Proyecto <span className="text-red-500">*</span>
            </label>
            <ProyectoCombobox
              value={proyectoId}
              onChange={setProyectoId}
              proyectos={proyectos}
              placeholder="Selecciona un proyecto"
              className="w-full"
            />
          </div>

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
            disabled={saving || !titulo.trim() || !proyectoId}
            className="h-12 w-full sm:h-9 sm:w-auto"
          >
            {saving ? "Guardando..." : entrada ? "Guardar cambios" : "Publicar avance"}
          </Button>
        </div>
      </div>
    </div>
  );
}
