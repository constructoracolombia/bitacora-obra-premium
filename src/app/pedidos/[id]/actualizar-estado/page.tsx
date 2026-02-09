"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PedidoData {
  id: string;
  item: string;
  cantidad: number;
  unidad: string | null;
  costo_estimado: number | null;
  estado: string;
  cantidad_real: number | null;
  costo_real: number | null;
  factura_url: string | null;
  fecha_consumo: string | null;
  notas_consumo: string | null;
}

const DIFERENCIA_ALERTA = 10;
const SOBRECOSTO_WARNING = 1.15;

export default function ActualizarEstadoPage() {
  const params = useParams();
  const pedidoId = params.id as string;

  const [pedido, setPedido] = useState<PedidoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    cantidad_real: "",
    costo_real: "",
    fecha_recepcion: format(new Date(), "yyyy-MM-dd"),
    notas: "",
  });
  const [facturaFile, setFacturaFile] = useState<File | null>(null);
  const inputFacturaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchPedido() {
      try {
        const supabase = getSupabase();
        const { data, error: err } = await supabase
          .from("pedidos_material")
          .select(
            "id, item, cantidad, unidad, costo_estimado, estado, cantidad_real, costo_real, factura_url, fecha_consumo, notas_consumo"
          )
          .eq("id", pedidoId)
          .single();

        if (err || !data) {
          setPedido(null);
          return;
        }

        const row = data as Record<string, unknown>;
        setPedido({
          id: row.id as string,
          item: row.item as string,
          cantidad: Number(row.cantidad),
          unidad: row.unidad as string | null,
          costo_estimado: row.costo_estimado != null ? Number(row.costo_estimado) : null,
          estado: row.estado as string,
          cantidad_real: row.cantidad_real != null ? Number(row.cantidad_real) : null,
          costo_real: row.costo_real != null ? Number(row.costo_real) : null,
          factura_url: row.factura_url as string | null,
          fecha_consumo: row.fecha_consumo as string | null,
          notas_consumo: row.notas_consumo as string | null,
        });

        if (row.cantidad_real != null || row.costo_real != null) {
          setForm({
            cantidad_real: String(row.cantidad_real ?? row.cantidad),
            costo_real: String(row.costo_real ?? row.costo_estimado ?? ""),
            fecha_recepcion: row.fecha_consumo
              ? format(new Date(row.fecha_consumo as string), "yyyy-MM-dd")
              : format(new Date(), "yyyy-MM-dd"),
            notas: (row.notas_consumo as string) ?? "",
          });
        }
      } catch (err) {
        console.error(err);
        setPedido(null);
      } finally {
        setLoading(false);
      }
    }

    if (pedidoId) fetchPedido();
  }, [pedidoId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pedido) return;

    const cantidadReal = parseFloat(form.cantidad_real);
    const costoReal = parseFloat(form.costo_real.replace(/\D/g, "")) || 0;

    if (cantidadReal <= 0) {
      setError("La cantidad real debe ser mayor a 0");
      return;
    }
    if (costoReal <= 0) {
      setError("El costo real no puede ser 0");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const supabase = getSupabase();
      let facturaUrl: string | null = null;

      if (facturaFile) {
        const ext = facturaFile.name.split(".").pop() ?? "pdf";
        const path = `pedidos/${pedidoId}/factura/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("proyecto-evidencias")
          .upload(path, facturaFile, { upsert: false });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("proyecto-evidencias")
            .getPublicUrl(path);
          facturaUrl = urlData.publicUrl;
        }
      }

      const { error: updateErr } = await supabase
        .from("pedidos_material")
        .update({
          estado: "CONSUMED",
          cantidad_real: cantidadReal,
          costo_real: costoReal,
          factura_url: facturaUrl,
          fecha_consumo: form.fecha_recepcion,
          notas_consumo: form.notas.trim() || null,
        })
        .eq("id", pedidoId);

      if (updateErr) throw updateErr;

      setSuccess(true);
      setPedido((prev) =>
        prev
          ? {
              ...prev,
              estado: "CONSUMED",
              cantidad_real: cantidadReal,
              costo_real: costoReal,
              factura_url: facturaUrl,
              fecha_consumo: form.fecha_recepcion,
              notas_consumo: form.notas.trim() || null,
            }
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  const costoEstimado = pedido?.costo_estimado ?? 0;
  const costoReal = parseFloat(form.costo_real.replace(/\D/g, "")) || 0;
  const diferenciaPct =
    costoEstimado > 0 && costoReal > 0
      ? ((costoReal - costoEstimado) / costoEstimado) * 100
      : 0;
  const haySobrecosto = costoEstimado > 0 && costoReal > costoEstimado * SOBRECOSTO_WARNING;
  const hayAlertaDiferencia = Math.abs(diferenciaPct) > DIFERENCIA_ALERTA;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-6">
        <p className="text-[#86868B]">Pedido no encontrado</p>
        <Button variant="outline" className="rounded-xl border-[#D2D2D7]" asChild>
          <Link href="/pedidos/nuevo">Volver a pedidos</Link>
        </Button>
      </div>
    );
  }

  if (pedido.estado === "CONSUMED") {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="mx-auto max-w-lg">
          <Button variant="ghost" size="icon" className="size-8 text-[#86868B] hover:bg-[#F5F5F7]" asChild>
            <Link href="/pedidos/nuevo">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="mt-4 rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
            <div className="flex items-center gap-2 text-[#34C759]">
              <CheckCircle2 className="size-5" />
              <h2 className="text-[15px] font-semibold">Pedido ya consumido</h2>
            </div>
            <p className="mt-2 text-[13px] text-[#86868B]">
              Este pedido fue marcado como consumido el{" "}
              {pedido.fecha_consumo
                ? format(new Date(pedido.fecha_consumo), "d MMM yyyy", { locale: es })
                : "—"}
              .
            </p>
            <Button variant="outline" className="mt-4 rounded-xl border-[#D2D2D7]" asChild>
              <Link href="/pedidos/nuevo">Volver a pedidos</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (pedido.estado !== "DELIVERED") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-6">
        <p className="text-[#86868B]">
          Este pedido debe estar en estado &quot;Entregado&quot; para marcarlo como consumido.
        </p>
        <Button variant="outline" className="rounded-xl border-[#D2D2D7]" asChild>
          <Link href="/pedidos/nuevo">Volver a pedidos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-lg">
        <Button variant="ghost" size="icon" className="size-8 text-[#86868B] hover:bg-[#F5F5F7]" asChild>
          <Link href="/pedidos/nuevo">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        <div className="mt-4 rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
          <h1 className="text-lg font-semibold tracking-tight text-[#1D1D1F]">
            Marcar como Consumido
          </h1>
          <p className="mt-1 text-[13px] text-[#86868B]">
            Registra los datos reales de recepción del pedido.
          </p>

          {success ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-[#34C759]/10 p-4 text-[#34C759]">
                <CheckCircle2 className="size-5 shrink-0" />
                <span className="text-[13px] font-medium">Pedido marcado como consumido</span>
              </div>
              {hayAlertaDiferencia && (
                <div
                  className={cn(
                    "rounded-xl border p-4 text-[13px]",
                    diferenciaPct > 0
                      ? "border-[#FF9500]/30 bg-[#FF9500]/10 text-[#FF9500]"
                      : "border-[#34C759]/30 bg-[#34C759]/10 text-[#34C759]"
                  )}
                >
                  <span className="font-medium">
                    Diferencia vs estimado: {diferenciaPct > 0 ? "+" : ""}
                    {diferenciaPct.toFixed(1)}%
                  </span>
                  {diferenciaPct > DIFERENCIA_ALERTA && (
                    <span className="ml-2 rounded-full bg-[#FF3B30]/10 px-2 py-0.5 text-[11px] font-medium text-[#FF3B30]">
                      Alerta
                    </span>
                  )}
                </div>
              )}
              <Button variant="outline" className="rounded-xl border-[#D2D2D7]" asChild>
                <Link href="/pedidos/nuevo">Volver a pedidos</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              {/* Read-only data */}
              <div className="space-y-3 rounded-xl border border-[#D2D2D7]/40 bg-[#F5F5F7]/50 p-4">
                <h3 className="text-[13px] font-medium text-[#1D1D1F]">
                  Datos del pedido
                </h3>
                <div className="grid gap-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-[#86868B]">Item</span>
                    <span className="font-medium text-[#1D1D1F]">{pedido.item}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#86868B]">Cantidad solicitada</span>
                    <span className="font-medium text-[#1D1D1F]">
                      {pedido.cantidad} {pedido.unidad ?? "und"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#86868B]">Costo estimado</span>
                    <span className="font-medium text-[#1D1D1F]">
                      ${(pedido.costo_estimado ?? 0).toLocaleString("es-CO")} COP
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Cantidad real recibida *</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.cantidad_real}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cantidad_real: e.target.value }))
                    }
                    placeholder={String(pedido.cantidad)}
                    className="h-11 rounded-xl border-[#D2D2D7] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Costo real pagado (COP) *</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={
                      form.costo_real
                        ? Number(form.costo_real).toLocaleString("es-CO")
                        : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      setForm((f) => ({ ...f, costo_real: v }));
                    }}
                    placeholder="0"
                    className="h-11 rounded-xl border-[#D2D2D7] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Fecha de recepción *</Label>
                  <Input
                    type="date"
                    value={form.fecha_recepcion}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fecha_recepcion: e.target.value }))
                    }
                    className="h-11 rounded-xl border-[#D2D2D7] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Notas adicionales (opcional)</Label>
                  <textarea
                    value={form.notas}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notas: e.target.value }))
                    }
                    placeholder="Observaciones sobre la recepción..."
                    className="min-h-[80px] w-full rounded-xl border border-[#D2D2D7] px-4 py-2.5 text-[13px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Factura / Remisión (opcional)</Label>
                  <input
                    ref={inputFacturaRef}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => setFacturaFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => inputFacturaRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#D2D2D7] bg-[#F5F5F7]/50 py-4 transition-all hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5"
                  >
                    <Upload className="size-5 text-[#86868B]" />
                    <span className="text-[13px] text-[#86868B]">
                      {facturaFile ? facturaFile.name : "PDF o imagen"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Warnings */}
              {haySobrecosto && (
                <div className="flex items-start gap-2 rounded-xl border border-[#FF9500]/30 bg-[#FF9500]/10 p-4">
                  <AlertTriangle className="size-5 shrink-0 text-[#FF9500]" />
                  <p className="text-[13px] text-[#FF9500]">
                    El costo real supera el 15% del costo estimado. Revisa los datos.
                  </p>
                </div>
              )}
              {error && (
                <div className="rounded-xl border border-[#FF3B30]/30 bg-[#FF3B30]/10 p-4 text-[13px] text-[#FF3B30]">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Confirmar y marcar como consumido
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
