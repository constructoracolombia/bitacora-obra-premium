// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Send, Plus, Trash2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProyectoOption {
  id: string;
  cliente_nombre: string | null;
}

interface ItemLocal {
  descripcion: string;
  cantidad: string;
  unidad: string;
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

const ITEM_VACIO: ItemLocal = { descripcion: "", cantidad: "", unidad: "und" };

export default function NuevaRequisicionPage() {
  const supabase = getSupabaseClient();
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
    solicitado_por: "",
    notas: "",
  });

  const [items, setItems] = useState<ItemLocal[]>([]);
  const [nuevoItem, setNuevoItem] = useState<ItemLocal>({ ...ITEM_VACIO });

  useEffect(() => {
    async function fetchProyectos() {
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
    fetchProyectos();
  }, []);

  function agregarItem() {
    if (!nuevoItem.descripcion.trim()) return;
    setItems((prev) => [...prev, { ...nuevoItem }]);
    setNuevoItem({ ...ITEM_VACIO });
  }

  function eliminarItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.proyecto_id || !form.apartamento.trim() || !form.descripcion.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const { data: req, error: insertErr } = await supabase
        .from("requisiciones")
        .insert({
          proyecto_id: form.proyecto_id,
          apartamento: form.apartamento.trim(),
          tipo_material: form.tipo_material,
          descripcion: form.descripcion.trim(),
          cantidad: 1,
          unidad: "und",
          solicitado_por: form.solicitado_por.trim() || null,
          notas: form.notas.trim() || null,
          estado: "solicitada",
          fecha_solicitada: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      if (items.length > 0 && req?.id) {
        const itemsToInsert = items.map((item, idx) => ({
          requisicion_id: req.id,
          descripcion: item.descripcion,
          cantidad: item.cantidad ? Number(item.cantidad) : null,
          unidad: item.unidad || null,
          orden: idx,
          comprado: false,
          recibido: false,
        }));

        const { error: itemsErr } = await supabase
          .from("requisicion_items")
          .insert(itemsToInsert);

        if (itemsErr) throw itemsErr;
      }

      router.push("/requisiciones");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear requisición");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = form.proyecto_id && form.apartamento.trim() && form.descripcion.trim();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
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

          {/* Info general */}
          <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6 space-y-5">
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

            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Apartamento</Label>
              <Input
                value={form.apartamento}
                onChange={(e) => setForm((f) => ({ ...f, apartamento: e.target.value }))}
                placeholder="Ej: Apto 101, Torre 2 Apto 305"
                className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
              />
            </div>

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

            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Descripción general</Label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Ej: Materiales para cocina torre 2..."
                rows={2}
                className="w-full rounded-xl border border-[#D2D2D7] px-4 py-3 text-[14px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Solicitado por</Label>
              <Input
                value={form.solicitado_por}
                onChange={(e) => setForm((f) => ({ ...f, solicitado_por: e.target.value }))}
                placeholder="Nombre del residente"
                className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
              />
            </div>

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

          {/* Items */}
          <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6 space-y-4">
            <h2 className="text-[15px] font-semibold text-[#1D1D1F]">
              Items de la requisición
            </h2>

            {/* Agregar nuevo item */}
            <div className="rounded-xl bg-[#F5F5F7] p-4 space-y-3">
              <p className="text-[12px] font-medium text-[#86868B]">Agregar nuevo item</p>
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <Input
                  value={nuevoItem.descripcion}
                  onChange={(e) => setNuevoItem({ ...nuevoItem, descripcion: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarItem(); }}}
                  placeholder="Descripción del item *"
                  className="flex-1 h-10 rounded-lg border-[#D2D2D7] text-[13px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={nuevoItem.cantidad}
                  onChange={(e) => setNuevoItem({ ...nuevoItem, cantidad: e.target.value })}
                  placeholder="Cant."
                  className="w-20 h-10 rounded-lg border-[#D2D2D7] text-[13px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                />
                <select
                  value={nuevoItem.unidad}
                  onChange={(e) => setNuevoItem({ ...nuevoItem, unidad: e.target.value })}
                  className="h-10 rounded-lg border border-[#D2D2D7] bg-white px-2 text-[13px] text-[#1D1D1F] focus:border-[#007AFF] focus:outline-none"
                >
                  {UNIDADES.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  onClick={agregarItem}
                  disabled={!nuevoItem.descripcion.trim()}
                  className="h-10 px-4 rounded-lg bg-[#007AFF] text-white text-[13px] hover:bg-[#0066DD] disabled:opacity-40 shrink-0"
                >
                  <Plus className="size-4 mr-1" />
                  Agregar
                </Button>
              </div>
            </div>

            {/* Lista de items */}
            {items.length === 0 ? (
              <p className="text-center text-[13px] text-[#86868B] py-4">
                No hay items. Agrega el primero arriba.
              </p>
            ) : (
              <div>
                <div className="grid grid-cols-12 gap-2 px-2 pb-2 border-b border-[#D2D2D7]/60">
                  <span className="col-span-7 text-[12px] text-[#86868B]">Descripción</span>
                  <span className="col-span-4 text-[12px] text-[#86868B]">Cantidad</span>
                  <span className="col-span-1"></span>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 items-center gap-2 border-b border-[#D2D2D7]/40 py-3 px-2 hover:bg-[#F5F5F7] rounded-lg"
                  >
                    <span className="col-span-7 text-[14px] font-medium text-[#1D1D1F]">
                      {item.descripcion}
                    </span>
                    <span className="col-span-4 text-[13px] text-[#86868B]">
                      {item.cantidad || "—"} {item.unidad}
                    </span>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => eliminarItem(idx)}
                        className="p-1 rounded-lg text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="mt-4 rounded-xl bg-[#F5F5F7] p-3 text-center">
                  <p className="text-xl font-bold text-[#1D1D1F]">{items.length}</p>
                  <p className="text-[12px] text-[#86868B]">Total items</p>
                </div>
              </div>
            )}
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
