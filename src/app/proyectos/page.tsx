"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Search, X } from "lucide-react";
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

const formatoCOP = (valor: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(valor);

const ESTADOS = ["TODOS", "ACTIVO", "PAUSADO", "FINALIZADO"] as const;

export default function ProyectosPage() {
  const supabase = getSupabaseClient();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>("ACTIVO");
  const [busqueda, setBusqueda] = useState("");
  const router = useRouter();

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
    fetch();
  }, [filtro]);

  const proyectosFiltrados = proyectos.filter(
    (p) =>
      p.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.direccion?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Proyectos</h1>
          <Button
            onClick={() => router.push("/proyectos/nuevo")}
            className="bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proyecto
          </Button>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[#86868B]" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar proyecto por nombre o dirección..."
              className="h-11 w-full rounded-xl border border-[#D2D2D7] bg-white pl-10 pr-10 text-[14px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {ESTADOS.map((e) => (
              <button
                key={e}
                onClick={() => setFiltro(e)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  filtro === e
                    ? "bg-[#007AFF] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {e === "TODOS"
                  ? "Todos"
                  : e.charAt(0) + e.slice(1).toLowerCase() + "s"}
              </button>
            ))}
          </div>

          {!loading && proyectos.length > 0 && (
            <div className="text-[13px] text-[#86868B]">
              {busqueda ? (
                <>
                  Mostrando {proyectosFiltrados.length} de {proyectos.length}{" "}
                  proyecto{proyectos.length !== 1 ? "s" : ""}
                </>
              ) : (
                <>
                  {proyectosFiltrados.length} proyecto
                  {proyectosFiltrados.length !== 1 ? "s" : ""}
                </>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#007AFF] border-r-transparent" />
          </div>
        )}

        {!loading && proyectosFiltrados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Building2 className="mb-4 h-16 w-16 text-gray-300" />
            <p className="text-gray-600">
              {busqueda
                ? `No se encontraron proyectos con "${busqueda}"`
                : "No hay proyectos" +
                  (filtro !== "TODOS"
                    ? ` ${filtro.toLowerCase()}s`
                    : "")}
            </p>
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="mt-2 text-sm text-[#007AFF] hover:text-[#0051D5]"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        )}

        {!loading && proyectosFiltrados.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {proyectosFiltrados.map((proyecto) => (
              <div
                key={proyecto.id}
                onClick={() => router.push(`/proyectos/${proyecto.id}`)}
                className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {proyecto.cliente_nombre}
                    </h3>
                    {proyecto.direccion && (
                      <p className="mt-1 text-sm text-gray-600">
                        {proyecto.direccion}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      proyecto.estado === "ACTIVO"
                        ? "bg-green-50 text-green-700"
                        : proyecto.estado === "PAUSADO"
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-gray-50 text-gray-700"
                    )}
                  >
                    {proyecto.estado}
                  </span>
                </div>

                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Presupuesto</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatoCOP(proyecto.presupuesto_total)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Inicio</span>
                    <span className="text-sm text-gray-900">
                      {new Date(proyecto.fecha_inicio).toLocaleDateString(
                        "es-CO"
                      )}
                    </span>
                  </div>
                </div>

                {proyecto.app_origen === "FINANZAS" && (
                  <div className="mt-4 rounded-lg bg-blue-50 px-3 py-2">
                    <p className="text-xs text-blue-700">
                      Sincronizado desde Finanzas
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
