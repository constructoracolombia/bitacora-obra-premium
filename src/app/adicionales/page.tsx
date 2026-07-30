"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Plus, X, Archive, ArchiveRestore } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import {
  sincronizarCobroAdicional,
  bucketDeEstado,
  ordenBucket,
  BUCKET_A_ESTADO,
  type BucketAdicional,
} from "@/lib/adicionales-cobro";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ProyectoCombobox, type Proyecto } from "@/components/proyecto-combobox";

interface Adicional {
  id: string;
  proyecto_id: string;
  descripcion: string;
  monto: number;
  estado: string;
  archivado: boolean;
  created_at: string;
  proyecto_nombre: string;
}

// Flujo simplificado a 3 pasos (Creación → Aprobación → Pago 100%, ver
// adicionales/[id]/page.tsx). Se mantienen los 6 valores históricos de
// `estado` sin migrar la tabla — cada uno cae en el bucket de 3 pasos
// que le corresponde, así los adicionales viejos (iniciar_trabajos,
// revision_final, etc.) se siguen viendo bien agrupados.
const FILTROS_ESTADO: { key: string; label: string; estados: string[] | null }[] = [
  { key: "TODOS", label: "Todos", estados: null },
  { key: "creado", label: "Creados", estados: ["solicitado", "pendiente_aprobacion"] },
  { key: "aprobado", label: "Aprobados", estados: ["pendiente_pago_50", "iniciar_trabajos", "revision_final"] },
  { key: "pagado", label: "Pagados", estados: ["entregado"] },
];

const BUCKET_STYLES: Record<BucketAdicional, string> = {
  creado: "bg-gray-100 text-gray-700",
  aprobado: "bg-orange-100 text-orange-700",
  pagado: "bg-green-100 text-green-700",
};

// Cambiar el paso directamente desde la lista, sin entrar al detalle —
// pedido explícito: "creado / aprobado / pagado 100%" en un desplegable.
function SelectorEstadoAdicional({
  ad,
  onChange,
}: {
  ad: Adicional;
  onChange: (bucket: BucketAdicional) => void;
}) {
  const bucket = bucketDeEstado(ad.estado);
  return (
    <select
      value={bucket}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value as BucketAdicional)}
      className={cn(
        "rounded-full border-0 px-2.5 py-1 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400",
        BUCKET_STYLES[bucket]
      )}
    >
      <option value="creado">Creado</option>
      <option value="aprobado">Aprobado</option>
      <option value="pagado">Pagado 100%</option>
    </select>
  );
}

