"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { ShoppingCart, Plus, X, Search, Pencil, Trash2, AlertTriangle, Clock, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProyectoCombobox, type Proyecto } from "@/components/proyecto-combobox";

type ProyectoConEstado = Proyecto & { estado: string };

interface Compra {
  id: string;
  item: string;
  cantidad: number;
  unidad: string;
  urgente: boolean;
  categoria: string;
  proyecto_id: string;
  proyecto_nombre: string;
  fecha_solicitud: string;
  fecha_requerida: string | null;
  observaciones: string | null;
  comprado: boolean;
  comprado_at: string | null;
  archivado: boolean;
  created_at: string;
}

const UNIDADES_COMUNES = ["und", "m²", "ml", "kg", "lt", "gl", "bolsa", "rollo", "caja"];

// Orden fijo — es el mismo orden en que se agrupa la lista, no alfabético.
const CATEGORIAS = [
  "Ferretería",
  "Enchapes",
  "Pinturas",
  "Eléctrico",
  "Baños",
  "Cocina y zona húmeda",
  "Piedras y granitos",
  "Divisiones de vidrio y espejos",
  "Otros",
] as const;

const DIAS_DEMORA_AVISO = 7;

// Tiempo relativo desde fecha_solicitud — "Hoy", "Ayer", "Hace N días/semanas/meses/años".
function tiempoTranscurrido(fechaISO: string): { label: string; dias: number } {
  const dias = Math.floor((Date.now() - new Date(fechaISO).getTime()) / 86_400_000);

  let label: string;
  if (dias <= 0) label = "Hoy";
  else if (dias === 1) label = "Ayer";
  else if (dias < 7) label = `Hace ${dias} días`;
  else if (dias < 30) {
    const semanas = Math.floor(dias / 7);
    label = `Hace ${semanas} semana${semanas > 1 ? "s" : ""}`;
  } else if (dias < 365) {
    const meses = Math.floor(dias / 30);
    label = `Hace ${meses} mes${meses > 1 ? "es" : ""}`;
  } else {
    const anios = Math.floor(dias / 365);
    label = `Hace ${anios} año${anios > 1 ? "s" : ""}`;
  }

  return { label, dias };
}

// Pendientes de comprar: urgentes primero, luego las más antiguas primero.
function compararPendientes(a: Compra, b: Compra): number {
  if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
  const diff = new Date(a.fecha_solicitud).getTime() - new Date(b.fecha_solicitud).getTime();
  return a.urgente ? -diff : diff;
}

// Comprados: lo más reciente primero.
function compararComprados(a: Compra, b: Compra): number {
  const fa = a.comprado_at ? new Date(a.comprado_at).getTime() : 0;
  const fb = b.comprado_at ? new Date(b.comprado_at).getTime() : 0;
  return fb - fa;
}

// Sección "Pendientes por comprar": lo que aún no se compró va primero (con
// su orden de siempre); lo ya comprado pero sin archivar queda al final,
// visible pero fuera del camino, esperando a que alguien lo archive.
function compararSeccionPendientes(a: Compra, b: Compra): number {
  if (a.comprado !== b.comprado) return a.comprado ? 1 : -1;
  return a.comprado ? compararComprados(a, b) : compararPendientes(a, b);
}

type Grupo = { categoria: string; items: Compra[] };

