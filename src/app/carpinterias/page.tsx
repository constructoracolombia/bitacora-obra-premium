"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Hammer } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Carpinteria {
  id: string;
  proyecto_id: string;
  descripcion: string;
  ubicacion: string | null;
  tipo: string | null;
  estado: string;
  fecha_asignada: string | null;
  fecha_toma_medidas: string | null;
  fecha_pago_corte: string | null;
  fecha_recepcion_material: string | null;
  fecha_armado: string | null;
  fecha_instalacion: string | null;
  fecha_revision_final: string | null;
  created_at: string;
  proyecto_nombre?: string;
}

const ESTADO_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  asignada: { bg: "bg-[#86868B]/10", text: "text-[#86868B]", label: "Asignada" },
  toma_medidas: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "Toma de medidas" },
  pago_corte: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "Pago corte" },
  recepcion_material: { bg: "bg-[#007AFF]/10", text: "text-[#007AFF]", label: "Material recibido" },
  armado: { bg: "bg-[#007AFF]/10", text: "text-[#007AFF]", label: "Armado" },
  instalacion: { bg: "bg-[#34C759]/10", text: "text-[#34C759]", label: "Instalación" },
  revision_final: { bg: "bg-[#34C759]/10", text: "text-[#34C759]", label: "Revisión final" },
};

const FILTROS = [
  { key: "TODAS", label: "Todas" },
  { key: "asignada", label: "Asignada" },
  { key: "toma_medidas", label: "Toma de medidas" },
  { key: "pago_corte", label: "Pago corte" },
  { key: "recepcion_material", label: "Material recibido" },
  { key: "armado", label: "Armado" },
  { key: "instalacion", label: "Instalación" },
  { key: "revision_final", label: "Revisión final" },
];

export default function CarpinteriasPage() {
  const supabase = getSupabaseClient();
  const [carpinterias, setCarpinterias] = useState<Carpinteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("TODAS");

  useEffect(() => {
    async function fetch() {
      try {
        const [carpRes, projRes] = await Promise.all([
          supabase
            .from("carpinterias")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("proyectos_maestro")
            .select("id, cliente_nombre")
            .order("cliente_nombre"),
        ]);

        const projMap = new Map<string, string>();
        if (projRes.data) {
          (projRes.data as { id: string; cliente_nombre: string | null }[]).forEach((p) =>
            projMap.set(p.id, p.cliente_nombre ?? "Sin nombre")
          );
        }

        if (carpRes.data) {
          setCarpinterias(
            (carpRes.data as Record<string, unknown>[]).map((r) => ({
              id: r.id as string,
              proyecto_id: r.proyecto_id as string,
              descripcion: r.descripcion as string,
              ubicacion: (r.ubicacion as string) ?? null,
              tipo: (r.tipo as string) ?? null,
              estado: (r.estado as string) ?? "asignada",
              fecha_asignada: (r.fecha_asignada as string) ?? null,
              fecha_toma_medidas: (r.fecha_toma_medidas as string) ?? null,
              fecha_pago_corte: (r.fecha_pago_corte as string) ?? null,
              fecha_recepcion_material: (r.fecha_recepcion_material as string) ?? null,
              fecha_armado: (r.fecha_armado as string) ?? null,
              fecha_instalacion: (r.fecha_instalacion as string) ?? null,
              fecha_revision_final: (r.fecha_revision_final as string) ?? null,
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

  const filtered =
    filtro === "TODAS"
      ? carpinterias
      : carpinterias.filter((c) => c.estado === filtro);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Hammer className="size-6 text-amber-600" />
            <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">
              Carpintería
            </h1>
          </div>
          <Button asChild className="rounded-xl bg-amber-600 text-white shadow-sm hover:bg-amber-700">
            <Link href="/carpinterias/nueva">
              <Plus className="size-4" />
              Nueva Carpintería
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-8 pt-5">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
                filtro === f.key
                  ? "bg-amber-600 text-white"
                  : "bg-[#F5F5F7] text-[#86868B] hover:bg-[#E8E8ED]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-8 py-6">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-amber-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
            <Hammer className="size-12 text-[#D2D2D7]" />
            <p className="text-[15px] text-[#1D1D1F]">No hay carpinterías</p>
            <p className="text-sm text-[#86868B]">Registra la primera carpintería para un proyecto</p>
            <Button asChild className="mt-2 rounded-xl bg-amber-600 text-white shadow-sm hover:bg-amber-700">
              <Link href="/carpinterias/nueva">
                <Plus className="size-4" />
                Nueva Carpintería
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((carp) => {
              const st = ESTADO_STYLES[carp.estado] ?? ESTADO_STYLES.asignada;
              return (
                <Link key={carp.id} href={`/carpinterias/${carp.id}`}>
                  <article className="group rounded-2xl border border-[#D2D2D7]/60 bg-white p-5 transition-all duration-200 hover:border-[#D2D2D7] hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] text-[#86868B]">
                          {carp.proyecto_nombre}
                        </p>
                        <h3 className="mt-1 text-[14px] font-medium text-[#1D1D1F] transition-colors group-hover:text-amber-600">
                          {carp.descripcion}
                        </h3>
                        {carp.ubicacion && (
                          <p className="mt-0.5 text-[12px] text-[#86868B]">
                            📍 {carp.ubicacion}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                          st.bg,
                          st.text
                        )}
                      >
                        {st.label}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-4 border-t border-[#D2D2D7]/40 pt-3 text-[12px] text-[#86868B]">
                      {carp.tipo && <span>{carp.tipo}</span>}
                      {carp.fecha_asignada && (
                        <span>
                          Asignada:{" "}
                          {format(new Date(carp.fecha_asignada), "d MMM yyyy", {
                            locale: es,
                          })}
                        </span>
                      )}
                      {carp.fecha_instalacion && (
                        <span>
                          Instalada:{" "}
                          {format(new Date(carp.fecha_instalacion), "d MMM yyyy", {
                            locale: es,
                          })}
                        </span>
                      )}
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
