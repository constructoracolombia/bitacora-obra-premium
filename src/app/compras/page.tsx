"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { ShoppingCart, Plus, X, Search, CheckCircle2, Circle, Pencil, Trash2, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProyectoCombobox, type Proyecto } from "@/components/proyecto-combobox";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Compra {
  id: string;
  item: string;
  cantidad: number;
  unidad: string;
  urgente: boolean;
  categoria: string;
  proyecto_id: string;
  proyecto_nombre: string;
  fecha_requerida: string | null;
  observaciones: string | null;
  comprado: boolean;
  comprado_at: string | null;
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

// Tiempo relativo desde created_at — "Hoy", "Ayer", "Hace N días/semanas/meses/años".
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

function formatFecha(fechaISO: string | null): string {
  if (!fechaISO) return "—";
  return format(new Date(fechaISO), "dd/MM/yyyy", { locale: es });
}

// Pendientes: urgentes primero, luego las más antiguas primero (para que las
// requisiciones estancadas salten a la vista sin ordenar manualmente).
function compararPendientes(a: Compra, b: Compra): number {
  if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
  const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  return a.urgente ? -diff : diff;
}

// Comprados: historial, lo más reciente primero.
function compararComprados(a: Compra, b: Compra): number {
  const fa = a.comprado_at ? new Date(a.comprado_at).getTime() : 0;
  const fb = b.comprado_at ? new Date(b.comprado_at).getTime() : 0;
  return fb - fa;
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
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
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
      supabase.from("proyectos_maestro").select("id, cliente_nombre").order("cliente_nombre"),
    ]);

    const projMap = new Map<string, string>();
    if (proyRes.data) {
      setProyectos(proyRes.data as Proyecto[]);
      (proyRes.data as Proyecto[]).forEach((p) =>
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
        fecha_requerida: (r.fecha_requerida as string) ?? null,
        observaciones: (r.observaciones as string) ?? null,
        comprado: r.comprado as boolean,
        comprado_at: r.comprado_at as string | null,
        created_at: r.created_at as string,
      }));
      setCompras(construidas);
    }
    setLoading(false);
  }

  // Único paso de estado: Pendiente ↔ Comprado.
  async function toggleComprado(compra: Compra) {
    const nuevoValor = !compra.comprado;
    const nuevoAt = nuevoValor ? new Date().toISOString() : null;

    setToggling(compra.id);
    setCompras((prev) =>
      prev.map((c) => (c.id === compra.id ? { ...c, comprado: nuevoValor, comprado_at: nuevoAt } : c))
    );

    const { error } = await supabase
      .from("compras")
      .update({ comprado: nuevoValor, comprado_at: nuevoAt })
      .eq("id", compra.id);

    if (error) {
      setCompras((prev) =>
        prev.map((c) => (c.id === compra.id ? { ...c, comprado: compra.comprado, comprado_at: compra.comprado_at } : c))
      );
      alert("Error: " + error.message);
    }
    setToggling(null);
  }

  function abrirAgregar() {
    setEditando(null);
    setForm({ item: "", cantidad: "1", unidad: "und", proyecto_id: "", urgente: false, categoria: "Otros", fecha_requerida: "", observaciones: "" });
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

  const comprasFiltradas = compras.filter((c) => {
    if (filtroProyecto !== "TODOS" && c.proyecto_id !== filtroProyecto) return false;
    if (busqueda.trim() && !c.item.toLowerCase().includes(busqueda.trim().toLowerCase())) return false;
    return true;
  });

  const pendientes = comprasFiltradas.filter((c) => !c.comprado).sort(compararPendientes);
  const compradosLista = comprasFiltradas.filter((c) => c.comprado).sort(compararComprados);

  const gruposPendientes = agruparPorCategoria(pendientes);
  const gruposComprados = agruparPorCategoria(compradosLista);

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

      {/* Buscador */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar ítem..."
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
          {/* ── Pendientes — lo accionable ────────────────────────────── */}
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-orange-700">
              Pendientes por comprar
            </h2>
            {gruposPendientes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
                {comprasFiltradas.length === 0 && (busqueda || filtroProyecto !== "TODOS")
                  ? "Sin resultados para los filtros seleccionados."
                  : "No hay pendientes — todo comprado 🎉"}
              </div>
            ) : (
              <div className="space-y-4">
                {gruposPendientes.map((grupo) => (
                  <TablaGrupo
                    key={grupo.categoria}
                    grupo={grupo}
                    onToggle={toggleComprado}
                    toggling={toggling}
                    onEditar={abrirEditar}
                    onEliminar={eliminarCompra}
                    eliminando={eliminando}
                    modo="pendiente"
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
            {gruposComprados.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
                Todavía no hay compras registradas en el historial.
              </div>
            ) : (
              <div className="space-y-4">
                {gruposComprados.map((grupo) => (
                  <TablaGrupo
                    key={grupo.categoria}
                    grupo={grupo}
                    onToggle={toggleComprado}
                    toggling={toggling}
                    onEditar={abrirEditar}
                    onEliminar={eliminarCompra}
                    eliminando={eliminando}
                    modo="comprado"
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

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Fecha requerida</label>
                <input
                  type="date"
                  value={form.fecha_requerida}
                  onChange={(e) => setForm((f) => ({ ...f, fecha_requerida: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
  onToggle,
  toggling,
  onEditar,
  onEliminar,
  eliminando,
  modo,
}: {
  grupo: Grupo;
  onToggle: (c: Compra) => void;
  toggling: string | null;
  onEditar: (c: Compra) => void;
  onEliminar: (c: Compra) => void;
  eliminando: string | null;
  modo: "pendiente" | "comprado";
}) {
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
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-2 py-2">Centro de Costos</th>
              <th className="px-2 py-2 whitespace-nowrap">{modo === "pendiente" ? "Fecha Solicitud" : "Comprado el"}</th>
              <th className="px-2 py-2 min-w-[200px]">Material</th>
              <th className="px-2 py-2 text-right">Cant.</th>
              <th className="px-2 py-2">Unidad</th>
              <th className="px-2 py-2">Estado</th>
              <th className="px-2 py-2 whitespace-nowrap">Fecha Requerida</th>
              <th className="px-2 py-2 min-w-[160px]">Observaciones</th>
              <th className="w-16 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {grupo.items.map((compra) => {
              const tiempo = tiempoTranscurrido(compra.created_at);
              const demorada = modo === "pendiente" && tiempo.dias > DIAS_DEMORA_AVISO;

              return (
                <tr
                  key={compra.id}
                  className={cn(
                    "border-b border-gray-100 last:border-b-0 align-top transition-colors",
                    modo === "comprado"
                      ? "bg-green-50/30"
                      : compra.urgente
                      ? "bg-red-50/40"
                      : "hover:bg-gray-50/60"
                  )}
                >
                  {/* Centro de Costos = la unidad puntual */}
                  <td className="px-2 py-2 whitespace-nowrap text-gray-700" title={compra.proyecto_nombre}>
                    {compra.proyecto_nombre}
                  </td>

                  {/* Fecha Solicitud (pendientes) / Comprado el (historial) */}
                  <td className="px-2 py-2 whitespace-nowrap text-gray-500">
                    {modo === "pendiente" ? formatFecha(compra.created_at) : formatFecha(compra.comprado_at)}
                    {demorada && (
                      <span
                        title={`Registrada: ${tiempo.label}`}
                        className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700"
                      >
                        <Clock className="size-2.5" />
                        {tiempo.label}
                      </span>
                    )}
                  </td>

                  {/* Material */}
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      {compra.urgente && (
                        <span
                          className="inline-flex shrink-0 items-center rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white"
                          title="Urgente"
                        >
                          Urgente
                        </span>
                      )}
                      <span className={cn("font-medium", modo === "comprado" ? "text-gray-400 line-through" : "text-gray-900")}>
                        {compra.item}
                      </span>
                    </div>
                  </td>

                  {/* Cantidad */}
                  <td className="px-2 py-2 text-right tabular-nums text-gray-700">
                    {Number(compra.cantidad) % 1 === 0
                      ? Number(compra.cantidad).toFixed(0)
                      : Number(compra.cantidad).toString()}
                  </td>

                  {/* Unidad */}
                  <td className="px-2 py-2 text-gray-500">{compra.unidad}</td>

                  {/* Estado — clic para cambiar directo, sin abrir el modal */}
                  <td className="px-2 py-2">
                    <button
                      onClick={() => onToggle(compra)}
                      disabled={toggling === compra.id}
                      title={modo === "comprado" ? "Marcar como pendiente" : "Marcar como comprado"}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50",
                        modo === "comprado"
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                      )}
                    >
                      {modo === "comprado" ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <Circle className="size-3" />
                      )}
                      {modo === "comprado" ? "Comprado" : "Pendiente"}
                    </button>
                  </td>

                  {/* Fecha Requerida */}
                  <td className="px-2 py-2 whitespace-nowrap text-gray-500">
                    {formatFecha(compra.fecha_requerida)}
                  </td>

                  {/* Observaciones */}
                  <td className="px-2 py-2 max-w-[220px] truncate text-gray-500" title={compra.observaciones || ""}>
                    {compra.observaciones || "—"}
                  </td>

                  {/* Editar/eliminar */}
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-0.5">
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
      </div>
    </div>
  );
}
