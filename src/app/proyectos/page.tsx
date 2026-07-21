"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Search, X, ChevronRight, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Proyecto {
  id: string;
  cliente_nombre: string;
  direccion: string;
  presupuesto_total: number;
  fecha_inicio: string;
  fecha_entrega_estimada: string;
  estado: string;
  margen_objetivo: number;
  app_origen: string;
}

interface CompraPendiente {
  item: string;
  cantidad: number;
  unidad: string;
  urgente: boolean;
}

const formatoCOP = (valor: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(valor);

const ESTADOS = ["TODOS", "ACTIVO", "PAUSADO", "FINALIZADO"] as const;

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO:     "bg-green-50 text-green-700 ring-1 ring-green-200",
  PAUSADO:    "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  FINALIZADO: "bg-gray-50 text-gray-600 ring-1 ring-gray-200",
};

export default function ProyectosPage() {
  const supabase = getSupabaseClient();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>("ACTIVO");
  const [busqueda, setBusqueda] = useState("");
  const router = useRouter();

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [comprasPendientes, setComprasPendientes] = useState<Map<string, CompraPendiente[]>>(new Map());

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        let query = supabase
          .from("proyectos_maestro")
          .select("*")
          .order("created_at", { ascending: false });

        if (filtro !== "TODOS") {
          query = query.eq("estado", filtro);
        }

        const { data, error } = await query;
        if (error) throw error;
        setProyectos(data || []);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    void fetch();
  }, [filtro]);

  useEffect(() => {
    async function cargarCompras() {
      const { data } = await supabase
        .from("compras")
        .select("proyecto_id, item, cantidad, unidad, urgente")
        .eq("comprado", false)
        .order("urgente", { ascending: false });

      if (data) {
        const mapa = new Map<string, CompraPendiente[]>();
        for (const row of data as { proyecto_id: string; item: string; cantidad: number; unidad: string; urgente: boolean }[]) {
          const list = mapa.get(row.proyecto_id) ?? [];
          list.push({ item: row.item, cantidad: row.cantidad, unidad: row.unidad, urgente: row.urgente });
          mapa.set(row.proyecto_id, list);
        }
        setComprasPendientes(mapa);
      }
    }
    void cargarCompras();
  }, []);

  function toggleExpand(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const proyectosFiltrados = proyectos.filter(
    (p) =>
      p.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.direccion?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Proyectos</h1>
          <Button
            onClick={() => router.push("/proyectos/nuevo")}
            className="h-11 bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5] sm:h-9"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proyecto
          </Button>
        </div>

        {/* Filtros y buscador */}
        <div className="mb-5 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o dirección..."
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-gray-900 placeholder:text-gray-400 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10 sm:h-10"
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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 overflow-x-auto">
              {ESTADOS.map((e) => (
                <button
                  key={e}
                  onClick={() => setFiltro(e)}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors sm:py-1.5",
                    filtro === e
                      ? "bg-[#007AFF] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {e === "TODOS" ? "Todos" : e.charAt(0) + e.slice(1).toLowerCase() + "s"}
                </button>
              ))}
            </div>

            {!loading && (
              <span className="shrink-0 text-xs text-gray-400 sm:pl-2">
                {proyectosFiltrados.length} proyecto{proyectosFiltrados.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Cargando */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#007AFF] border-r-transparent" />
          </div>
        )}

        {/* Vacío */}
        {!loading && proyectosFiltrados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 className="mb-3 size-14 text-gray-200" />
            <p className="text-sm text-gray-500">
              {busqueda
                ? `Sin resultados para "${busqueda}"`
                : `No hay proyectos${filtro !== "TODOS" ? ` ${filtro.toLowerCase()}s` : ""}`}
            </p>
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="mt-2 text-sm text-[#007AFF] hover:underline"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        )}

        {/* Tarjetas con acordeón — móvil */}
        {!loading && proyectosFiltrados.length > 0 && (
          <div className="space-y-3 md:hidden">
            {proyectosFiltrados.map((proyecto) => {
              const pendientes = comprasPendientes.get(proyecto.id) ?? [];
              const expandido = expandidos.has(proyecto.id);

              return (
                <div key={proyecto.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <div
                    onClick={() => router.push(`/proyectos/${proyecto.id}`)}
                    className="cursor-pointer p-3.5 active:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-gray-900">{proyecto.cliente_nombre}</span>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                              ESTADO_BADGE[proyecto.estado] ?? "bg-gray-50 text-gray-600 ring-1 ring-gray-200"
                            )}
                          >
                            {proyecto.estado.charAt(0) + proyecto.estado.slice(1).toLowerCase()}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-gray-500">{proyecto.direccion || "—"}</p>
                      </div>
                      <button
                        onClick={(e) => toggleExpand(proyecto.id, e)}
                        title={expandido ? "Colapsar" : "Ver compras pendientes"}
                        className="flex size-11 shrink-0 items-center justify-center rounded-lg active:bg-gray-100"
                      >
                        {expandido ? (
                          <ChevronUp className="size-4 text-gray-500" />
                        ) : pendientes.length > 0 ? (
                          <ChevronDown className="size-4 text-orange-400" />
                        ) : (
                          <ChevronRight className="size-4 text-gray-300" />
                        )}
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900 tabular-nums">
                        {formatoCOP(proyecto.presupuesto_total ?? 0)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {proyecto.fecha_inicio
                          ? new Date(proyecto.fecha_inicio + "T12:00:00").toLocaleDateString("es-CO", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {pendientes.length > 0 && (
                        <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                          {pendientes.length} por comprar
                        </span>
                      )}
                      {proyecto.app_origen === "FINANZAS" && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 ring-1 ring-blue-200">
                          Finanzas
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Compras pendientes expandidas */}
                  {expandido && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="border-t border-orange-100 bg-orange-50/30 px-3.5 py-3"
                    >
                      {pendientes.length === 0 ? (
                        <p className="text-xs text-gray-400">Sin compras pendientes</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {pendientes.map((c, idx) => (
                            <span
                              key={idx}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-xs",
                                c.urgente ? "border-red-300 bg-red-50/60" : "border-orange-200"
                              )}
                            >
                              {c.urgente && <AlertTriangle className="size-3 text-red-500" />}
                              <span className="font-medium text-gray-800">{c.item}</span>
                              <span className="text-gray-400">
                                {Number(c.cantidad) % 1 === 0
                                  ? Number(c.cantidad).toFixed(0)
                                  : c.cantidad}{" "}
                                {c.unidad}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tabla con acordeón — desktop */}
        {!loading && proyectosFiltrados.length > 0 && (
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Proyecto</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Dirección</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Presupuesto</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Inicio</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Origen</th>
                    <th className="w-20 px-4 py-3 text-center font-medium text-gray-500">Compras</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectosFiltrados.map((proyecto, i) => {
                    const pendientes = comprasPendientes.get(proyecto.id) ?? [];
                    const expandido = expandidos.has(proyecto.id);

                    return (
                      <Fragment key={proyecto.id}>
                        <tr
                          onClick={() => router.push(`/proyectos/${proyecto.id}`)}
                          className={cn(
                            "cursor-pointer border-b border-gray-100 transition-colors",
                            expandido ? "border-gray-200" : "last:border-0",
                            i % 2 === 0 ? "bg-white" : "bg-gray-50/40",
                            "hover:bg-blue-50/40"
                          )}
                        >
                          {/* Nombre + badge */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900">
                                {proyecto.cliente_nombre}
                              </span>
                              {pendientes.length > 0 && (
                                <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                                  {pendientes.length} por comprar
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-gray-500 max-w-[180px] truncate">
                            {proyecto.direccion || "—"}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-gray-900 tabular-nums">
                            {formatoCOP(proyecto.presupuesto_total ?? 0)}
                          </td>
                          <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                            {proyecto.fecha_inicio
                              ? new Date(proyecto.fecha_inicio + "T12:00:00").toLocaleDateString("es-CO", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                ESTADO_BADGE[proyecto.estado] ?? "bg-gray-50 text-gray-600 ring-1 ring-gray-200"
                              )}
                            >
                              {proyecto.estado.charAt(0) + proyecto.estado.slice(1).toLowerCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {proyecto.app_origen === "FINANZAS" ? (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600 ring-1 ring-blue-200">
                                Finanzas
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          {/* Botón expandir — stopPropagation evita navegar al hacer clic aquí */}
                          <td className="px-4 py-3.5 text-center">
                            <button
                              onClick={(e) => toggleExpand(proyecto.id, e)}
                              title={expandido ? "Colapsar" : "Ver compras pendientes"}
                              className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-gray-100"
                            >
                              {expandido ? (
                                <ChevronUp className="size-4 text-gray-500" />
                              ) : pendientes.length > 0 ? (
                                <ChevronDown className="size-4 text-orange-400" />
                              ) : (
                                <ChevronRight className="size-4 text-gray-300" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Fila expandida con compras pendientes */}
                        {expandido && (
                          <tr
                            key={`${proyecto.id}-compras`}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "border-b border-gray-200",
                              i % 2 === 0 ? "bg-orange-50/20" : "bg-orange-50/30"
                            )}
                          >
                            <td colSpan={7} className="px-6 py-3">
                              {pendientes.length === 0 ? (
                                <p className="text-xs text-gray-400">Sin compras pendientes</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {pendientes.map((c, idx) => (
                                    <span
                                      key={idx}
                                      className={cn(
                                        "inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1 text-xs",
                                        c.urgente ? "border-red-300 bg-red-50/60" : "border-orange-200"
                                      )}
                                    >
                                      {c.urgente && <AlertTriangle className="size-3 text-red-500" />}
                                      <span className="font-medium text-gray-800">{c.item}</span>
                                      <span className="text-gray-400">
                                        {Number(c.cantidad) % 1 === 0
                                          ? Number(c.cantidad).toFixed(0)
                                          : c.cantidad}{" "}
                                        {c.unidad}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
