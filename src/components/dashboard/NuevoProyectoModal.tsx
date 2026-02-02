"use client";

import { useState } from "react";
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
import { cn } from "@/lib/utils";

interface NuevoProyectoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function NuevoProyectoModal({
  open,
  onOpenChange,
  onSuccess,
}: NuevoProyectoModalProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    cliente_nombre: "",
    direccion: "",
    conjunto: "",
    presupuesto_total: "",
    fecha_inicio: "",
    fecha_entrega_estimada: "",
    margen_objetivo: "20",
    residente_asignado: "",
  });

  function validate(): boolean {
    const err: Record<string, string> = {};
    if (!form.cliente_nombre.trim()) err.cliente_nombre = "Requerido";
    if (!form.direccion.trim()) err.direccion = "Requerido";
    const presupuesto = parseCOP(form.presupuesto_total);
    if (presupuesto < 1_000_000) err.presupuesto_total = "Mínimo 1.000.000 COP";
    if (!form.fecha_inicio) err.fecha_inicio = "Requerido";
    if (!form.fecha_entrega_estimada) err.fecha_entrega_estimada = "Requerido";
    if (form.fecha_inicio && form.fecha_entrega_estimada) {
      if (new Date(form.fecha_entrega_estimada) <= new Date(form.fecha_inicio)) {
        err.fecha_entrega_estimada = "Debe ser posterior a la fecha de inicio";
      }
    }
    const margen = Number(form.margen_objetivo);
    if (isNaN(margen) || margen < 0 || margen > 100) {
      err.margen_objetivo = "Entre 0 y 100";
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

      const { error } = await supabase.from("hoja_vida_proyecto").insert({
        cliente_nombre: form.cliente_nombre.trim(),
        direccion: form.direccion.trim(),
        conjunto: form.conjunto.trim() || null,
        presupuesto_total: parseCOP(form.presupuesto_total),
        fecha_inicio: form.fecha_inicio,
        fecha_entrega_estimada: form.fecha_entrega_estimada,
        margen_objetivo: Number(form.margen_objetivo),
        residente_asignado: form.residente_asignado.trim() || null,
        estado: "ACTIVO",
        porcentaje_avance: 0,
        lista_actividades: [],
      });

      if (error) throw error;

      setForm({
        cliente_nombre: "",
        direccion: "",
        conjunto: "",
        presupuesto_total: "",
        fecha_inicio: "",
        fecha_entrega_estimada: "",
        margen_objetivo: "20",
        residente_asignado: "",
      });
      setErrors({});
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Error al crear proyecto",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gray-200 bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#2D3748]">Nuevo Proyecto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cliente" className="text-[#2D3748]">
              Cliente <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cliente"
              value={form.cliente_nombre}
              onChange={(e) =>
                setForm((f) => ({ ...f, cliente_nombre: e.target.value }))
              }
              placeholder="Nombre del cliente"
              className={cn(
                "focus:ring-blue-500",
                errors.cliente_nombre ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-blue-500"
              )}
            />
            {errors.cliente_nombre && (
              <p className="text-xs text-red-500">{errors.cliente_nombre}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion" className="text-[#2D3748]">
              Dirección <span className="text-red-500">*</span>
            </Label>
            <Input
              id="direccion"
              value={form.direccion}
              onChange={(e) =>
                setForm((f) => ({ ...f, direccion: e.target.value }))
              }
              placeholder="Dirección de la obra"
              className={cn(
                "focus:ring-blue-500",
                errors.direccion ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-blue-500"
              )}
            />
            {errors.direccion && (
              <p className="text-xs text-red-500">{errors.direccion}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="conjunto" className="text-[#2D3748]">
              Conjunto
            </Label>
            <Input
              id="conjunto"
              value={form.conjunto}
              onChange={(e) =>
                setForm((f) => ({ ...f, conjunto: e.target.value }))
              }
              placeholder="Opcional"
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="presupuesto" className="text-[#2D3748]">
              Presupuesto Total (COP) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="presupuesto"
              value={form.presupuesto_total}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  presupuesto_total: formatCOP(e.target.value),
                }))
              }
              placeholder="1.000.000"
              className={cn(
                "focus:ring-blue-500",
                errors.presupuesto_total ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-blue-500"
              )}
            />
            {errors.presupuesto_total && (
              <p className="text-xs text-red-500">{errors.presupuesto_total}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio" className="text-[#2D3748]">
                Fecha de Inicio <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fecha_inicio"
                type="date"
                value={form.fecha_inicio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fecha_inicio: e.target.value }))
                }
                className={cn(
                  "focus:ring-blue-500",
                  errors.fecha_inicio ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-blue-500"
                )}
              />
              {errors.fecha_inicio && (
                <p className="text-xs text-red-500">{errors.fecha_inicio}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_entrega" className="text-[#2D3748]">
                Fecha de Entrega <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fecha_entrega"
                type="date"
                value={form.fecha_entrega_estimada}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    fecha_entrega_estimada: e.target.value,
                  }))
                }
                className={cn(
                  "focus:ring-blue-500",
                  errors.fecha_entrega_estimada ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-blue-500"
                )}
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
              <Label htmlFor="margen" className="text-[#2D3748]">
                Margen Objetivo (%)
              </Label>
              <Input
                id="margen"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.margen_objetivo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, margen_objetivo: e.target.value }))
                }
                className={cn(
                  "focus:ring-blue-500",
                  errors.margen_objetivo ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-blue-500"
                )}
              />
              {errors.margen_objetivo && (
                <p className="text-xs text-red-500">{errors.margen_objetivo}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="residente" className="text-[#2D3748]">
                Residente Asignado
              </Label>
              <Input
                id="residente"
                value={form.residente_asignado}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    residente_asignado: e.target.value,
                  }))
                }
                placeholder="Nombre"
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {errors.submit && (
            <p className="text-sm text-red-500">{errors.submit}</p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
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
                "Crear"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