function agruparPorCategoria(items: Compra[]): Grupo[] {
  return CATEGORIAS.map((categoria) => ({
    categoria,
    items: items.filter((c) => c.categoria === categoria),
  })).filter((g) => g.items.length > 0);
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ComprasPage() {
  const supabase = getSupabaseClient();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoConEstado[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);

  const [filtroProyecto, setFiltroProyecto] = useState("TODOS");
  const [busqueda, setBusqueda] = useState("");

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Compra | null>(null);
  const [form, setForm] = useState({
    item: "",
    cantidad: "1",
    unidad: "und",
    proyecto_id: "",
    urgente: false,
    categoria: "Otros" as string,
    fecha_solicitud: "",
    fecha_requerida: "",
    observaciones: "",
  });

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const [comprasRes, proyRes] = await Promise.all([
      supabase.from("compras").select("*"),
      supabase.from("proyectos_maestro").select("id, cliente_nombre, estado").order("cliente_nombre"),
    ]);

    const projMap = new Map<string, string>();
    if (proyRes.data) {
      setProyectos(proyRes.data as ProyectoConEstado[]);
      (proyRes.data as ProyectoConEstado[]).forEach((p) =>
        projMap.set(p.id, p.cliente_nombre ?? "Sin nombre")
      );
    }

    if (comprasRes.data) {
      const construidas = (comprasRes.data as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        item: r.item as string,
        cantidad: r.cantidad as number,
        unidad: r.unidad as string,
        proyecto_id: r.proyecto_id as string,
        urgente: r.urgente as boolean,
        categoria: (r.categoria as string) ?? "Otros",
        proyecto_nombre: projMap.get(r.proyecto_id as string) ?? "Proyecto desconocido",
        fecha_solicitud: (r.fecha_solicitud as string) ?? (r.created_at as string)?.slice(0, 10),
        fecha_requerida: (r.fecha_requerida as string) ?? null,
        observaciones: (r.observaciones as string) ?? null,
        comprado: r.comprado as boolean,
        comprado_at: r.comprado_at as string | null,
        archivado: r.archivado as boolean,
        created_at: r.created_at as string,
      }));
      setCompras(construidas);
    }
    setLoading(false);
  }

  // Pendiente ↔ Comprado, vía la lista desplegable de la fila. Volver a
  // "Pendiente" también desarchiva — no tendría sentido dejarlo en el
  // historial de Comprados si ya no está comprado.
  async function cambiarEstado(compra: Compra, nuevoComprado: boolean) {
    const nuevoAt = nuevoComprado ? new Date().toISOString() : null;
    const nuevoArchivado = nuevoComprado ? compra.archivado : false;

    setToggling(compra.id);
    setCompras((prev) =>
      prev.map((c) => (c.id === compra.id ? { ...c, comprado: nuevoComprado, comprado_at: nuevoAt, archivado: nuevoArchivado } : c))
    );

    const { error } = await supabase
      .from("compras")
      .update({ comprado: nuevoComprado, comprado_at: nuevoAt, archivado: nuevoArchivado })
      .eq("id", compra.id);

    if (error) {
      setCompras((prev) =>
        prev.map((c) => (c.id === compra.id ? { ...c, comprado: compra.comprado, comprado_at: compra.comprado_at, archivado: compra.archivado } : c))
      );
      alert("Error: " + error.message);
    }
    setToggling(null);
  }

  async function cambiarArchivado(compra: Compra, nuevoArchivado: boolean) {
    setToggling(compra.id);
    setCompras((prev) =>
      prev.map((c) => (c.id === compra.id ? { ...c, archivado: nuevoArchivado } : c))
    );

    const { error } = await supabase
      .from("compras")
      .update({ archivado: nuevoArchivado })
      .eq("id", compra.id);

    if (error) {
      setCompras((prev) =>
        prev.map((c) => (c.id === compra.id ? { ...c, archivado: compra.archivado } : c))
      );
      alert("Error: " + error.message);
    }
    setToggling(null);
  }

  // Edición directa en la fila (Material, Cantidad, Unidad, Observaciones,
  // fechas, Centro de Costos) — sin abrir el modal. `campo` es cualquier
  // columna editable de `compras`; el valor ya llega listo para guardar.
  function actualizarCampoLocal(id: string, cambios: Partial<Compra>) {
    setCompras((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
  }

  async function guardarCampo(id: string, columna: string, valor: unknown) {
    const { error } = await supabase.from("compras").update({ [columna]: valor }).eq("id", id);
    if (error) alert("Error: " + error.message);
  }

  function cambiarProyectoFila(compra: Compra, nuevoProyectoId: string) {
    const nombre = proyectos.find((p) => p.id === nuevoProyectoId)?.cliente_nombre ?? "Proyecto desconocido";
    actualizarCampoLocal(compra.id, { proyecto_id: nuevoProyectoId, proyecto_nombre: nombre });
    void guardarCampo(compra.id, "proyecto_id", nuevoProyectoId);
  }

  function abrirAgregar() {
    setEditando(null);
    setForm({
      item: "", cantidad: "1", unidad: "und", proyecto_id: "", urgente: false, categoria: "Otros",
      fecha_solicitud: new Date().toISOString().slice(0, 10), fecha_requerida: "", observaciones: "",
    });
    setMostrarForm(true);
  }

  function abrirEditar(compra: Compra) {
    setEditando(compra);
    setForm({
      item: compra.item,
      cantidad: String(compra.cantidad),
      unidad: compra.unidad,
      proyecto_id: compra.proyecto_id,
      urgente: compra.urgente,
      categoria: compra.categoria,
      fecha_solicitud: compra.fecha_solicitud,
      fecha_requerida: compra.fecha_requerida ?? "",
      observaciones: compra.observaciones ?? "",
    });
    setMostrarForm(true);
  }

  function cerrarModal() {
    setMostrarForm(false);
    setEditando(null);
  }

  async function guardarCompra() {
    if (!form.item.trim() || !form.proyecto_id) return;
    setSaving(true);

    const payload = {
      item: form.item.trim(),
      cantidad: parseFloat(form.cantidad) || 1,
      unidad: form.unidad.trim() || "und",
      proyecto_id: form.proyecto_id,
      urgente: form.urgente,
      categoria: form.categoria,
      fecha_solicitud: form.fecha_solicitud || new Date().toISOString().slice(0, 10),
      fecha_requerida: form.fecha_requerida || null,
      observaciones: form.observaciones.trim() || null,
    };

    const { error } = editando
      ? await supabase.from("compras").update(payload).eq("id", editando.id)
      : await supabase.from("compras").insert(payload);

    setSaving(false);
    if (error) { alert("Error: " + error.message); return; }
    cerrarModal();
    await cargar();
  }

  async function eliminarCompra(compra: Compra) {
    if (!window.confirm(`¿Eliminar "${compra.item}"?`)) return;
    setEliminando(compra.id);
    const { error } = await supabase.from("compras").delete().eq("id", compra.id);
    if (error) {
      alert("Error: " + error.message);
    } else {
      setCompras((prev) => prev.filter((c) => c.id !== compra.id));
    }
    setEliminando(null);
  }

  const proyectosActivos = proyectos.filter((p) => p.estado === "ACTIVO");

  const comprasFiltradas = compras.filter((c) => {
    if (filtroProyecto !== "TODOS" && c.proyecto_id !== filtroProyecto) return false;
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      const coincide = c.item.toLowerCase().includes(q) || c.proyecto_nombre.toLowerCase().includes(q);
      if (!coincide) return false;
    }
    return true;
  });

  // "Pendientes por comprar" = todo lo que no se ha archivado todavía (mezcla
  // lo realmente pendiente con lo ya comprado esperando el botón Archivar).
  const pendientesSeccion = comprasFiltradas.filter((c) => !c.archivado).sort(compararSeccionPendientes);
  const historialSeccion = comprasFiltradas.filter((c) => c.archivado).sort(compararComprados);

  const gruposPendientes = agruparPorCategoria(pendientesSeccion);
  const gruposHistorial = agruparPorCategoria(historialSeccion);

  const totalPendientes = compras.filter((c) => !c.comprado).length;
  const totalComprados = compras.filter((c) => c.comprado).length;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="size-6 text-blue-600" />
            Compras
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Lista global de materiales · todas las obras
          </p>
        </div>
        <Button onClick={abrirAgregar} className="h-11 sm:h-9">
          <Plus className="size-4 mr-1" />
          Agregar compra
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-gray-900">{compras.length}</div>
          <div className="text-sm text-gray-500">Total ítems</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="text-2xl font-bold text-orange-700">{totalPendientes}</div>
          <div className="text-sm text-orange-600">Pendientes</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="text-2xl font-bold text-green-700">{totalComprados}</div>
          <div className="text-sm text-green-600">Comprados</div>
        </div>
      </div>

      {/* Buscador — por ítem o por proyecto/centro de costos */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por ítem o proyecto..."
          className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 sm:h-10"
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Filtro de proyecto */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <ProyectoCombobox
          value={filtroProyecto}
          onChange={setFiltroProyecto}
          proyectos={proyectos}
          incluirTodos
          placeholder="Todos los proyectos"
          className="w-full sm:w-auto sm:min-w-[220px]"
        />

        {(filtroProyecto !== "TODOS" || busqueda.trim() !== "") && (
          <button
            onClick={() => { setFiltroProyecto("TODOS"); setBusqueda(""); }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <X className="size-3" /> Limpiar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">Cargando...</div>
      ) : compras.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No hay compras registradas. Agrega la primera con el botón de arriba.
        </div>
      ) : (
        <div className="space-y-10">
          {/* ── Pendientes por comprar ─────────────────────────────────── */}
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-orange-700">
              Pendientes por comprar
            </h2>
            {gruposPendientes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
                {comprasFiltradas.length === 0 && (busqueda || filtroProyecto !== "TODOS")
                  ? "Sin resultados para los filtros seleccionados."
                  : "Nada pendiente por comprar o archivar 🎉"}
              </div>
            ) : (
              <div className="space-y-4">
                {gruposPendientes.map((grupo) => (
                  <TablaGrupo
                    key={grupo.categoria}
                    grupo={grupo}
                    seccion="pendientes"
                    proyectos={proyectos}
                    proyectosActivos={proyectosActivos}
                    onCambiarEstado={cambiarEstado}
                    onArchivar={(c) => void cambiarArchivado(c, true)}
                    onDesarchivar={(c) => void cambiarArchivado(c, false)}
                    onCambiarProyecto={cambiarProyectoFila}
                    onCambiarCampoLocal={actualizarCampoLocal}
                    onGuardarCampo={guardarCampo}
                    toggling={toggling}
                    onEditar={abrirEditar}
                    onEliminar={eliminarCompra}
                    eliminando={eliminando}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Comprados — historial ─────────────────────────────────── */}
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-green-700">
              Comprados
            </h2>
            {gruposHistorial.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
                Todavía no hay nada archivado en el historial.
              </div>
            ) : (
              <div className="space-y-4">
                {gruposHistorial.map((grupo) => (
                  <TablaGrupo
                    key={grupo.categoria}
                    grupo={grupo}
                    seccion="historial"
                    proyectos={proyectos}
                    proyectosActivos={proyectosActivos}
                    onCambiarEstado={cambiarEstado}
                    onArchivar={(c) => void cambiarArchivado(c, true)}
                    onDesarchivar={(c) => void cambiarArchivado(c, false)}
                    onCambiarProyecto={cambiarProyectoFila}
                    onCambiarCampoLocal={actualizarCampoLocal}
                    onGuardarCampo={guardarCampo}
                    toggling={toggling}
                    onEditar={abrirEditar}
                    onEliminar={eliminarCompra}
                    eliminando={eliminando}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal agregar / editar compra — bottom sheet en móvil, modal centrado en desktop */}
      {mostrarForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
        >
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:max-w-md sm:rounded-2xl sm:p-6 sm:pb-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editando ? "Editar compra" : "Agregar compra"}
              </h2>
              <button
                onClick={cerrarModal}
                className="flex size-11 items-center justify-center rounded-lg text-gray-400 active:bg-gray-100 sm:size-8 sm:hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Ítem / Material <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={form.item}
                  onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && void guardarCompra()}
                  placeholder="ej. Sanitario Corona Lyra"
                  className="h-11 w-full rounded-lg border border-gray-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Cantidad <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={form.cantidad}
                    onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                    className="h-11 w-full rounded-lg border border-gray-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="w-28 sm:w-32">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Unidad</label>
                  <input
                    list="unidades-list"
                    value={form.unidad}
                    onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))}
                    placeholder="und"
                    className="h-11 w-full rounded-lg border border-gray-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="unidades-list">
                    {UNIDADES_COMUNES.map((u) => <option key={u} value={u} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Proyecto <span className="text-red-500">*</span>
                </label>
                <ProyectoCombobox
                  value={form.proyecto_id}
                  onChange={(id) => setForm((f) => ({ ...f, proyecto_id: id }))}
                  proyectos={proyectos}
                  placeholder="Selecciona un proyecto"
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Categoría
                </label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIAS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Fecha solicitud</label>
                  <input
                    type="date"
                    value={form.fecha_solicitud}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_solicitud: e.target.value }))}
                    className="h-11 w-full rounded-lg border border-gray-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Fecha requerida</label>
                  <input
                    type="date"
                    value={form.fecha_requerida}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_requerida: e.target.value }))}
                    className="h-11 w-full rounded-lg border border-gray-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Observaciones</label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                  placeholder="ej. Entregar antes de 12 PM"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 has-[:checked]:border-red-200 has-[:checked]:bg-red-50">
                <input
                  type="checkbox"
                  checked={form.urgente}
                  onChange={(e) => setForm((f) => ({ ...f, urgente: e.target.checked }))}
                  className="size-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <AlertTriangle className="size-3.5 text-red-500" />
                  Urgente
                </span>
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={cerrarModal} className="h-12 w-full sm:h-9 sm:w-auto">
                Cancelar
              </Button>
              <Button
                onClick={() => void guardarCompra()}
                disabled={saving || !form.item.trim() || !form.proyecto_id}
                className="h-12 w-full sm:h-9 sm:w-auto"
              >
                {saving ? "Guardando..." : editando ? "Guardar cambios" : "Agregar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tabla por categoría — reutilizada en Pendientes y en Comprados ───────────

function TablaGrupo({
  grupo,
  seccion,
  proyectos,
  proyectosActivos,
  onCambiarEstado,
  onArchivar,
  onDesarchivar,
  onCambiarProyecto,
  onCambiarCampoLocal,
  onGuardarCampo,
  toggling,
  onEditar,
  onEliminar,
  eliminando,
}: {
  grupo: Grupo;
  seccion: "pendientes" | "historial";
  proyectos: ProyectoConEstado[];
  proyectosActivos: ProyectoConEstado[];
  onCambiarEstado: (c: Compra, nuevoComprado: boolean) => void;
  onArchivar: (c: Compra) => void;
  onDesarchivar: (c: Compra) => void;
  onCambiarProyecto: (c: Compra, nuevoProyectoId: string) => void;
  onCambiarCampoLocal: (id: string, cambios: Partial<Compra>) => void;
  onGuardarCampo: (id: string, columna: string, valor: unknown) => void;
  toggling: string | null;
  onEditar: (c: Compra) => void;
  onEliminar: (c: Compra) => void;
  eliminando: string | null;
}) {
  const inputClase = "w-full min-w-0 rounded bg-transparent px-1 -mx-1 focus:outline-none focus:bg-gray-100 focus:ring-1 focus:ring-blue-300";

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      <div className="border-b border-gray-200 bg-gray-100 px-4 py-2">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-600">
          {grupo.categoria}
        </span>
        <span className="ml-1.5 text-xs font-medium text-gray-400">
          ({grupo.items.length})
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-2 py-2 min-w-[180px]">Material</th>
              <th className="px-2 py-2 text-right w-16">Cant.</th>
              <th className="px-2 py-2 w-20">Unidad</th>
              <th className="px-2 py-2">Estado</th>
              <th className="px-2 py-2 min-w-[180px]">Centro de Costos</th>
              <th className="px-2 py-2 whitespace-nowrap">Fecha Solicitud</th>
              <th className="px-2 py-2 whitespace-nowrap">Fecha Requerida</th>
              <th className="px-2 py-2 min-w-[160px]">Observaciones</th>
              <th className="w-24 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {grupo.items.map((compra) => {
              const tiempo = tiempoTranscurrido(compra.fecha_solicitud);
              const demorada = !compra.comprado && tiempo.dias > DIAS_DEMORA_AVISO;
              const puedeArchivar = seccion === "pendientes" && compra.comprado && !compra.archivado;

              // Si el proyecto actual ya no está activo (pausado/finalizado),
              // se incluye igual en las opciones para que el selector no
              // aparezca en blanco — pero el resto de opciones son solo activos.
              const proyectoActual = proyectos.find((p) => p.id === compra.proyecto_id);
              const opcionesProyecto =
                proyectoActual && proyectoActual.estado !== "ACTIVO"
                  ? [proyectoActual, ...proyectosActivos]
                  : proyectosActivos;

              return (
                <tr
                  key={compra.id}
                  className={cn(
                    "border-b border-gray-100 last:border-b-0 align-top transition-colors",
                    compra.comprado
                      ? "bg-green-50/30"
                      : compra.urgente
                      ? "bg-red-50/40"
                      : "hover:bg-gray-50/60"
                  )}
                >
                  {/* Material — editable en línea */}
                  <td className="px-2 py-2">
                    <input
                      value={compra.item}
                      onChange={(e) => onCambiarCampoLocal(compra.id, { item: e.target.value })}
                      onBlur={(e) => onGuardarCampo(compra.id, "item", e.target.value.trim())}
                      className={cn(inputClase, "font-medium", compra.comprado ? "text-gray-400 line-through" : "text-gray-900")}
                    />
                  </td>

                  {/* Cantidad — editable en línea */}
                  <td className="px-2 py-2 text-right tabular-nums text-gray-700">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={compra.cantidad}
                      onChange={(e) => onCambiarCampoLocal(compra.id, { cantidad: Number(e.target.value) })}
                      onBlur={(e) => onGuardarCampo(compra.id, "cantidad", parseFloat(e.target.value) || 1)}
                      className={cn(inputClase, "text-right")}
                    />
                  </td>

                  {/* Unidad — editable en línea */}
                  <td className="px-2 py-2 text-gray-500">
                    <input
                      list="unidades-list-tabla"
                      value={compra.unidad}
                      onChange={(e) => onCambiarCampoLocal(compra.id, { unidad: e.target.value })}
                      onBlur={(e) => onGuardarCampo(compra.id, "unidad", e.target.value.trim() || "und")}
                      className={inputClase}
                    />
                  </td>

                  {/* Estado — lista desplegable, cambia sin abrir el modal */}
                  <td className="px-2 py-2">
                    <select
                      value={compra.comprado ? "comprado" : "pendiente"}
                      onChange={(e) => onCambiarEstado(compra, e.target.value === "comprado")}
                      disabled={toggling === compra.id}
                      className={cn(
                        "rounded-full border-0 px-2 py-1 text-[10px] font-bold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 cursor-pointer",
                        compra.comprado
                          ? "bg-green-100 text-green-700 focus:ring-green-400"
                          : "bg-orange-100 text-orange-700 focus:ring-orange-400"
                      )}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="comprado">Comprado</option>
                    </select>
                  </td>

                  {/* Centro de Costos — buscador entre proyectos activos */}
                  <td className="px-2 py-2">
                    <ProyectoCombobox
                      value={compra.proyecto_id}
                      onChange={(id) => onCambiarProyecto(compra, id)}
                      proyectos={opcionesProyecto}
                      placeholder="Selecciona..."
                      className="min-w-[170px]"
                    />
                  </td>

                  {/* Fecha Solicitud — editable con selector de calendario */}
                  <td className="px-2 py-2 whitespace-nowrap text-gray-500">
                    <input
                      type="date"
                      value={compra.fecha_solicitud}
                      onChange={(e) => {
                        onCambiarCampoLocal(compra.id, { fecha_solicitud: e.target.value });
                        onGuardarCampo(compra.id, "fecha_solicitud", e.target.value);
                      }}
                      className={cn(inputClase, "w-[125px]")}
                    />
                    {demorada && (
                      <span
                        title={`Registrada: ${tiempo.label}`}
                        className="mt-1 flex w-fit items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700"
                      >
                        <Clock className="size-2.5" />
                        {tiempo.label}
                      </span>
                    )}
                  </td>

                  {/* Fecha Requerida — editable con selector de calendario */}
                  <td className="px-2 py-2 whitespace-nowrap text-gray-500">
                    <input
                      type="date"
                      value={compra.fecha_requerida ?? ""}
                      onChange={(e) => {
                        const valor = e.target.value || null;
                        onCambiarCampoLocal(compra.id, { fecha_requerida: valor });
                        onGuardarCampo(compra.id, "fecha_requerida", valor);
                      }}
                      className={cn(inputClase, "w-[125px]")}
                    />
                  </td>

                  {/* Observaciones — editable en línea */}
                  <td className="px-2 py-2 text-gray-500">
                    <input
                      value={compra.observaciones ?? ""}
                      onChange={(e) => onCambiarCampoLocal(compra.id, { observaciones: e.target.value })}
                      onBlur={(e) => onGuardarCampo(compra.id, "observaciones", e.target.value.trim() || null)}
                      placeholder="—"
                      className={cn(inputClase, "min-w-[150px]")}
                    />
                  </td>

                  {/* Archivar/Desarchivar + editar/eliminar */}
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-0.5">
                      {puedeArchivar && (
                        <button
                          onClick={() => onArchivar(compra)}
                          disabled={toggling === compra.id}
                          title="Enviar al historial de Comprados"
                          className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >
                          <Archive className="size-3" />
                          Archivar
                        </button>
                      )}
                      {seccion === "historial" && (
                        <button
                          onClick={() => onDesarchivar(compra)}
                          disabled={toggling === compra.id}
                          title="Devolver a Pendientes"
                          className="flex size-7 items-center justify-center rounded-lg text-gray-300 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-40"
                        >
                          <ArchiveRestore className="size-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onEditar(compra)}
                        title="Editar"
                        className="flex size-7 items-center justify-center rounded-lg text-gray-300 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        onClick={() => onEliminar(compra)}
                        disabled={eliminando === compra.id}
                        title="Eliminar"
                        className="flex size-7 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <datalist id="unidades-list-tabla">
          {UNIDADES_COMUNES.map((u) => <option key={u} value={u} />)}
        </datalist>
      </div>
    </div>
  );
}
