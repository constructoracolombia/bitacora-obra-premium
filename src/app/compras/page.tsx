"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { ShoppingCart, Plus, X, CheckCircle2, Circle, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

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
          created_at: r.created_at as string,
        }))
      );
    }
    setLoading(false);
  }

  async function toggleComprado(compra: Compra) {
    const nuevoValor = !compra.comprado;
    const nuevoAt = nuevoValor ? new Date().toISOString() : null;

    setToggling(compra.id);
    setCompras((prev) =>
      prev.map((c) =>
        c.id === compra.id ? { ...c, comprado: nuevoValor, comprado_at: nuevoAt } : c
      )
    );

    const { error } = await supabase
      .from("compras")
      .update({ comprado: nuevoValor, comprado_at: nuevoAt })
      .eq("id", compra.id);

    if (error) {
      setCompras((prev) =>
        prev.map((c) =>
          c.id === compra.id ? { ...c, comprado: compra.comprado, comprado_at: compra.comprado_at } : c
        )
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
    if (filtroEstado === "comprado" && !c.comprado) return false;
    if (filtroEstado === "urgente" && !c.urgente) return false;
    return true;
  });

  const pendientes = compras.filter((c) => !c.comprado).length;
  const comprados = compras.filter((c) => c.comprado).length;

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
        <Button onClick={abrirAgregar}>
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
          <div className="text-2xl font-bold text-orange-700">{pendientes}</div>
          <div className="text-sm text-orange-600">Pendientes</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="text-2xl font-bold text-green-700">{comprados}</div>
          <div className="text-sm text-green-600">Comprados</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <ProyectoCombobox
          value={filtroProyecto}
          onChange={setFiltroProyecto}
          proyectos={proyectos}
          incluirTodos
          placeholder="Todos los proyectos"
          className="min-w-[220px]"
        />

        <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white text-sm">
          {[
            { key: "TODOS", label: "Todos" },
            { key: "pendiente", label: "Pendientes" },
            { key: "comprado", label: "Comprados" },
            { key: "urgente", label: "Urgentes" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              className={cn(
                "px-3 py-1.5 font-medium transition-colors",
                filtroEstado === f.key
                  ? f.key === "urgente" ? "bg-red-500 text-white" : "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {(filtroProyecto !== "TODOS" || filtroEstado !== "TODOS") && (
          <button
            onClick={() => { setFiltroProyecto("TODOS"); setFiltroEstado("TODOS"); }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <X className="size-3" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
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
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-10" />
                <th className="text-left px-4 py-3 font-medium text-gray-500">Ítem</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">Cantidad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-20">Unidad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Proyecto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-28">Comprado el</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {comprasFiltradas.map((compra) => (
                <tr
                  key={compra.id}
                  className={cn(
                    "border-b border-gray-100 last:border-0 transition-colors",
                    compra.comprado
                      ? "bg-green-50/50"
                      : compra.urgente
                      ? "bg-red-50/50 hover:bg-red-50/80"
                      : "hover:bg-gray-50/60"
                  )}
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void toggleComprado(compra)}
                      disabled={toggling === compra.id}
                      title={compra.comprado ? "Marcar como pendiente" : "Marcar como comprado"}
                      className="transition-transform hover:scale-110 disabled:opacity-50"
                    >
                      {compra.comprado ? (
                        <CheckCircle2 className="size-5 text-green-500" />
                      ) : (
                        <Circle className="size-5 text-gray-300 hover:text-blue-400" />
                      )}
                    </button>
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 font-medium",
                      compra.comprado ? "line-through text-gray-400" : "text-gray-900"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {compra.item}
                      {compra.urgente && !compra.comprado && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          <AlertTriangle className="size-2.5" />
                          Urgente
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums">
                    {Number(compra.cantidad) % 1 === 0
                      ? Number(compra.cantidad).toFixed(0)
                      : Number(compra.cantidad).toString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{compra.unidad}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {compra.proyecto_nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {compra.comprado_at
                      ? format(new Date(compra.comprado_at), "d MMM yyyy", { locale: es })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => abrirEditar(compra)}
                        title="Editar"
                        className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => void eliminarCompra(compra)}
                        disabled={eliminando === compra.id}
                        title="Eliminar"
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal agregar / editar compra */}
      {mostrarForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editando ? "Editar compra" : "Agregar compra"}
              </h2>
              <button
                onClick={cerrarModal}
                className="text-gray-400 hover:text-gray-600"
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
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="w-32">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Unidad</label>
                  <input
                    list="unidades-list"
                    value={form.unidad}
                    onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))}
                    placeholder="und"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 has-[:checked]:border-red-200 has-[:checked]:bg-red-50">
                <input
                  type="checkbox"
                  checked={form.urgente}
                  onChange={(e) => setForm((f) => ({ ...f, urgente: e.target.checked }))}
                  className="size-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <AlertTriangle className="size-3.5 text-red-500" />
                  Urgente
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={cerrarModal}>
                Cancelar
              </Button>
              <Button
                onClick={() => void guardarCompra()}
                disabled={saving || !form.item.trim() || !form.proyecto_id}
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
