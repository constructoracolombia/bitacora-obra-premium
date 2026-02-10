"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { getSupabase, getProyectosTable } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProyectoOption {
  id: string;
  cliente_nombre: string | null;
}

const TIPOS_MATERIAL = [
  "Preliminares",
  "Enchapes",
  "Estuco y Pintura",
  "Instalaciones",
  "Drywall",
  "Otros",
];

const UNIDADES = [
  { value: "und", label: "Unidades" },
  { value: "bulto", label: "Bultos" },
  { value: "m2", label: "m²" },
  { value: "m3", label: "m³" },
  { value: "kg", label: "kg" },
  { value: "gl", label: "Galones" },
  { value: "rollo", label: "Rollos" },
  { value: "ml", label: "Metros lineales" },
  { value: "mt", label: "mt" },
];

export default function NuevaRequisicionPage() {
  const router = useRouter();
  const [proyectos, setProyectos] = useState<ProyectoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    proyecto_id: "",
    apartamento: "",
    tipo_material: "Otros",
    descripcion: "",
    cantidad: "",
    unidad: "und",
    solicitado_por: "",
    notas: "",
  });

  useEffect(() => {
    async function fetch() {
      try {
        const supabase = getSupabase();
        const projTable = await getProyectosTable();
        const { data } = await supabase
          .from(projTable)
          .select("id, cliente_nombre")
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
    if (!form.proyecto_id || !form.apartamento.trim() || !form.descripcion.trim() || !form.cantidad) return;

    setSubmitting(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { error: insertErr } = await supabase.from("requisiciones").insert({
        proyecto_id: form.proyecto_id,
        apartamento: form.apartamento.trim(),
        tipo_material: form.tipo_material,
        descripcion: form.descripcion.trim(),
        cantidad: Number(form.cantidad),
        unidad: form.unidad,
        solicitado_por: form.solicitado_por.trim() || null,
        notas: form.notas.trim() || null,
        estado: "SOLICITADO",
      });

      if (insertErr) throw insertErr;
      router.push("/requisiciones");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear requisición");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    form.proyecto_id &&
    form.apartamento.trim() &&
    form.descripcion.trim() &&
    Number(form.cantidad) > 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-8 py-4">
          <Button variant="ghost" size="icon" className="size-8 text-[#86868B] hover:bg-[#F5F5F7]" asChild>
            <Link href="/requisiciones">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold tracking-tight text-[#1D1D1F]">
            Nueva Requisición
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6 space-y-5">
            {/* Proyecto */}
            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Proyecto</Label>
              <select
                value={form.proyecto_id}
                onChange={(e) => setForm((f) => ({ ...f, proyecto_id: e.target.value }))}
                className="h-11 w-full rounded-xl border border-[#D2D2D7] bg-white px-4 text-[14px] text-[#1D1D1F] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
              >
                <option value="">Selecciona un proyecto</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.cliente_nombre || "Sin nombre"}
                  </option>
                ))}
              </select>
            </div>

            {/* Apartamento */}
            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Apartamento</Label>
              <Input
                value={form.apartamento}
                onChange={(e) => setForm((f) => ({ ...f, apartamento: e.target.value }))}
                placeholder="Ej: Apto 101, Torre 2 Apto 305"
                className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
              />
            </div>

            {/* Tipo material */}
            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Tipo de Material</Label>
              <select
                value={form.tipo_material}
                onChange={(e) => setForm((f) => ({ ...f, tipo_material: e.target.value }))}
                className="h-11 w-full rounded-xl border border-[#D2D2D7] bg-white px-4 text-[14px] text-[#1D1D1F] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
              >
                {TIPOS_MATERIAL.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Descripcion */}
            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Descripción</Label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Ej: Cemento gris x 10 bultos, porcelanato 60x60..."
                rows={3}
                className="w-full rounded-xl border border-[#D2D2D7] px-4 py-3 text-[14px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
              />
            </div>

            {/* Cantidad + Unidad */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Cantidad</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cantidad}
                  onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                  placeholder="0"
                  className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Unidad</Label>
                <select
                  value={form.unidad}
                  onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-[#D2D2D7] bg-white px-4 text-[14px] text-[#1D1D1F] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
                >
                  {UNIDADES.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Solicitado por */}
            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Solicitado por</Label>
              <Input
                value={form.solicitado_por}
                onChange={(e) => setForm((f) => ({ ...f, solicitado_por: e.target.value }))}
                placeholder="Nombre del residente"
                className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
              />
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Notas (opcional)</Label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                placeholder="Notas adicionales..."
                rows={2}
                className="w-full rounded-xl border border-[#D2D2D7] px-4 py-3 text-[14px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-[#FF3B30]/5 px-4 py-3 text-[13px] text-[#FF3B30]">{error}</p>
          )}

          <Button
            type="submit"
            disabled={!canSubmit || submitting}
            className="w-full rounded-xl bg-[#007AFF] py-3 text-white shadow-sm hover:bg-[#0051D5] disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Send className="size-4" />
                Enviar Solicitud
              </>
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}
