// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, X } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProyectoOption {
  id: string;
  cliente_nombre: string;
  estado: string;
}

export default function NuevoCalendarioPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [proyectos, setProyectos] = useState<ProyectoOption[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    proyecto_id: "",
    fecha_acta_inicio: "",
    fecha_entrega_programada: "",
    notas: "",
  });

  useEffect(() => {
    cargarProyectos();
  }, []);

  async function cargarProyectos() {
    const { data } = await supabase
      .from("proyectos_maestro")
      .select("id, cliente_nombre, estado")
      .order("cliente_nombre");
    if (data) {
      setProyectos(
        (data as Record<string, unknown>[]).map((r) => ({
          id: r.id as string,
          cliente_nombre: (r.cliente_nombre as string) ?? "Sin nombre",
          estado: (r.estado as string) ?? "",
        }))
      );
    }
  }

  const proyectosFiltrados = proyectos.filter((p) =>
    p.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.proyecto_id || !form.fecha_acta_inicio || !form.fecha_entrega_programada) return;
    setGuardando(true);

    try {
      const { error } = await supabase
        .from("calendario_proyectos")
        .insert({
          proyecto_id: form.proyecto_id,
          fecha_acta_inicio: form.fecha_acta_inicio,
          fecha_entrega_programada: form.fecha_entrega_programada,
          notas: form.notas || null,
        });

      if (error) throw error;
      router.push("/calendario");
    } catch (err: any) {
      console.error("Error:", err);
      if (err.code === "23505") {
        alert("Este proyecto ya está programado en el calendario");
      } else {
        alert("Error al programar proyecto");
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-8 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-[#86868B] hover:bg-[#F5F5F7]"
            asChild
          >
            <Link href="/calendario">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold tracking-tight text-[#1D1D1F]">
            Programar Proyecto
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6 space-y-5">
            {/* Proyecto */}
            <div>
              <Label className="mb-1 text-[13px] text-[#86868B]">
                Proyecto *
              </Label>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#86868B]" />
                <Input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar proyecto..."
                  className="border-[#D2D2D7] pl-10 text-[14px] focus-visible:ring-[#007AFF]"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F]"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <select
                required
                value={form.proyecto_id}
                onChange={(e) =>
                  setForm({ ...form, proyecto_id: e.target.value })
                }
                className="w-full rounded-lg border border-[#D2D2D7] px-3 py-2 text-[14px] text-[#1D1D1F] transition-colors focus:border-[#007AFF] focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                size={5}
              >
                <option value="">Selecciona un proyecto</option>
                {proyectosFiltrados.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.cliente_nombre} ({p.estado})
                  </option>
                ))}
              </select>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 text-[13px] text-[#86868B]">
                  Fecha acta de inicio *
                </Label>
                <Input
                  type="date"
                  required
                  value={form.fecha_acta_inicio}
                  onChange={(e) =>
                    setForm({ ...form, fecha_acta_inicio: e.target.value })
                  }
                  className="border-[#D2D2D7] text-[14px] focus-visible:ring-[#007AFF]"
                />
              </div>

              <div>
                <Label className="mb-1 text-[13px] text-[#86868B]">
                  Fecha entrega programada *
                </Label>
                <Input
                  type="date"
                  required
                  value={form.fecha_entrega_programada}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fecha_entrega_programada: e.target.value,
                    })
                  }
                  className="border-[#D2D2D7] text-[14px] focus-visible:ring-[#007AFF]"
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <Label className="mb-1 text-[13px] text-[#86868B]">Notas</Label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                className="w-full rounded-lg border border-[#D2D2D7] px-3 py-2 text-[14px] text-[#1D1D1F] transition-colors focus:border-[#007AFF] focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                rows={3}
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={guardando}
              className="flex-1 rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
            >
              {guardando ? "Guardando..." : "Programar Proyecto"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="rounded-xl border-[#D2D2D7] text-[#86868B] hover:bg-[#F5F5F7]"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
