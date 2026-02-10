"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { getSupabase, getProyectosTable } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NuevoProyectoPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    cliente_nombre: "",
    direccion: "",
    presupuesto_total: "",
    fecha_inicio: "",
    fecha_entrega_estimada: "",
    margen_objetivo: "20",
    residente_asignado: "",
    alcance_text: "",
    notas_generales: "",
  });

  function updateField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.cliente_nombre.trim()) {
      setError("El nombre del cliente es requerido");
      return;
    }
    if (!form.direccion.trim()) {
      setError("La dirección es requerida");
      return;
    }
    if (!form.presupuesto_total || Number(form.presupuesto_total) <= 0) {
      setError("El presupuesto es requerido");
      return;
    }
    if (!form.fecha_inicio) {
      setError("La fecha de inicio es requerida");
      return;
    }
    if (!form.fecha_entrega_estimada) {
      setError("La fecha de entrega es requerida");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const table = await getProyectosTable();
      const { data, error: insertErr } = await supabase
        .from(table)
        .insert({
          cliente_nombre: form.cliente_nombre.trim(),
          direccion: form.direccion.trim(),
          presupuesto_total: Number(form.presupuesto_total),
          fecha_inicio: form.fecha_inicio,
          fecha_entrega_estimada: form.fecha_entrega_estimada,
          margen_objetivo: Number(form.margen_objetivo) || 20,
          residente_asignado: form.residente_asignado.trim() || null,
          alcance_text: form.alcance_text.trim() || null,
          estado: "ACTIVO",
          porcentaje_avance: 0,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      if (data) {
        router.push(`/proyectos/${(data as { id: string }).id}`);
      } else {
        router.push("/proyectos");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear proyecto");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-8 py-4">
          <Button variant="ghost" size="icon" className="size-8 text-[#86868B] hover:bg-[#F5F5F7]" asChild>
            <Link href="/proyectos">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold tracking-tight text-[#1D1D1F]">
            Nuevo Proyecto
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info básica */}
          <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6 space-y-5">
            <h2 className="text-[14px] font-semibold text-[#1D1D1F]">Información del proyecto</h2>

            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Cliente *</Label>
              <Input
                value={form.cliente_nombre}
                onChange={(e) => updateField("cliente_nombre", e.target.value)}
                placeholder="Nombre del cliente o proyecto"
                className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Dirección *</Label>
              <Input
                value={form.direccion}
                onChange={(e) => updateField("direccion", e.target.value)}
                placeholder="Dirección de la obra"
                className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Presupuesto Total (COP) *</Label>
              <Input
                type="number"
                min="0"
                value={form.presupuesto_total}
                onChange={(e) => updateField("presupuesto_total", e.target.value)}
                placeholder="0"
                className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Fecha Inicio *</Label>
                <Input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) => updateField("fecha_inicio", e.target.value)}
                  className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Fecha Entrega *</Label>
                <Input
                  type="date"
                  value={form.fecha_entrega_estimada}
                  onChange={(e) => updateField("fecha_entrega_estimada", e.target.value)}
                  className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Margen Objetivo (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={form.margen_objetivo}
                  onChange={(e) => updateField("margen_objetivo", e.target.value)}
                  placeholder="20"
                  className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Residente Asignado</Label>
                <Input
                  value={form.residente_asignado}
                  onChange={(e) => updateField("residente_asignado", e.target.value)}
                  placeholder="Nombre del residente"
                  className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                />
              </div>
            </div>
          </div>

          {/* Alcance */}
          <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6 space-y-5">
            <h2 className="text-[14px] font-semibold text-[#1D1D1F]">Alcance y notas</h2>

            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Alcance del proyecto</Label>
              <textarea
                value={form.alcance_text}
                onChange={(e) => updateField("alcance_text", e.target.value)}
                placeholder="Describe el alcance: actividades incluidas, entregables, especificaciones..."
                rows={4}
                className="w-full rounded-xl border border-[#D2D2D7] px-4 py-3 text-[14px] leading-relaxed text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Notas generales</Label>
              <textarea
                value={form.notas_generales}
                onChange={(e) => updateField("notas_generales", e.target.value)}
                placeholder="Notas adicionales sobre el proyecto..."
                rows={3}
                className="w-full rounded-xl border border-[#D2D2D7] px-4 py-3 text-[14px] leading-relaxed text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-xl bg-[#FF3B30]/5 px-4 py-3 text-[13px] text-[#FF3B30]">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-[#D2D2D7]"
              onClick={() => router.push("/proyectos")}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5] disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Save className="size-4" />
                  Crear Proyecto
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
