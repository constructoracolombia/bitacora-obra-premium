// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  MapPin,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { calcularDiasHabiles } from "@/lib/festivos-colombia";

export default function CalendarioDetallePage() {
  const supabase = getSupabaseClient();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [calendario, setCalendario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formEdit, setFormEdit] = useState({
    fecha_acta_inicio: "",
    fecha_entrega_programada: "",
    notas: "",
  });

  useEffect(() => {
    if (id) cargarCalendario();
  }, [id]);

  useEffect(() => {
    if (calendario) {
      setFormEdit({
        fecha_acta_inicio: calendario.fecha_acta_inicio || "",
        fecha_entrega_programada: calendario.fecha_entrega_programada || "",
        notas: calendario.notas || "",
      });
    }
  }, [calendario]);

  async function cargarCalendario() {
    try {
      const { data, error } = await supabase
        .from("calendario_proyectos")
        .select(
          `
          *,
          proyecto:proyectos_maestro(
            cliente_nombre,
            direccion,
            estado,
            presupuesto_total,
            fecha_inicio
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      setCalendario(data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function guardarCambios() {
    setGuardando(true);
    try {
      const { error } = await supabase
        .from("calendario_proyectos")
        .update({
          fecha_acta_inicio: formEdit.fecha_acta_inicio,
          fecha_entrega_programada: formEdit.fecha_entrega_programada,
          notas: formEdit.notas || null,
        } as any)
        .eq("id", calendario.id);

      if (error) throw error;
      await cargarCalendario();
      setEditando(false);
    } catch (err) {
      console.error("Error:", err);
      alert("Error al guardar cambios");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarCalendario() {
    if (
      !confirm(
        "¿Estás seguro de eliminar esta programación? Esta acción no se puede deshacer."
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("calendario_proyectos")
        .delete()
        .eq("id", calendario.id);

      if (error) throw error;
      router.push("/calendario");
    } catch (err) {
      console.error("Error:", err);
      alert("Error al eliminar");
    }
  }

  function calcularProgreso(inicio: string, fin: string) {
    const hoy = new Date();
    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);

    if (hoy < fechaInicio) return 0;
    if (hoy > fechaFin) return 100;

    const total = fechaFin.getTime() - fechaInicio.getTime();
    const transcurrido = hoy.getTime() - fechaInicio.getTime();
    return Math.round((transcurrido / total) * 100);
  }

  function calcularDiasRestantes(fin: string) {
    const hoy = new Date();
    const fechaFin = new Date(fin);
    const diff = fechaFin.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  if (!calendario) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8">
        <p className="text-[#86868B]">Programación no encontrada</p>
        <Button variant="outline" asChild>
          <Link href="/calendario">Volver</Link>
        </Button>
      </div>
    );
  }

  const duracion = calcularDiasHabiles(
    calendario.fecha_acta_inicio,
    calendario.fecha_entrega_programada
  );
  const progreso = calcularProgreso(
    calendario.fecha_acta_inicio,
    calendario.fecha_entrega_programada
  );
  const diasRestantes = calcularDiasRestantes(
    calendario.fecha_entrega_programada
  );
  const estaRetrasado =
    diasRestantes < 0 && calendario.proyecto.estado !== "FINALIZADO";

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-[#86868B] hover:bg-[#F5F5F7]"
              asChild
            >
              <Link href="/calendario">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-[#1D1D1F]">
                {calendario.proyecto.cliente_nombre}
              </h1>
              {calendario.proyecto.direccion && (
                <div className="flex items-center gap-1.5 text-[12px] text-[#86868B]">
                  <MapPin className="size-3" />
                  <span>{calendario.proyecto.direccion}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (editando) {
                  setEditando(false);
                  if (calendario) {
                    setFormEdit({
                      fecha_acta_inicio:
                        calendario.fecha_acta_inicio || "",
                      fecha_entrega_programada:
                        calendario.fecha_entrega_programada || "",
                      notas: calendario.notas || "",
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
                  : "text-[#007AFF] hover:bg-[#007AFF]/5"
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
              onClick={eliminarCalendario}
              className="rounded-lg text-[13px] text-[#FF3B30] hover:bg-[#FF3B30]/5"
            >
              <Trash2 className="size-3.5" />
              Eliminar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-8 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Información del proyecto */}
          <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
            <h2 className="mb-4 text-[16px] font-semibold text-[#1D1D1F]">
              Información del Proyecto
            </h2>
            <div className="space-y-3">
              <div>
                <span className="text-[13px] text-[#86868B]">Estado</span>
                <p className="mt-0.5">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                      calendario.proyecto.estado === "ACTIVO"
                        ? "bg-[#34C759]/10 text-[#34C759]"
                        : calendario.proyecto.estado === "PAUSADO"
                          ? "bg-[#FF9500]/10 text-[#FF9500]"
                          : "bg-[#86868B]/10 text-[#86868B]"
                    )}
                  >
                    {calendario.proyecto.estado}
                  </span>
                </p>
              </div>

              {calendario.proyecto.presupuesto_total && (
                <div>
                  <span className="text-[13px] text-[#86868B]">
                    Presupuesto
                  </span>
                  <p className="text-[14px] font-medium text-[#1D1D1F]">
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    }).format(calendario.proyecto.presupuesto_total)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Programación */}
          <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#1D1D1F]">
                Programación
              </h2>
              {editando && (
                <Button
                  onClick={guardarCambios}
                  disabled={guardando}
                  size="sm"
                  className="rounded-lg bg-[#007AFF] text-[13px] text-white hover:bg-[#0066DD]"
                >
                  <Save className="size-3.5" />
                  {guardando ? "Guardando..." : "Guardar"}
                </Button>
              )}
            </div>

            {editando ? (
              <div className="space-y-4">
                <div>
                  <Label className="mb-1 text-[13px] text-[#86868B]">
                    Fecha acta de inicio *
                  </Label>
                  <Input
                    type="date"
                    value={formEdit.fecha_acta_inicio}
                    onChange={(e) =>
                      setFormEdit({
                        ...formEdit,
                        fecha_acta_inicio: e.target.value,
                      })
                    }
                    className="border-[#D2D2D7] text-[14px] focus-visible:ring-[#007AFF]"
                  />
                </div>

                <div>
                  <Label className="mb-1 text-[13px] text-[#86868B]">
                    Fecha entrega programada *
                  </Label>
                  <Input
                    type="date"
                    value={formEdit.fecha_entrega_programada}
                    onChange={(e) =>
                      setFormEdit({
                        ...formEdit,
                        fecha_entrega_programada: e.target.value,
                      })
                    }
                    className="border-[#D2D2D7] text-[14px] focus-visible:ring-[#007AFF]"
                  />
                </div>

                <div>
                  <Label className="mb-1 text-[13px] text-[#86868B]">
                    Notas
                  </Label>
                  <textarea
                    value={formEdit.notas}
                    onChange={(e) =>
                      setFormEdit({ ...formEdit, notas: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#D2D2D7] px-3 py-2 text-[14px] text-[#1D1D1F] transition-colors focus:border-[#007AFF] focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="text-[13px] text-[#86868B]">
                    Fecha acta de inicio
                  </span>
                  <p className="text-[14px] font-medium capitalize text-[#1D1D1F]">
                    {new Date(
                      calendario.fecha_acta_inicio
                    ).toLocaleDateString("es-CO", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div>
                  <span className="text-[13px] text-[#86868B]">
                    Fecha entrega programada
                  </span>
                  <p className="text-[14px] font-medium capitalize text-[#1D1D1F]">
                    {new Date(
                      calendario.fecha_entrega_programada
                    ).toLocaleDateString("es-CO", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div>
                  <span className="text-[13px] text-[#86868B]">Duración</span>
                  <p className="text-[14px] font-medium text-[#1D1D1F]">
                    {duracion} días hábiles
                  </p>
                </div>

                <div>
                  <span className="text-[13px] text-[#86868B]">
                    Días restantes
                  </span>
                  <p
                    className={cn(
                      "text-[14px] font-bold",
                      estaRetrasado
                        ? "text-[#FF3B30]"
                        : diasRestantes <= 7
                          ? "text-[#FF9500]"
                          : "text-[#34C759]"
                    )}
                  >
                    {estaRetrasado
                      ? `${Math.abs(diasRestantes)} días de retraso`
                      : `${diasRestantes} días`}
                  </p>
                </div>

                {calendario.notas && (
                  <div>
                    <span className="text-[13px] text-[#86868B]">Notas</span>
                    <p className="text-[13px] text-[#1D1D1F]">
                      {calendario.notas}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
          <h3 className="mb-4 text-[16px] font-semibold text-[#1D1D1F]">
            Progreso del Tiempo
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[12px] text-[#86868B]">
              <span>
                {new Date(calendario.fecha_acta_inicio).toLocaleDateString(
                  "es-CO"
                )}
              </span>
              <span className="text-[14px] font-semibold text-[#1D1D1F]">
                {progreso}%
              </span>
              <span>
                {new Date(
                  calendario.fecha_entrega_programada
                ).toLocaleDateString("es-CO")}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-[#F5F5F7]">
              <div
                className={cn(
                  "h-3 rounded-full transition-all",
                  estaRetrasado
                    ? "bg-[#FF3B30]"
                    : progreso > 90
                      ? "bg-[#FF9500]"
                      : "bg-[#007AFF]"
                )}
                style={{ width: `${Math.min(progreso, 100)}%` }}
              />
            </div>
            {estaRetrasado && (
              <div className="rounded-xl bg-[#FF3B30]/5 p-3 text-[13px] text-[#FF3B30]">
                Este proyecto está retrasado. La fecha de entrega programada ya
                pasó.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
