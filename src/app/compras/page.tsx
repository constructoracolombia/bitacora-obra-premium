"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { ShoppingCart, Plus, X, CheckCircle2, Circle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Compra {
  id: string;
  item: string;
  cantidad: number;
  unidad: string;
  proyecto_id: string;
  proyecto_nombre: string;
  comprado: boolean;
  comprado_at: string | null;
  created_at: string;
}

interface Proyecto {
  id: string;
  cliente_nombre: string | null;
}

const UNIDADES_COMUNES = ["und", "m²", "ml", "kg", "lt", "gl", "bolsa", "rollo", "caja"];

// ─── Combobox con búsqueda ────────────────────────────────────────────────────

function ProyectoCombobox({
  value,
  onChange,
  proyectos,
  placeholder = "Selecciona un proyecto",
  incluirTodos = false,
  className = "",
}: {
  value: string;
  onChange: (id: string) => void;
  proyectos: Proyecto[];
  placeholder?: string;
  incluirTodos?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const opciones = useMemo(() => {
    const base: Proyecto[] = incluirTodos
      ? [{ id: "TODOS", cliente_nombre: "Todos los proyectos" }, ...proyectos]
      : proyectos;
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter((p) => (p.cliente_nombre ?? "").toLowerCase().includes(q));
  }, [proyectos, query, incluirTodos]);

  const labelActual = useMemo(() => {
    if (incluirTodos && value === "TODOS") return "Todos los proyectos";
    if (!value) return "";
    const p = proyectos.find((p) => p.id === value);
    return p ? (p.cliente_nombre ?? "Sin nombre") : "";
  }, [value, proyectos, incluirTodos]);

  useEffect(() => { setHighlighted(0); }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        setQuery("");
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      setHighlighted((h) => Math.min(h + 1, opciones.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setHighlighted((h) => Math.max(h - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter") {
      const op = opciones[highlighted];
      if (op) {
        onChange(op.id);
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={open ? query : labelActual}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(""); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 py-1.5 pl-3 pr-8 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
      </div>

      {open && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg text-sm">
          {opciones.length === 0 ? (
            <li className="px-3 py-2 text-gray-400">Sin resultados</li>
          ) : (
            opciones.map((p, i) => (
              <li
                key={p.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(p.id);
                  setOpen(false);
                  setQuery("");
                }}
                onMouseEnter={() => setHighlighted(i)}
                className={cn(
                  "cursor-pointer truncate px-3 py-2",
                  i === highlighted ? "bg-blue-50 text-blue-700" : "text-gray-800 hover:bg-gray-50"
                )}
              >
                {p.cliente_nombre ?? "Sin nombre"}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ComprasPage() {
  const supabase = getSupabaseClient();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const [filtroProyecto, setFiltroProyecto] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ item: "", cantidad: "1", unidad: "und", proyecto_id: "" });

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const [comprasRes, proyRes] = await Promise.all([
      supabase.from("compras").select("*").order("created_at", { ascending: false }),
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

  async function agregarCompra() {
    if (!form.item.trim() || !form.proyecto_id) return;
    setSaving(true);
    const { error } = await supabase.from("compras").insert({
      item: form.item.trim(),
      cantidad: parseFloat(form.cantidad) || 1,
      unidad: form.unidad.trim() || "und",
      proyecto_id: form.proyecto_id,
    });
    setSaving(false);
    if (error) { alert("Error: " + error.message); return; }
    setForm((f) => ({ ...f, item: "", cantidad: "1", unidad: "und" }));
    setMostrarForm(false);
    await cargar();
  }

  const comprasFiltradas = compras.filter((c) => {
    if (filtroProyecto !== "TODOS" && c.proyecto_id !== filtroProyecto) return false;
    if (filtroEstado === "pendiente" && c.comprado) return false;
    if (filtroEstado === "comprado" && !c.comprado) return false;
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
        <Button onClick={() => setMostrarForm(true)}>
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
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              className={cn(
                "px-3 py-1.5 font-medium transition-colors",
                filtroEstado === f.key
                  ? "bg-blue-600 text-white"
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
              </tr>
            </thead>
            <tbody>
              {comprasFiltradas.map((compra) => (
                <tr
                  key={compra.id}
                  className={cn(
                    "border-b border-gray-100 last:border-0 transition-colors",
                    compra.comprado ? "bg-green-50/50" : "hover:bg-gray-50/60"
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
                    {compra.item}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal agregar compra */}
      {mostrarForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setMostrarForm(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Agregar compra</h2>
              <button
                onClick={() => setMostrarForm(false)}
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
                  onKeyDown={(e) => e.key === "Enter" && void agregarCompra()}
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
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMostrarForm(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => void agregarCompra()}
                disabled={saving || !form.item.trim() || !form.proyecto_id}
              >
                {saving ? "Guardando..." : "Agregar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
