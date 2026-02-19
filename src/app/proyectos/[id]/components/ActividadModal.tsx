// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ActividadModalProps {
  actividad?: any;
  actividadesDisponibles: any[];
  onGuardar: (data: any) => void;
  onCerrar: () => void;
}

export function ActividadModal({ actividad, actividadesDisponibles, onGuardar, onCerrar }: ActividadModalProps) {
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    porcentaje: 10,
    duracion_dias: 1,
    fecha_inicio_estimada: "",
    predecesoras: [] as string[],
  });

  useEffect(() => {
    if (actividad) {
      setForm({
        titulo: actividad.titulo || "",
        descripcion: actividad.descripcion || "",
        porcentaje: actividad.porcentaje || 10,
        duracion_dias: actividad.duracion_dias || 1,
        fecha_inicio_estimada: actividad.fecha_inicio_estimada || "",
        predecesoras: actividad.predecesoras || [],
      });
    }
  }, [actividad]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGuardar(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D2D2D7]/40 px-6 py-4">
          <h3 className="text-[16px] font-semibold text-[#1D1D1F]">
            {actividad ? "Editar Actividad" : "Nueva Actividad"}
          </h3>
          <button onClick={onCerrar} className="rounded-lg p-1.5 text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-[13px] text-[#86868B]">Titulo *</Label>
            <Input
              required
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ej: Estuco y primera mano"
              className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[13px] text-[#86868B]">Descripcion</Label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={3}
              placeholder="Detalles de la actividad..."
              className="w-full rounded-xl border border-[#D2D2D7] px-4 py-3 text-[14px] leading-relaxed text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">% del proyecto *</Label>
              <Input
                type="number"
                required
                min="1"
                max="100"
                value={form.porcentaje}
                onChange={(e) => setForm({ ...form, porcentaje: Number(e.target.value) })}
                className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] text-[#86868B]">Duracion (dias) *</Label>
              <Input
                type="number"
                required
                min="1"
                value={form.duracion_dias}
                onChange={(e) => setForm({ ...form, duracion_dias: Number(e.target.value) })}
                className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[13px] text-[#86868B]">Fecha inicio estimada *</Label>
            <Input
              type="date"
              required
              value={form.fecha_inicio_estimada}
              onChange={(e) => setForm({ ...form, fecha_inicio_estimada: e.target.value })}
              className="h-10 rounded-xl border-[#D2D2D7] text-[14px] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[13px] text-[#86868B]">Actividades predecesoras</Label>
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-[#D2D2D7] p-3">
              {actividadesDisponibles.length === 0 ? (
                <p className="py-2 text-center text-[12px] text-[#C7C7CC]">No hay otras actividades</p>
              ) : (
                actividadesDisponibles.map((act) => (
                  <label key={act.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[#F5F5F7]">
                    <input
                      type="checkbox"
                      checked={form.predecesoras.includes(act.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({ ...form, predecesoras: [...form.predecesoras, act.id] });
                        } else {
                          setForm({ ...form, predecesoras: form.predecesoras.filter((id) => id !== act.id) });
                        }
                      }}
                      className="size-4 rounded border-[#D2D2D7] text-[#007AFF] focus:ring-[#007AFF]/20"
                    />
                    <span className="text-[13px] text-[#1D1D1F]">{act.titulo}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-[11px] text-[#86868B]">
              Solo podra iniciar cuando todas las predecesoras esten terminadas
            </p>
          </div>

          <div className="flex gap-3 border-t border-[#F5F5F7] pt-5">
            <Button type="submit" className="flex-1 rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]">
              {actividad ? "Guardar Cambios" : "Crear Actividad"}
            </Button>
            <Button type="button" variant="outline" onClick={onCerrar} className="rounded-xl">
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
