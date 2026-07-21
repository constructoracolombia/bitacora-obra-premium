"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Plus, X, Archive, ArchiveRestore } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
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

const ESTADO_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  solicitado: { bg: "bg-gray-100", text: "text-gray-700", label: "Solicitud del cliente" },
  pendiente_aprobacion: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pendiente aprobación" },
  pendiente_pago_50: { bg: "bg-orange-100", text: "text-orange-700", label: "Pendiente pago 50%" },
  iniciar_trabajos: { bg: "bg-blue-100", text: "text-blue-700", label: "Iniciar trabajos" },
  revision_final: { bg: "bg-purple-100", text: "text-purple-700", label: "Revisión final" },
  entregado: { bg: "bg-green-100", text: "text-green-700", label: "Entregado" },
};

const FILTROS_ESTADO = [
  { key: "TODOS", label: "Todos" },
  { key: "solicitado", label: "Solicitudes" },
  { key: "pendiente_aprobacion", label: "Por aprobar" },
  { key: "pendiente_pago_50", label: "Por pagar" },
  { key: "iniciar_trabajos", label: "En trabajo" },
  { key: "revision_final", label: "En revisión" },
  { key: "entregado", label: "Entregados" },
];

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

  const filtrados = adicionales.filter((a) => {
    if (vista === "activos" && a.archivado) return false;
    if (vista === "archivados" && !a.archivado) return false;
    if (filtroProyecto !== "TODOS" && a.proyecto_id !== filtroProyecto) return false;
    if (filtroEstado !== "TODOS" && a.estado !== filtroEstado) return false;
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
        <Button onClick={() => router.push("/adicionales/nuevo")}>
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
          className="min-w-[220px]"
        />

        <div className="flex flex-wrap rounded-lg border border-gray-200 overflow-hidden bg-white text-sm">
          {FILTROS_ESTADO.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              className={cn(
                "px-3 py-1.5 font-medium transition-colors whitespace-nowrap",
                filtroEstado === f.key
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white text-sm">
          <button
            onClick={() => setVista("activos")}
            className={cn(
              "px-3 py-1.5 font-medium transition-colors",
              vista === "activos" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            Activos
          </button>
          <button
            onClick={() => setVista("archivados")}
            className={cn(
              "px-3 py-1.5 font-medium transition-colors flex items-center gap-1.5",
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

      {/* Tabla */}
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
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
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
                const st = ESTADO_STYLES[ad.estado] ?? ESTADO_STYLES.solicitado;
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
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", st.bg, st.text)}>
                        {st.label}
                      </span>
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
      )}
    </div>
  );
}
