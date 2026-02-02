"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditarProyectoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proyectoId: string;
  datosIniciales: {
    cliente_nombre: string | null;
    direccion: string | null;
    presupuesto_total: number | null;
    fecha_inicio: string | null;
    fecha_entrega_estimada: string | null;
    margen_objetivo: number | null;
    residente_asignado: string | null;
    estado: string | null;
  };
  onSuccess: () => void;
}

function formatCOP(value: string): string {
  const num = value.replace(/\D/g, "");
  if (!num) return "";
  return Number(num).toLocaleString("es-CO");
}

function parseCOP(value: string): number {
  return Number(value.replace(/\D/g, "")) || 0;
}

export function EditarProyectoModal({
  open,
  onOpenChange,
  proyectoId,
  datosIniciales,
  onSuccess,
}: EditarProyectoModalProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    cliente_nombre: datosIniciales.cliente_nombre ?? "",
    direccion: datosIniciales.direccion ?? "",
    presupuesto_total: datosIniciales.presupuesto_total
      ? formatCOP(String(datosIniciales.presupuesto_total))
      : "",
    fecha_inicio: datosIniciales.fecha_inicio ?? "",
    fecha_entrega_estimada: datosIniciales.fecha_entrega_estimada ?? "",
    margen_objetivo: String(datosIniciales.margen_objetivo ?? 20),
    residente_asignado: datosIniciales.residente_asignado ?? "",
    estado: datosIniciales.estado ?? "ACTIVO",
  });

  useEffect(() => {
    if (open) {
      setForm({
        cliente_nombre: datosIniciales.cliente_nombre ?? "",
        direccion: datosIniciales.direccion ?? "",
        presupuesto_total: datosIniciales.presupuesto_total
          ? formatCOP(String(datosIniciales.presupuesto_total))
          : "",
        fecha_inicio: datosIniciales.fecha_inicio ?? "",
        fecha_entrega_estimada: datosIniciales.fecha_entrega_estimada ?? "",
        margen_objetivo: String(datosIniciales.margen_objetivo ?? 20),
        residente_asignado: datosIniciales.residente_asignado ?? "",
        estado: datosIniciales.estado ?? "ACTIVO",
      });
      setErrors({});
    }
  }, [open, datosIniciales]);

  function validate(): boolean {
    const err: Record<string, string> = {};
    if (!form.cliente_nombre.trim()) err.cliente_nombre = "Requerido";
    if (!form.direccion.trim()) err.direccion = "Requerido";
    const presupuesto = parseCOP(form.presupuesto_total);
    if (presupuesto <= 0) err.presupuesto_total = "Debe ser mayor a 0";
    if (!form.fecha_inicio) err.fecha_inicio = "Requerido";
    if (!form.fecha_entrega_estimada) err.fecha_entrega_estimada = "Requerido";
    if (form.fecha_inicio && form.fecha_entrega_estimada) {
      if (new Date(form.fecha_entrega_estimada) <= new Date(form.fecha_inicio)) {
        err.fecha_entrega_estimada = "Debe ser posterior a la fecha de inicio";
      }
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const supabase = getSupabase();

      const { error } = await supabase
        .from("hoja_vida_proyecto")
        .update({
          cliente_nombre: form.cliente_nombre.trim(),
          direccion: form.direccion.trim(),
          presupuesto_total: parseCOP(form.presupuesto_total),
          fecha_inicio: form.fecha_inicio,
          fecha_entrega_estimada: form.fecha_entrega_estimada,
          margen_objetivo: Number(form.margen_objetivo),
          residente_asignado: form.residente_asignado.trim() || null,
          estado: form.estado,
        })
        .eq("id", proyectoId);

      if (error) throw error;

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Error al actualizar",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gray-200 bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#2D3748]">Editar Proyecto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Input
              value={form.cliente_nombre}
              onChange={(e) =>
                setForm((f) => ({ ...f, cliente_nombre: e.target.value }))
              }
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.cliente_nombre && (
              <p className="text-xs text-red-500">{errors.cliente_nombre}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Dirección *</Label>
            <Input
              value={form.direccion}
              onChange={(e) =>
                setForm((f) => ({ ...f, direccion: e.target.value }))
              }
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.direccion && (
              <p className="text-xs text-red-500">{errors.direccion}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Presupuesto Total (COP) *</Label>
            <Input
              value={form.presupuesto_total}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  presupuesto_total: formatCOP(e.target.value),
                }))
              }
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.presupuesto_total && (
              <p className="text-xs text-red-500">{errors.presupuesto_total}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha Inicio *</Label>
              <Input
                type="date"
                value={form.fecha_inicio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fecha_inicio: e.target.value }))
                }
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.fecha_inicio && (
                <p className="text-xs text-red-500">{errors.fecha_inicio}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Fecha Entrega *</Label>
              <Input
                type="date"
                value={form.fecha_entrega_estimada}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    fecha_entrega_estimada: e.target.value,
                  }))
                }
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.fecha_entrega_estimada && (
                <p className="text-xs text-red-500">
                  {errors.fecha_entrega_estimada}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Margen Objetivo (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.margen_objetivo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, margen_objetivo: e.target.value }))
                }
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label>Residente Asignado</Label>
              <Input
                value={form.residente_asignado}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    residente_asignado: e.target.value,
                  }))
                }
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={form.estado}
              onValueChange={(v) => setForm((f) => ({ ...f, estado: v }))}
            >
              <SelectTrigger className="border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVO">Activo</SelectItem>
                <SelectItem value="EN_PAUSA">Pausado</SelectItem>
                <SelectItem value="TERMINADO">Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {errors.submit && (
            <p className="text-sm text-red-500">{errors.submit}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