const formatoCOP = (valor: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(valor);

export default function AdicionalesPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [adicionales, setAdicionales] = useState<Adicional[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [archivando, setArchivando] = useState<string | null>(null);

  const [filtroProyecto, setFiltroProyecto] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [vista, setVista] = useState<"activos" | "archivados">("activos");

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const [adRes, projRes] = await Promise.all([
      supabase.from("adicionales").select("*").order("created_at", { ascending: false }),
      supabase.from("proyectos_maestro").select("id, cliente_nombre").order("cliente_nombre"),
    ]);

    const projMap = new Map<string, string>();
    if (projRes.data) {
      setProyectos(projRes.data as Proyecto[]);
      (projRes.data as Proyecto[]).forEach((p) => projMap.set(p.id, p.cliente_nombre ?? "Sin nombre"));
    }

    if (adRes.data) {
      setAdicionales(
        (adRes.data as Record<string, unknown>[]).map((r) => ({
          id: r.id as string,
          proyecto_id: r.proyecto_id as string,
          descripcion: r.descripcion as string,
          monto: Number(r.monto) || 0,
          estado: (r.estado as string) ?? "solicitado",
          archivado: Boolean(r.archivado),
          created_at: (r.created_at as string) ?? "",
          proyecto_nombre: projMap.get(r.proyecto_id as string) ?? "Proyecto desconocido",
        }))
      );
    }
    setLoading(false);
  }

  async function toggleArchivado(ad: Adicional) {
    const nuevoValor = !ad.archivado;
    setArchivando(ad.id);
    setAdicionales((prev) =>
      prev.map((a) => (a.id === ad.id ? { ...a, archivado: nuevoValor } : a))
    );

    const { error } = await supabase
      .from("adicionales")
      .update({ archivado: nuevoValor })
      .eq("id", ad.id);

    if (error) {
      setAdicionales((prev) =>
        prev.map((a) => (a.id === ad.id ? { ...a, archivado: ad.archivado } : a))
      );
      alert("Error: " + error.message);
    }
    setArchivando(null);
  }

  // Cambiar el paso directamente desde la lista, sin entrar al detalle —
  // misma lógica y sincronización con cuentas_por_cobrar que el timeline
  // de adicionales/[id]/page.tsx (ver lib/adicionales-cobro.ts).
  async function cambiarEstado(ad: Adicional, nuevoBucket: BucketAdicional) {
    const bucketActual = bucketDeEstado(ad.estado);
    if (bucketActual === nuevoBucket) return;

    const destino = BUCKET_A_ESTADO[nuevoBucket];
    setAdicionales((prev) => prev.map((a) => (a.id === ad.id ? { ...a, estado: destino.estado } : a)));

    const { error } = await supabase
      .from("adicionales")
      .update({ estado: destino.estado, [destino.dateField]: new Date().toISOString() })
      .eq("id", ad.id);

    if (error) {
      setAdicionales((prev) => prev.map((a) => (a.id === ad.id ? { ...a, estado: ad.estado } : a)));
      alert("Error al cambiar estado: " + error.message);
      return;
    }

    const estabaAprobado = ordenBucket(bucketActual) >= 1;
    const quedaAprobado = ordenBucket(nuevoBucket) >= 1;
    if (!estabaAprobado && quedaAprobado) {
      await sincronizarCobroAdicional(supabase, ad, "sumar");
    } else if (estabaAprobado && !quedaAprobado) {
      await sincronizarCobroAdicional(supabase, ad, "restar");
    }
  }

  const filtrados = adicionales.filter((a) => {
    if (vista === "activos" && a.archivado) return false;
    if (vista === "archivados" && !a.archivado) return false;
    if (filtroProyecto !== "TODOS" && a.proyecto_id !== filtroProyecto) return false;
    if (filtroEstado !== "TODOS") {
      const grupo = FILTROS_ESTADO.find((f) => f.key === filtroEstado);
      if (grupo?.estados && !grupo.estados.includes(a.estado)) return false;
    }
    return true;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adicionales</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Trabajos adicionales por proyecto · flujo de aprobación y pago
          </p>
        </div>
        <Button onClick={() => router.push("/adicionales/nuevo")} className="h-11 sm:h-9">
          <Plus className="size-4 mr-1" />
          Nuevo Adicional
        </Button>
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

        <div className="flex w-full flex-wrap rounded-lg border border-gray-200 overflow-hidden bg-white text-sm sm:w-auto">
          {FILTROS_ESTADO.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              className={cn(
                "px-3 py-2.5 font-medium transition-colors whitespace-nowrap sm:py-1.5",
                filtroEstado === f.key
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex w-full rounded-lg border border-gray-200 overflow-hidden bg-white text-sm sm:w-auto">
          <button
            onClick={() => setVista("activos")}
            className={cn(
              "flex-1 px-3 py-2.5 font-medium transition-colors sm:flex-none sm:py-1.5",
              vista === "activos" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            Activos
          </button>
          <button
            onClick={() => setVista("archivados")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 font-medium transition-colors sm:flex-none sm:py-1.5",
              vista === "archivados" ? "bg-gray-700 text-white" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Archive className="size-3.5" />
            Archivados
          </button>
        </div>

        {(filtroProyecto !== "TODOS" || filtroEstado !== "TODOS" || vista !== "activos") && (
          <button
            onClick={() => {
              setFiltroProyecto("TODOS");
              setFiltroEstado("TODOS");
              setVista("activos");
            }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <X className="size-3" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla (desktop) / Tarjetas (móvil) */}
      {loading ? (
        <div className="flex justify-center py-16 text-gray-400 text-sm">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center text-gray-400 text-sm gap-2">
          <PlusCircle className="size-10 text-gray-200" />
          {vista === "archivados"
            ? "No hay adicionales archivados con estos filtros."
            : adicionales.length === 0
            ? "No hay adicionales registrados. Crea el primero con el botón de arriba."
            : "Sin resultados para los filtros seleccionados."}
        </div>
      ) : (
        <>
          {/* Tabla — desktop */}
          <div className="hidden rounded-xl border border-gray-200 overflow-hidden bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Adicional</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Proyecto</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 w-32">Valor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-28">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-44">Estado</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((ad) => {
                  return (
                    <tr
                      key={ad.id}
                      onClick={() => router.push(`/adicionales/${ad.id}`)}
                      className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[280px] truncate">
                        {ad.descripcion}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {ad.proyecto_nombre}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                        {formatoCOP(ad.monto)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {ad.created_at ? format(new Date(ad.created_at), "d MMM yyyy", { locale: es }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <SelectorEstadoAdicional ad={ad} onChange={(b) => void cambiarEstado(ad, b)} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void toggleArchivado(ad);
                          }}
                          disabled={archivando === ad.id}
                          title={ad.archivado ? "Desarchivar" : "Archivar"}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-40"
                        >
                          {ad.archivado ? (
                            <ArchiveRestore className="size-3.5" />
                          ) : (
                            <Archive className="size-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tarjetas — móvil */}
          <div className="space-y-3 md:hidden">
            {filtrados.map((ad) => {
              return (
                <div
                  key={ad.id}
                  onClick={() => router.push(`/adicionales/${ad.id}`)}
                  className="cursor-pointer rounded-xl border border-gray-200 bg-white p-3.5 active:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-gray-900">{ad.descripcion}</p>
                      <span className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {ad.proyecto_nombre}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleArchivado(ad);
                      }}
                      disabled={archivando === ad.id}
                      title={ad.archivado ? "Desarchivar" : "Archivar"}
                      className="flex size-11 shrink-0 items-center justify-center rounded-lg text-gray-400 active:bg-gray-100 disabled:opacity-40"
                    >
                      {ad.archivado ? (
                        <ArchiveRestore className="size-4" />
                      ) : (
                        <Archive className="size-4" />
                      )}
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <SelectorEstadoAdicional ad={ad} onChange={(b) => void cambiarEstado(ad, b)} />
                    <span className="font-medium text-gray-900 tabular-nums">{formatoCOP(ad.monto)}</span>
                  </div>

                  <div className="mt-1 text-xs text-gray-400">
                    {ad.created_at ? format(new Date(ad.created_at), "d MMM yyyy", { locale: es }) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
