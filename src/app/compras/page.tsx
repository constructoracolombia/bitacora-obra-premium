"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { ShoppingCart, Plus, X, Search, CheckCircle2, Circle, Pencil, Trash2, AlertTriangle, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProyectoCombobox, type Proyecto } from "@/components/proyecto-combobox";

interface Compra {
  id: string;
  item: string;
  cantidad: number;
  unidad: string;
  urgente: boolean;
  proyecto_id: string;
  proyecto_nombre: string;
  comprado: boolean;
  comprado_at: string | null;
  recibido: boolean;
  recibido_at: string | null;
  created_at: string;
}

const UNIDADES_COMUNES = ["und", "m²", "ml", "kg", "lt", "gl", "bolsa", "rollo", "caja"];

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
  const [filtroEstado, setFiltroEstado] = useState("pendiente");
  const [busqueda, setBusqueda] = useState("");

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Compra | null>(null);
  const [form, setForm] = useState({ item: "", cantidad: "1", unidad: "und", proyecto_id: "", urgente: false });

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const [comprasRes, proyRes] = await Promise.all([
      supabase.from("compras").select("*").order("urgente", { ascending: false }).order("created_at", { ascending: false }),
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
      setCompras(
        (comprasRes.data as Record<string, unknown>[]).map((r) => ({
          id: r.id as string,
          item: r.item as string,
          cantidad: r.cantidad as number,
          unidad: r.unidad as string,
          proyecto_id: r.proyecto_id as string,
          urgente: r.urgente as boolean,
          proyecto_nombre: projMap.get(r.proyecto_id as string) ?? "Proyecto desconocido",
          comprado: r.comprado as boolean,
          comprado_at: r.comprado_at as string | null,
          recibido: r.recibido as boolean,
          recibido_at: r.recibido_at as string | null,
          created_at: r.created_at as string,
        }))
      );
    }
    setLoading(false);
  }

  async function toggleComprado(compra: Compra) {
    const nuevoValor = !compra.comprado;
    const nuevoAt = nuevoValor ? new Date().toISOString() : null;
    // Si se desmarca "comprado", no puede seguir "recibido" — se resetea junto.
    const nuevoRecibido = nuevoValor ? compra.recibido : false;
    const nuevoRecibidoAt = nuevoRecibido ? compra.recibido_at : null;

    setToggling(compra.id);
    setCompras((prev) =>
      prev.map((c) =>
        c.id === compra.id
          ? { ...c, comprado: nuevoValor, comprado_at: nuevoAt, recibido: nuevoRecibido, recibido_at: nuevoRecibidoAt }
          : c
      )
    );

    const { error } = await supabase
      .from("compras")
      .update({ comprado: nuevoValor, comprado_at: nuevoAt, recibido: nuevoRecibido, recibido_at: nuevoRecibidoAt })
      .eq("id", compra.id);

    if (error) {
      setCompras((prev) =>
        prev.map((c) =>
          c.id === compra.id
            ? { ...c, comprado: compra.comprado, comprado_at: compra.comprado_at, recibido: compra.recibido, recibido_at: compra.recibido_at }
            : c
        )
      );
      alert("Error: " + error.message);
    }
    setToggling(null);
  }

  async function toggleRecibido(compra: Compra) {
    if (!compra.comprado) return; // no se puede recibir algo que no está comprado
    const nuevoValor = !compra.recibido;
    const nuevoAt = nuevoValor ? new Date().toISOString() : null;

    setToggling(compra.id);
    setCompras((prev) =>
      prev.map((c) => (c.id === compra.id ? { ...c, recibido: nuevoValor, recibido_at: nuevoAt } : c))
    );

    const { error } = await supabase
      .from("compras")
      .update({ recibido: nuevoValor, recibido_at: nuevoAt })
      .eq("id", compra.id);

    if (error) {
      setCompras((prev) =>
        prev.map((c) => (c.id === compra.id ? { ...c, recibido: compra.recibido, recibido_at: compra.recibido_at } : c))
      );
      alert("Error: " + error.message);
    }
    setToggling(null);
  }

  function abrirAgregar() {
    setEditando(null);
    setForm({ item: "", cantidad: "1", unidad: "und", proyecto_id: "", urgente: false });
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
    if (filtroEstado === "pendiente" && c.comprado) return false;
    // "Comprados" = comprado pero todavía no recibido (en tránsito). Una vez
    // recibido, el ítem pasa a la pestaña "Recibidos" y deja de contar aquí.
    if (filtroEstado === "comprado" && (!c.comprado || c.recibido)) return false;
    if (filtroEstado === "recibido" && !c.recibido) return false;
    if (filtroEstado === "urgente" && !c.urgente) return false;
    if (busqueda.trim() && !c.item.toLowerCase().includes(busqueda.trim().toLowerCase())) return false;
    return true;
  });

  const pendientes = compras.filter((c) => !c.comprado).length;
  const comprados = compras.filter((c) => c.comprado && !c.recibido).length;
  const recibidos = compras.filter((c) => c.recibido).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
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
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-gray-900">{compras.length}</div>
          <div className="text-sm text-gray-500">Total ítems</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="text-2xl font-bold text-orange-700">{pendientes}</div>
          <div className="text-sm text-orange-600">Pendientes</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="text-2xl font-bold text-green-700">{comprados}</div>
          <div className="text-sm text-green-600">Comprados</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-2xl font-bold text-blue-700">{recibidos}</div>
          <div className="text-sm text-blue-600">Recibidos</div>
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

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <ProyectoCombobox
          value={filtroProyecto}
          onChange={setFiltroProyecto}
          proyectos={proyectos}
          incluirTodos
          placeholder="Todos los proyectos"
          className="w-full sm:w-auto sm:min-w-[220px]"
        />

        <div className="flex w-full rounded-lg border border-gray-200 overflow-hidden bg-white text-sm sm:w-auto">
          {[
            { key: "TODOS", label: "Todos" },
            { key: "pendiente", label: "Pendientes" },
            { key: "comprado", label: "Comprados" },
            { key: "recibido", label: "Recibidos" },
            { key: "urgente", label: "Urgentes" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              className={cn(
                "flex-1 px-3 py-3 font-medium transition-colors sm:flex-none sm:py-1.5",
                filtroEstado === f.key
                  ? f.key === "urgente" ? "bg-red-500 text-white" : "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {(filtroProyecto !== "TODOS" || filtroEstado !== "pendiente" || busqueda.trim() !== "") && (
          <button
            onClick={() => { setFiltroProyecto("TODOS"); setFiltroEstado("pendiente"); setBusqueda(""); }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <X className="size-3" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Lista compacta — mismo layout en móvil y desktop */}
      {loading ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">Cargando...</div>
      ) : comprasFiltradas.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {compras.length === 0
            ? "No hay compras registradas. Agrega la primera con el botón de arriba."
            : "Sin resultados para los filtros seleccionados."}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          {comprasFiltradas.map((compra) => (
            <div
              key={compra.id}
              className={cn(
                "flex items-center gap-1.5 border-b border-l-[3px] border-gray-100 pl-[5px] pr-1.5 transition-colors last:border-b-0 sm:gap-2 sm:pr-3",
                compra.recibido
                  ? "border-l-blue-300 bg-blue-50/30"
                  : compra.comprado
                  ? "border-l-green-300 bg-green-50/30"
                  : compra.urgente
                  ? "border-l-red-400 bg-red-50/40"
                  : "border-l-transparent hover:bg-gray-50/60"
              )}
            >
              {/* Checkbox — 44×44 */}
              <button
                onClick={() => void toggleComprado(compra)}
                disabled={toggling === compra.id}
                title={compra.comprado ? "Marcar como pendiente" : "Marcar como comprado"}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg active:bg-gray-100 disabled:opacity-50"
              >
                {compra.comprado ? (
                  <CheckCircle2 className="size-5 text-green-500" />
                ) : (
                  <Circle className="size-5 text-gray-300" />
                )}
              </button>

              {/* Nombre + urgente inline */}
              <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5">
                {compra.urgente && !compra.comprado && (
                  <span
                    className="inline-flex shrink-0 items-center rounded-full bg-red-500 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white sm:px-1.5 sm:text-[9px]"
                    title="Urgente"
                  >
                    <span className="sm:hidden">URG</span>
                    <span className="hidden sm:inline">Urgente</span>
                  </span>
                )}
                <span
                  className={cn(
                    "truncate text-sm font-medium",
                    compra.comprado ? "text-gray-400 line-through" : "text-gray-900"
                  )}
                >
                  {compra.item}
                </span>
                {compra.comprado && (
                  <button
                    onClick={() => void toggleRecibido(compra)}
                    disabled={toggling === compra.id}
                    title={compra.recibido ? "Marcar como no recibido" : "Marcar como recibido"}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50 sm:px-2 sm:text-[9px]",
                      compra.recibido
                        ? "bg-blue-500 text-white"
                        : "border border-blue-300 text-blue-500 hover:bg-blue-50"
                    )}
                  >
                    <PackageCheck className="size-2.5" />
                    {compra.recibido ? "Recibido" : "Recibir"}
                  </button>
                )}
              </div>

              {/* Cantidad + unidad */}
              <span className="shrink-0 whitespace-nowrap text-xs text-gray-500 tabular-nums">
                {Number(compra.cantidad) % 1 === 0
                  ? Number(compra.cantidad).toFixed(0)
                  : Number(compra.cantidad).toString()}{" "}
                {compra.unidad}
              </span>

              {/* Proyecto */}
              <span
                className="shrink-0 max-w-[56px] truncate text-xs text-gray-400 sm:max-w-[140px]"
                title={compra.proyecto_nombre}
              >
                {compra.proyecto_nombre}
              </span>

              {/* Editar/eliminar — discretos, al final del renglón */}
              <div className="flex shrink-0 items-center">
                <button
                  onClick={() => abrirEditar(compra)}
                  title="Editar"
                  className="flex size-7 items-center justify-center rounded-lg text-gray-300 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <Pencil className="size-3" />
                </button>
                <button
                  onClick={() => void eliminarCompra(compra)}
                  disabled={eliminando === compra.id}
                  title="Eliminar"
                  className="flex size-7 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
          ))}
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
