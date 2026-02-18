"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, PlusCircle, DollarSign, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Adicional {
  id: string;
  proyecto_id: string;
  descripcion: string;
  monto: number;
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
  SOLICITUD_CLIENTE: { bg: "bg-[#86868B]/10", text: "text-[#86868B]", label: "Solicitud" },
  APROBADO_GERENCIA: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "Aprobado" },
  PAGO_50_CONFIRMADO: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "50% Pagado" },
  EN_EJECUCION: { bg: "bg-[#007AFF]/10", text: "text-[#007AFF]", label: "En ejecución" },
  FINALIZADO: { bg: "bg-[#34C759]/10", text: "text-[#34C759]", label: "Finalizado" },
  SALDO_PENDIENTE: { bg: "bg-[#FF3B30]/10", text: "text-[#FF3B30]", label: "Saldo pendiente" },
};

export default function AdicionalesPage() {
  const [adicionales, setAdicionales] = useState<Adicional[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProyecto, setFilterProyecto] = useState("TODOS");

  useEffect(() => {
    async function fetch() {
      try {
        const [adRes, projRes] = await Promise.all([
          supabase
            .from("adicionales")
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

        if (adRes.data) {
          setAdicionales(
            (adRes.data as Record<string, unknown>[]).map((r) => ({
              id: r.id as string,
              proyecto_id: r.proyecto_id as string,
              descripcion: r.descripcion as string,
              monto: Number(r.monto) || 0,
              estado: (r.estado as string) ?? "SOLICITUD_CLIENTE",
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

  const filtered =
    filterProyecto === "TODOS"
      ? adicionales
      : adicionales.filter((a) => a.proyecto_id === filterProyecto);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">
            Adicionales
          </h1>
          <div className="flex items-center gap-3">
            {/* Filtro por proyecto */}
            <select
              value={filterProyecto}
              onChange={(e) => setFilterProyecto(e.target.value)}
              className="h-9 rounded-xl border border-[#D2D2D7] bg-white px-3 text-[13px] text-[#1D1D1F] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
            >
              <option value="TODOS">Todos los proyectos</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.cliente_nombre || "Sin nombre"}
                </option>
              ))}
            </select>

            <Button asChild className="rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]">
              <Link href="/adicionales/nuevo">
                <Plus className="size-4" />
                Nuevo Adicional
              </Link>
            </Button>
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
            <PlusCircle className="size-12 text-[#D2D2D7]" />
            <p className="text-[15px] text-[#1D1D1F]">No hay adicionales</p>
            <p className="text-sm text-[#86868B]">Crea el primer adicional para un proyecto</p>
            <Button asChild className="mt-2 rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]">
              <Link href="/adicionales/nuevo">
                <Plus className="size-4" />
                Nuevo Adicional
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ad) => {
              const st = ESTADO_STYLES[ad.estado] ?? ESTADO_STYLES.SOLICITUD_CLIENTE;
              return (
                <Link key={ad.id} href={`/adicionales/${ad.id}`}>
                  <article className="group rounded-2xl border border-[#D2D2D7]/60 bg-white p-5 transition-all duration-200 hover:border-[#D2D2D7] hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[12px] text-[#86868B]">
                          <Building2 className="size-3.5" />
                          <span>{ad.proyecto_nombre}</span>
                        </div>
                        <h3 className="mt-1 text-[14px] font-medium text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">
                          {ad.descripcion}
                        </h3>
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", st.bg, st.text)}>
                        {st.label}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[12px] text-[#86868B]">
                      <span className="flex items-center gap-1">
                        <DollarSign className="size-3.5" />
                        ${ad.monto.toLocaleString("es-CO")}
                      </span>
                      <span>
                        {format(new Date(ad.created_at), "d MMM yyyy", { locale: es })}
                      </span>
                      {ad.solicitado_por && <span>por {ad.solicitado_por}</span>}
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
