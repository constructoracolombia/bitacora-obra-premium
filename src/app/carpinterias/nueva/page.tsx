"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProyectoOption {
  id: string;
  cliente_nombre: string | null;
}

export default function NuevaCarpinteriaPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [proyectos, setProyectos] = useState<ProyectoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    proyecto_id: "",
    descripcion: "",
    ubicacion: "",
    tipo: "",
    dimensiones: "",
    material: "",
    acabado: "",
    responsable: "",
    costo_estimado: "",
    notas: "",
  });

  useEffect(() => {
    async function fetch() {
      try {
        const { data } = await supabase
          .from("proyectos_maestro")
          .select("id, cliente_nombre")
          .eq("estado", "ACTIVO")
          .order("cliente_nombre");
        if (data) setProyectos(data as ProyectoOption[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.proyecto_id || !form.descripcion.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const { error: insertErr } = await supabase.from("carpinterias").insert({
        proyecto_id: form.proyecto_id,
        descripcion: form.descripcion.trim(),
        ubicacion: form.ubicacion.trim() || null,
        tipo: form.tipo.trim() || null,
        dimensiones: form.dimensiones.trim() || null,
        material: form.material.trim() || null,
        acabado: form.acabado.trim() || null,
        responsable: form.responsable.trim() || null,
        costo_estimado: form.costo_estimado ? Number(form.costo_estimado) : null,
        notas: form.notas.trim() || null,
        estado: "asignada",
        fecha_asignada: new Date().toISOString(),
      });

      if (insertErr) throw insertErr;
      router.push("/carpinterias");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear carpintería");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = form.proyecto_id && form.descripcion.trim();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-8 py-4">
          <Button variant="ghost" size="icon" className="size-8 text-[#86868B] hover:bg-[#F5F5F7]" asChild>
            <Link href="/carpinterias">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold tracking-tight text-[#1D1D1F]">
            Nueva Carpintería
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Proyecto</Label>
              <select
                value={form.proyecto_id}
                onChange={(e) => setForm((f) => ({ ...f, proyecto_id: e.target.value }))}
                className="h-11 w-full rounded-xl border border-[#D2D2D7] bg-white px-4 text-[14px] text-[#1D1D1F] focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/10"
              >
                <option value="">Selecciona un proyecto</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.cliente_nombre || "Sin nombre"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Descripción *</Label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Ej: Mueble de cocina en L"
                rows={3}
                className="w-full rounded-xl border border-[#D2D2D7] px-4 py-3 text-[14px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Ubicación</Label>
                <Input
                  value={form.ubicacion}
                  onChange={(e) => setForm((f) => ({ ...f, ubicacion: e.target.value }))}
                  placeholder="Ej: Cocina"
                  className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-amber-600 focus:ring-amber-600/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Tipo</Label>
                <Input
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                  placeholder="Ej: Mueble de cocina"
                  className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-amber-600 focus:ring-amber-600/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Material</Label>
                <Input
                  value={form.material}
                  onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
                  placeholder="Ej: MDF"
                  className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-amber-600 focus:ring-amber-600/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Acabado</Label>
                <Input
                  value={form.acabado}
                  onChange={(e) => setForm((f) => ({ ...f, acabado: e.target.value }))}
                  placeholder="Ej: Laminado blanco"
                  className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-amber-600 focus:ring-amber-600/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Dimensiones</Label>
              <Input
                value={form.dimensiones}
                onChange={(e) => setForm((f) => ({ ...f, dimensiones: e.target.value }))}
                placeholder="Ej: 2.40m x 0.60m x 0.90m"
                className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-amber-600 focus:ring-amber-600/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Responsable</Label>
                <Input
                  value={form.responsable}
                  onChange={(e) => setForm((f) => ({ ...f, responsable: e.target.value }))}
                  placeholder="Nombre del carpintero"
                  className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-amber-600 focus:ring-amber-600/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Costo estimado</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.costo_estimado}
                  onChange={(e) => setForm((f) => ({ ...f, costo_estimado: e.target.value }))}
                  placeholder="0"
                  className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-amber-600 focus:ring-amber-600/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Notas</Label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                placeholder="Observaciones adicionales..."
                rows={3}
                className="w-full rounded-xl border border-[#D2D2D7] px-4 py-3 text-[14px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/10"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-[#FF3B30]/5 px-4 py-3 text-[13px] text-[#FF3B30]">{error}</p>
          )}

          <Button
            type="submit"
            disabled={!canSubmit || submitting}
            className="w-full rounded-xl bg-amber-600 py-3 text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Send className="size-4" />
                Crear Carpintería
              </>
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}
