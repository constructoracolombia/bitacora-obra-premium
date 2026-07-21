"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Search, X, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
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
        .select("proyecto_id, item, cantidad, unidad")
        .eq("comprado", false);

      if (data) {
        const mapa = new Map<string, CompraPendiente[]>();
        for (const row of data as { proyecto_id: string; item: string; cantidad: number; unidad: string }[]) {
          const list = mapa.get(row.proyecto_id) ?? [];
          list.push({ item: row.item, cantidad: row.cantidad, unidad: row.unidad });
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
    <div className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Proyectos</h1>
          <Button
            onClick={() => router.push("/proyectos/nuevo")}
            className="bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
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
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
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

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {ESTADOS.map((e) => (
                <button
                  key={e}
                  onClick={() => setFiltro(e)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
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
              <span className="text-xs text-gray-400">
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

        {/* Tabla con acordeón */}
        {!loading && proyectosFiltrados.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200">
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
                      <>
                        <tr
                          key={proyecto.id}
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
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-white px-2.5 py-1 text-xs"
                                    >
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
                      </>
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
