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

const DIFERENCIA_ALERTA = 10; // %
const SOBRECOSTO_WARNING = 1.15; // 15%

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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Pedido no encontrado</p>
        <Button variant="outline" asChild>
          <Link href="/pedidos/nuevo">Volver a pedidos</Link>
        </Button>
      </div>
    );
  }

  if (pedido.estado === "CONSUMED") {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-lg">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/pedidos/nuevo">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="size-6" />
              <h2 className="text-lg font-semibold">Pedido ya consumido</h2>
            </div>
            <p className="mt-2 text-muted-foreground">
              Este pedido fue marcado como consumido el{" "}
              {pedido.fecha_consumo
                ? format(new Date(pedido.fecha_consumo), "d MMM yyyy", { locale: es })
                : "—"}
              .
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/pedidos/nuevo">Volver a pedidos</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (pedido.estado !== "DELIVERED") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">
          Este pedido debe estar en estado "Entregado" para marcarlo como consumido.
        </p>
        <Button variant="outline" asChild>
          <Link href="/pedidos/nuevo">Volver a pedidos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-lg">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/pedidos/nuevo">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[#2D3748]">
            Marcar como Consumido
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registra los datos reales de recepción del pedido.
          </p>

          {success ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/20 p-4 text-emerald-400">
                <CheckCircle2 className="size-6 shrink-0" />
                <span className="font-medium">Pedido marcado como consumido</span>
              </div>
              {hayAlertaDiferencia && (
                <div
                  className={cn(
                    "rounded-lg border p-4",
                    diferenciaPct > 0
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  )}
                >
                  <span className="font-medium">
                    Diferencia vs estimado: {diferenciaPct > 0 ? "+" : ""}
                    {diferenciaPct.toFixed(1)}%
                  </span>
                  {diferenciaPct > DIFERENCIA_ALERTA && (
                    <span className="ml-2 rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-medium text-destructive">
                      Alerta
                    </span>
                  )}
                </div>
              )}
              <Button variant="outline" asChild>
                <Link href="/pedidos/nuevo">Volver a pedidos</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              {/* Datos de solo lectura */}
              <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-sm font-medium text-[#2D3748]">
                  Datos del pedido
                </h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Item</span>
                    <span className="font-medium">{pedido.item}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cantidad solicitada</span>
                    <span className="font-medium">
                      {pedido.cantidad} {pedido.unidad ?? "und"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Costo estimado</span>
                    <span className="font-medium">
                      ${(pedido.costo_estimado ?? 0).toLocaleString("es-CO")} COP
                    </span>
                  </div>
                </div>
              </div>

              {/* Campos editables */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cantidad real recibida *</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.cantidad_real}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cantidad_real: e.target.value }))
                    }
                    placeholder={String(pedido.cantidad)}
                    className="h-12 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Costo real pagado (COP) *</Label>
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
                    className="h-12 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato moneda COP (ej: 1.500.000)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Fecha de recepción *</Label>
                  <Input
                    type="date"
                    value={form.fecha_recepcion}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fecha_recepcion: e.target.value }))
                    }
                    className="h-12 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notas adicionales (opcional)</Label>
                  <textarea
                    value={form.notas}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notas: e.target.value }))
                    }
                    placeholder="Observaciones sobre la recepción..."
                    className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Factura / Remisión (opcional)</Label>
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
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-4 transition-colors hover:border-blue-400 hover:bg-blue-50"
                  >
                    <Upload className="size-5 text-blue-600" />
                    <span className="text-sm text-muted-foreground">
                      {facturaFile ? facturaFile.name : "PDF o imagen"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Warnings */}
              {haySobrecosto && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-amber-400">
                  <AlertTriangle className="size-5 shrink-0" />
                  <p className="text-sm">
                    El costo real supera el 15% del costo estimado. Revisa los datos.
                  </p>
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
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
