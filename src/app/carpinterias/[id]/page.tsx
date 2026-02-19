// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Hammer,
  MapPin,
  Ruler,
  Layers,
  Paintbrush,
  User,
  DollarSign,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Carpinteria {
  id: string;
  proyecto_id: string;
  descripcion: string;
  ubicacion: string | null;
  tipo: string | null;
  dimensiones: string | null;
  material: string | null;
  acabado: string | null;
  estado: string;
  responsable: string | null;
  costo_estimado: number | null;
  valor_madera: number | null;
  valor_herrajes: number | null;
  valor_mano_obra: number | null;
  notas: string | null;
  fecha_asignada: string | null;
  fecha_toma_medidas: string | null;
  fecha_pago_corte: string | null;
  fecha_recepcion_material: string | null;
  fecha_armado: string | null;
  fecha_instalacion: string | null;
  fecha_revision_final: string | null;
  created_at: string;
}

const STEPS = [
  {
    key: "asignada",
    label: "Asignada",
    description: "Carpintería asignada",
    dateField: "fecha_asignada",
  },
  {
    key: "toma_medidas",
    label: "Toma de medidas",
    description: "Medidas tomadas en obra",
    dateField: "fecha_toma_medidas",
  },
  {
    key: "pago_corte",
    label: "Se pagó corte",
    description: "Pago de corte realizado",
    dateField: "fecha_pago_corte",
  },
  {
    key: "recepcion_material",
    label: "Se recibió el material",
    description: "Material recibido del proveedor",
    dateField: "fecha_recepcion_material",
  },
  {
    key: "armado",
    label: "Se armó la carpintería",
    description: "Carpintería armada",
    dateField: "fecha_armado",
  },
  {
    key: "instalacion",
    label: "Se instaló la carpintería",
    description: "Carpintería instalada en obra",
    dateField: "fecha_instalacion",
  },
  {
    key: "revision_final",
    label: "Tapa-tornillos y revisión final",
    description: "Trabajo completado",
    dateField: "fecha_revision_final",
  },
];

const STEP_KEYS = STEPS.map((s) => s.key);

function getStepIndex(estado: string): number {
  const idx = STEP_KEYS.indexOf(estado);
  return idx >= 0 ? idx : 0;
}

function fmtCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function CarpinteriaDetallePage() {
  const supabase = getSupabaseClient();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [carpinteria, setCarpinteria] = useState<Carpinteria | null>(null);
  const [proyectoNombre, setProyectoNombre] = useState<string>("—");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [editando, setEditando] = useState(false);
  const [formEdit, setFormEdit] = useState({
    descripcion: "",
    ubicacion: "",
    tipo: "",
    dimensiones: "",
    material: "",
    acabado: "",
    responsable: "",
    costo_estimado: "",
    valor_madera: "",
    valor_herrajes: "",
    valor_mano_obra: "",
    notas: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("carpinterias")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) {
        const r = data as Record<string, unknown>;
        const carp: Carpinteria = {
          id: r.id as string,
          proyecto_id: r.proyecto_id as string,
          descripcion: r.descripcion as string,
          ubicacion: (r.ubicacion as string) ?? null,
          tipo: (r.tipo as string) ?? null,
          dimensiones: (r.dimensiones as string) ?? null,
          material: (r.material as string) ?? null,
          acabado: (r.acabado as string) ?? null,
          estado: (r.estado as string) ?? "asignada",
          responsable: (r.responsable as string) ?? null,
          costo_estimado: r.costo_estimado ? Number(r.costo_estimado) : null,
          valor_madera: r.valor_madera ? Number(r.valor_madera) : null,
          valor_herrajes: r.valor_herrajes ? Number(r.valor_herrajes) : null,
          valor_mano_obra: r.valor_mano_obra ? Number(r.valor_mano_obra) : null,
          notas: (r.notas as string) ?? null,
          fecha_asignada: (r.fecha_asignada as string) ?? null,
          fecha_toma_medidas: (r.fecha_toma_medidas as string) ?? null,
          fecha_pago_corte: (r.fecha_pago_corte as string) ?? null,
          fecha_recepcion_material: (r.fecha_recepcion_material as string) ?? null,
          fecha_armado: (r.fecha_armado as string) ?? null,
          fecha_instalacion: (r.fecha_instalacion as string) ?? null,
          fecha_revision_final: (r.fecha_revision_final as string) ?? null,
          created_at: (r.created_at as string) ?? "",
        };
        setCarpinteria(carp);

        const { data: proj } = await supabase
          .from("proyectos_maestro")
          .select("cliente_nombre")
          .eq("id", carp.proyecto_id)
          .single();
        if (proj)
          setProyectoNombre(
            ((proj as Record<string, unknown>).cliente_nombre as string) ?? "—"
          );
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  useEffect(() => {
    if (carpinteria) {
      setFormEdit({
        descripcion: carpinteria.descripcion || "",
        ubicacion: carpinteria.ubicacion || "",
        tipo: carpinteria.tipo || "",
        dimensiones: carpinteria.dimensiones || "",
        material: carpinteria.material || "",
        acabado: carpinteria.acabado || "",
        responsable: carpinteria.responsable || "",
        costo_estimado: carpinteria.costo_estimado?.toString() || "",
        valor_madera: carpinteria.valor_madera?.toString() || "",
        valor_herrajes: carpinteria.valor_herrajes?.toString() || "",
        valor_mano_obra: carpinteria.valor_mano_obra?.toString() || "",
        notas: carpinteria.notas || "",
      });
    }
  }, [carpinteria]);

  async function guardarCambios() {
    if (!carpinteria) return;

    setActing(true);
    try {
      const { error } = await supabase
        .from("carpinterias")
        .update({
          descripcion: formEdit.descripcion,
          ubicacion: formEdit.ubicacion || null,
          tipo: formEdit.tipo || null,
          dimensiones: formEdit.dimensiones || null,
          material: formEdit.material || null,
          acabado: formEdit.acabado || null,
          responsable: formEdit.responsable || null,
          costo_estimado: formEdit.costo_estimado ? Number(formEdit.costo_estimado) : null,
          valor_madera: formEdit.valor_madera ? Number(formEdit.valor_madera) : null,
          valor_herrajes: formEdit.valor_herrajes ? Number(formEdit.valor_herrajes) : null,
          valor_mano_obra: formEdit.valor_mano_obra ? Number(formEdit.valor_mano_obra) : null,
          notas: formEdit.notas || null,
        } as any)
        .eq("id", carpinteria.id);

      if (error) throw error;

      await fetchData();
      setEditando(false);
    } catch (err) {
      console.error("Error:", err);
      alert("Error al guardar cambios");
    } finally {
      setActing(false);
    }
  }

  async function eliminarCarpinteria() {
    if (!carpinteria) return;
    if (!confirm("¿Estás seguro de eliminar esta carpintería? Esta acción no se puede deshacer.")) return;

    try {
      const { error } = await supabase
        .from("carpinterias")
        .delete()
        .eq("id", carpinteria.id);

      if (error) throw error;
      router.push("/carpinterias");
    } catch (err) {
      console.error("Error:", err);
      alert("Error al eliminar carpintería");
    }
  }

  async function avanzarPaso() {
    if (!carpinteria) return;

    const currentIdx = getStepIndex(carpinteria.estado);

    if (currentIdx + 1 >= STEPS.length) {
      alert("La carpintería ya está completada");
      return;
    }

    const nextStep = STEPS[currentIdx + 1];
    setActing(true);

    try {
      const update: any = {
        estado: nextStep.key,
        [nextStep.dateField]: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("carpinterias")
        .update(update as any)
        .eq("id", carpinteria.id);

      if (error) throw error;

      await fetchData();
    } catch (err) {
      console.error("Error:", err);
      alert("Error al avanzar paso");
    } finally {
      setActing(false);
    }
  }

  async function retrocederPaso(targetIdx: number) {
    if (!carpinteria) return;

    if (targetIdx === 0) {
      alert("No se puede retroceder más");
      return;
    }

    const previousStep = STEPS[targetIdx - 1];
    setActing(true);

    try {
      const update: any = {
        estado: previousStep.key,
        [STEPS[targetIdx].dateField]: null,
      };

      const { error } = await supabase
        .from("carpinterias")
        .update(update as any)
        .eq("id", carpinteria.id);

      if (error) throw error;

      await fetchData();
    } catch (err) {
      console.error("Error:", err);
      alert("Error al retroceder paso");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!carpinteria) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8">
        <p className="text-[#86868B]">Carpintería no encontrada</p>
        <Button variant="outline" asChild>
          <Link href="/carpinterias">Volver</Link>
        </Button>
      </div>
    );
  }

  const currentStepIndex = getStepIndex(carpinteria.estado);

  const infoItems = [
    { icon: MapPin, label: "Ubicación", value: carpinteria.ubicacion },
    { icon: Layers, label: "Tipo", value: carpinteria.tipo },
    { icon: Ruler, label: "Dimensiones", value: carpinteria.dimensiones },
    { icon: Hammer, label: "Material", value: carpinteria.material },
    { icon: Paintbrush, label: "Acabado", value: carpinteria.acabado },
    { icon: User, label: "Responsable", value: carpinteria.responsable },
    {
      icon: DollarSign,
      label: "Costo estimado",
      value: carpinteria.costo_estimado ? fmtCOP(carpinteria.costo_estimado) : null,
    },
  ].filter((item) => item.value);

  const hasCostos =
    (carpinteria.valor_madera && carpinteria.valor_madera > 0) ||
    (carpinteria.valor_herrajes && carpinteria.valor_herrajes > 0) ||
    (carpinteria.valor_mano_obra && carpinteria.valor_mano_obra > 0);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-[#86868B] hover:bg-[#F5F5F7]"
              asChild
            >
              <Link href="/carpinterias">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Hammer className="size-5 text-amber-600" />
              <h1 className="truncate text-lg font-semibold tracking-tight text-[#1D1D1F]">
                Detalle Carpintería
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (editando) {
                  setEditando(false);
                  if (carpinteria) {
                    setFormEdit({
                      descripcion: carpinteria.descripcion || "",
                      ubicacion: carpinteria.ubicacion || "",
                      tipo: carpinteria.tipo || "",
                      dimensiones: carpinteria.dimensiones || "",
                      material: carpinteria.material || "",
                      acabado: carpinteria.acabado || "",
                      responsable: carpinteria.responsable || "",
                      costo_estimado: carpinteria.costo_estimado?.toString() || "",
                      valor_madera: carpinteria.valor_madera?.toString() || "",
                      valor_herrajes: carpinteria.valor_herrajes?.toString() || "",
                      valor_mano_obra: carpinteria.valor_mano_obra?.toString() || "",
                      notas: carpinteria.notas || "",
                    });
                  }
                } else {
                  setEditando(true);
                }
              }}
              className={cn(
                "rounded-lg text-[13px]",
                editando
                  ? "text-[#86868B] hover:bg-[#F5F5F7]"
                  : "text-amber-600 hover:bg-amber-50"
              )}
            >
              {editando ? (
                <>
                  <X className="size-3.5" />
                  Cancelar
                </>
              ) : (
                <>
                  <Pencil className="size-3.5" />
                  Editar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={eliminarCarpinteria}
              className="rounded-lg text-[13px] text-[#FF3B30] hover:bg-[#FF3B30]/5"
            >
              <Trash2 className="size-3.5" />
              Eliminar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-8 py-8">
        {/* Info card */}
        <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
          {editando ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Descripción *</Label>
                <textarea
                  value={formEdit.descripcion}
                  onChange={(e) => setFormEdit((f) => ({ ...f, descripcion: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-[#D2D2D7] px-4 py-3 text-[14px] text-[#1D1D1F] focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Ubicación</Label>
                  <Input
                    value={formEdit.ubicacion}
                    onChange={(e) => setFormEdit((f) => ({ ...f, ubicacion: e.target.value }))}
                    className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-amber-600 focus:ring-amber-600/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Tipo</Label>
                  <Input
                    value={formEdit.tipo}
                    onChange={(e) => setFormEdit((f) => ({ ...f, tipo: e.target.value }))}
                    className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-amber-600 focus:ring-amber-600/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Dimensiones</Label>
                <Input
                  value={formEdit.dimensiones}
                  onChange={(e) => setFormEdit((f) => ({ ...f, dimensiones: e.target.value }))}
                  className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-amber-600 focus:ring-amber-600/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Material</Label>
                  <Input
                    value={formEdit.material}
                    onChange={(e) => setFormEdit((f) => ({ ...f, material: e.target.value }))}
                    className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-amber-600 focus:ring-amber-600/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Acabado</Label>
                  <Input
                    value={formEdit.acabado}
                    onChange={(e) => setFormEdit((f) => ({ ...f, acabado: e.target.value }))}
                    className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-amber-600 focus:ring-amber-600/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Responsable</Label>
                <Input
                  value={formEdit.responsable}
                  onChange={(e) => setFormEdit((f) => ({ ...f, responsable: e.target.value }))}
                  className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-amber-600 focus:ring-amber-600/10"
                />
              </div>

              <div className="border-t border-[#D2D2D7]/40 pt-5">
                <h3 className="mb-4 text-[13px] font-semibold text-[#1D1D1F]">
                  Costos
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[13px] text-[#86868B]">Valor madera</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formEdit.valor_madera}
                      onChange={(e) => setFormEdit((f) => ({ ...f, valor_madera: e.target.value }))}
                      placeholder="0"
                      className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-amber-600 focus:ring-amber-600/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] text-[#86868B]">Valor herrajes</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formEdit.valor_herrajes}
                      onChange={(e) => setFormEdit((f) => ({ ...f, valor_herrajes: e.target.value }))}
                      placeholder="0"
                      className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-amber-600 focus:ring-amber-600/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] text-[#86868B]">Valor mano de obra</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formEdit.valor_mano_obra}
                      onChange={(e) => setFormEdit((f) => ({ ...f, valor_mano_obra: e.target.value }))}
                      placeholder="0"
                      className="h-11 rounded-xl border-[#D2D2D7] text-[14px] focus:border-amber-600 focus:ring-amber-600/10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Notas</Label>
                <textarea
                  value={formEdit.notas}
                  onChange={(e) => setFormEdit((f) => ({ ...f, notas: e.target.value }))}
                  rows={3}
                  placeholder="Observaciones adicionales..."
                  className="w-full rounded-xl border border-[#D2D2D7] px-4 py-3 text-[14px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/10"
                />
              </div>

              <Button
                onClick={guardarCambios}
                disabled={acting || !formEdit.descripcion.trim()}
                className="w-full rounded-xl bg-amber-600 py-3 text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
              >
                {acting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Save className="size-4" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-[16px] font-semibold text-[#1D1D1F]">
                {carpinteria.descripcion}
              </h2>
              <p className="mt-1 text-[13px] text-[#86868B]">{proyectoNombre}</p>

              {infoItems.length > 0 && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {infoItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex items-center gap-2 text-[13px] text-[#86868B]"
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="text-[#86868B]">{item.label}:</span>
                        <span className="font-medium text-[#1D1D1F]">
                          {item.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {carpinteria.notas && (
                <div className="mt-4 rounded-xl bg-[#F5F5F7] px-4 py-3">
                  <p className="text-[12px] font-medium text-[#86868B]">Notas</p>
                  <p className="mt-1 text-[13px] text-[#1D1D1F]">
                    {carpinteria.notas}
                  </p>
                </div>
              )}

              {hasCostos && (
                <div className="mt-5 border-t border-[#D2D2D7]/40 pt-5">
                  <h3 className="mb-3 text-[13px] font-semibold text-[#1D1D1F]">
                    Costos
                  </h3>
                  <div className="space-y-2">
                    {carpinteria.valor_madera != null && carpinteria.valor_madera > 0 && (
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-[#86868B]">Valor madera</span>
                        <span className="font-medium text-[#1D1D1F]">
                          {fmtCOP(carpinteria.valor_madera)}
                        </span>
                      </div>
                    )}
                    {carpinteria.valor_herrajes != null && carpinteria.valor_herrajes > 0 && (
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-[#86868B]">Valor herrajes</span>
                        <span className="font-medium text-[#1D1D1F]">
                          {fmtCOP(carpinteria.valor_herrajes)}
                        </span>
                      </div>
                    )}
                    {carpinteria.valor_mano_obra != null && carpinteria.valor_mano_obra > 0 && (
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-[#86868B]">Valor mano de obra</span>
                        <span className="font-medium text-[#1D1D1F]">
                          {fmtCOP(carpinteria.valor_mano_obra)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-[#D2D2D7]/40 pt-2">
                      <span className="text-[13px] font-medium text-[#86868B]">Total</span>
                      <span className="text-[16px] font-bold text-amber-600">
                        {fmtCOP(
                          (carpinteria.valor_madera || 0) +
                          (carpinteria.valor_herrajes || 0) +
                          (carpinteria.valor_mano_obra || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Timeline / Flujo de trabajo */}
        <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
          <h3 className="mb-6 text-[14px] font-semibold text-[#1D1D1F]">
            Flujo de trabajo
          </h3>

          <div className="space-y-2">
            {STEPS.map((step, idx) => {
              const isCompleted = currentStepIndex > idx;
              const isCurrent = currentStepIndex === idx;
              const canCheck = isCurrent;
              const stepDate =
                carpinteria[step.dateField as keyof Carpinteria] as
                  | string
                  | null;

              return (
                <div key={step.key} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <label className="relative cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        disabled={acting}
                        onChange={async () => {
                          if (acting) return;
                          if (isCompleted) {
                            await retrocederPaso(idx);
                          } else if (canCheck) {
                            await avanzarPaso();
                          }
                        }}
                        className="peer sr-only"
                      />
                      <div
                        className={cn(
                          "flex size-6 items-center justify-center rounded border-2 transition-all",
                          isCompleted
                            ? "cursor-pointer border-amber-600 bg-amber-600 hover:bg-amber-700"
                            : canCheck
                              ? "cursor-pointer border-amber-600 hover:bg-amber-50"
                              : "cursor-not-allowed border-[#D2D2D7] bg-[#F5F5F7]"
                        )}
                      >
                        {isCompleted && (
                          <svg
                            className="size-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </label>
                    {idx < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "mt-2 h-12 w-0.5 transition-colors",
                          isCompleted ? "bg-amber-600" : "bg-[#D2D2D7]"
                        )}
                      />
                    )}
                  </div>

                  <div className="flex-1 pb-2">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          isCompleted
                            ? "bg-amber-600 text-white"
                            : isCurrent
                              ? "border-2 border-amber-600 bg-amber-100 text-amber-600"
                              : "bg-[#F5F5F7] text-[#86868B]"
                        )}
                      >
                        {idx + 1}
                      </span>
                      <h4
                        className={cn(
                          "font-semibold",
                          isCompleted
                            ? "text-[#1D1D1F]"
                            : isCurrent
                              ? "text-amber-600"
                              : "text-[#86868B]"
                        )}
                      >
                        {step.label}
                      </h4>
                    </div>

                    <p
                      className={cn(
                        "ml-8 mt-1 text-sm",
                        isCompleted || isCurrent
                          ? "text-[#86868B]"
                          : "text-[#C7C7CC]"
                      )}
                    >
                      {step.description}
                    </p>

                    {stepDate && (
                      <p className="ml-8 mt-1 text-xs text-[#86868B]">
                        {new Date(stepDate).toLocaleString("es-CO", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}

                    {isCurrent && !acting && (
                      <p className="ml-8 mt-1 text-xs font-medium text-amber-600">
                        ← Marca la casilla para avanzar
                      </p>
                    )}

                    {acting && isCurrent && (
                      <div className="ml-8 mt-2 flex items-center gap-2 text-amber-600">
                        <div className="size-3 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                        <span className="text-xs">Procesando...</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {currentStepIndex >= STEPS.length - 1 && (
          <div className="rounded-2xl border border-[#34C759]/30 bg-[#34C759]/5 p-5 text-center">
            <CheckCircle2 className="mx-auto size-8 text-[#34C759]" />
            <p className="mt-2 text-[14px] font-medium text-[#34C759]">
              Carpintería completada
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
