"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Package, Building2, Home, Tag } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Requisicion {
  id: string;
  proyecto_id: string;
  apartamento: string;
  tipo_material: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  estado: string;
  solicitado_por: string | null;
  created_at: string;
  proyecto_nombre?: string;
}

interface ProyectoOption {
  id: string;
  cliente_nombre: string | null;
}

const ESTADO_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  SOLICITADO: { bg: "bg-[#86868B]/10", text: "text-[#86868B]", label: "Solicitado" },
  APROBADO_COMPRA: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "Aprobado" },
  COMPRADO: { bg: "bg-[#007AFF]/10", text: "text-[#007AFF]", label: "Comprado" },
  RECIBIDO: { bg: "bg-[#34C759]/10", text: "text-[#34C759]", label: "Recibido" },
};

type FilterEstado = "TODOS" | "SOLICITADO" | "APROBADO_COMPRA" | "COMPRADO" | "RECIBIDO";

export default function RequisicionesPage() {
  const supabase = getSupabaseClient();
  const [requisiciones, setRequisiciones] = useState<Requisicion[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProyecto, setFilterProyecto] = useState("TODOS");
  const [filterEstado, setFilterEstado] = useState<FilterEstado>("TODOS");

  useEffect(() => {
    async function fetch() {
      try {
        const [reqRes, projRes] = await Promise.all([
          supabase
            .from("requisiciones")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("proyectos_maestro")
            .select("id, cliente_nombre")
            .order("cliente_nombre"),
        ]);

        const projMap = new Map<string, string>();
        if (projRes.data) {
          const list = projRes.data as ProyectoOption[];
          setProyectos(list);
          list.forEach((p) => projMap.set(p.id, p.cliente_nombre ?? "Sin nombre"));
        }

        if (reqRes.data) {
          setRequisiciones(
            (reqRes.data as Record<string, unknown>[]).map((r) => ({
              id: r.id as string,
              proyecto_id: r.proyecto_id as string,
              apartamento: r.apartamento as string,
              tipo_material: (r.tipo_material as string) ?? "Otros",
              descripcion: r.descripcion as string,
              cantidad: Number(r.cantidad) || 0,
              unidad: (r.unidad as string) ?? "und",
              estado: (r.estado as string) ?? "SOLICITADO",
              solicitado_por: (r.solicitado_por as string) ?? null,
              created_at: (r.created_at as string) ?? "",
              proyecto_nombre: projMap.get(r.proyecto_id as string) ?? "—",
            }))
          );
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  const filtered = requisiciones
    .filter((r) => filterProyecto === "TODOS" || r.proyecto_id === filterProyecto)
    .filter((r) => filterEstado === "TODOS" || r.estado === filterEstado);

  const estadoFilters: { value: FilterEstado; label: string }[] = [
    { value: "TODOS", label: "Todos" },
    { value: "SOLICITADO", label: "Solicitados" },
    { value: "APROBADO_COMPRA", label: "Aprobados" },
    { value: "COMPRADO", label: "Comprados" },
    { value: "RECIBIDO", label: "Recibidos" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-8 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">
              Requisiciones
            </h1>
            <Button asChild className="rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]">
              <Link href="/requisiciones/nueva">
                <Plus className="size-4" />
                Nueva Requisición
              </Link>
            </Button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              value={filterProyecto}
              onChange={(e) => setFilterProyecto(e.target.value)}
              className="h-8 rounded-lg border border-[#D2D2D7] bg-white px-3 text-[12px] text-[#1D1D1F] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
            >
              <option value="TODOS">Todos los proyectos</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.cliente_nombre || "Sin nombre"}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 rounded-xl bg-[#F5F5F7] p-0.5">
              {estadoFilters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilterEstado(f.value)}
                  className={cn(
                    "rounded-lg px-3 py-1 text-[12px] font-medium transition-all duration-200",
                    filterEstado === f.value
                      ? "bg-white text-[#1D1D1F] shadow-sm"
                      : "text-[#86868B] hover:text-[#1D1D1F]"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-8 py-8">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-[#007AFF]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
            <Package className="size-12 text-[#D2D2D7]" />
            <p className="text-[15px] text-[#1D1D1F]">No hay requisiciones</p>
            <p className="text-sm text-[#86868B]">Crea la primera requisición de material</p>
            <Button asChild className="mt-2 rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]">
              <Link href="/requisiciones/nueva">
                <Plus className="size-4" />
                Nueva Requisición
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => {
              const st = ESTADO_STYLES[req.estado] ?? ESTADO_STYLES.SOLICITADO;
              return (
                <Link key={req.id} href={`/requisiciones/${req.id}`}>
                  <article className="group rounded-2xl border border-[#D2D2D7]/60 bg-white p-5 transition-all duration-200 hover:border-[#D2D2D7] hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#86868B]">
                          <span className="flex items-center gap-1">
                            <Building2 className="size-3" />
                            {req.proyecto_nombre}
                          </span>
                          <span className="flex items-center gap-1">
                            <Home className="size-3" />
                            {req.apartamento}
                          </span>
                          <span className="flex items-center gap-1">
                            <Tag className="size-3" />
                            {req.tipo_material}
                          </span>
                        </div>
                        <h3 className="mt-1.5 text-[14px] font-medium text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">
                          {req.descripcion}
                        </h3>
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", st.bg, st.text)}>
                        {st.label}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[12px] text-[#86868B]">
                      <span>{req.cantidad} {req.unidad}</span>
                      <span>{format(new Date(req.created_at), "d MMM yyyy", { locale: es })}</span>
                      {req.solicitado_por && <span>por {req.solicitado_por}</span>}
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
