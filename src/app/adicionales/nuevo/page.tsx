// @ts-nocheck
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

export default function NuevoAdicionalPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [proyectos, setProyectos] = useState<ProyectoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    proyecto_id: "",
    descripcion: "",
    monto: "",
    solicitado_por: "",
  });

  useEffect(() => {
    async function fetch() {
      try {
        const { data } = await supabase
          .from("proyectos_maestro")
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
    if (!form.proyecto_id || !form.descripcion.trim() || !form.monto) return;

    setSubmitting(true);
    setError(null);

    try {
      const { error: insertErr } = await supabase.from("adicionales").insert({
        proyecto_id: form.proyecto_id,
        descripcion: form.descripcion.trim(),
        monto: Number(form.monto),
        solicitado_por: form.solicitado_por.trim() || null,
        estado: "SOLICITUD_CLIENTE",
      });

      if (insertErr) throw insertErr;
      router.push("/adicionales");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear adicional");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = form.proyecto_id && form.descripcion.trim() && Number(form.monto) > 0;

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
            <Link href="/adicionales">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold tracking-tight text-[#1D1D1F]">
            Nuevo Adicional
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

            {/* Descripcion */}
            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Descripción del adicional</Label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Describe el trabajo adicional solicitado..."
                rows={4}
                className="w-full rounded-xl border border-[#D2D2D7] px-4 py-3 text-[14px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
              />
            </div>

            {/* Monto */}
            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Monto (COP)</Label>
              <Input
                type="number"
                min="0"
                value={form.monto}
                onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
                placeholder="0"
                className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
              />
            </div>

            {/* Solicitado por */}
            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Solicitado por</Label>
              <Input
                value={form.solicitado_por}
                onChange={(e) => setForm((f) => ({ ...f, solicitado_por: e.target.value }))}
                placeholder="Nombre de quien solicita"
                className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
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
                Crear Adicional
              </>
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}
