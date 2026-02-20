// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProyectoCalendario {
  id: string;
  proyecto_id: string;
  fecha_acta_inicio: string;
  fecha_entrega_programada: string;
  notas: string;
  proyecto: {
    cliente_nombre: string;
    estado: string;
  };
}

export default function CalendarioPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [proyectos, setProyectos] = useState<ProyectoCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesActual, setMesActual] = useState(new Date());

  useEffect(() => {
    cargarProyectos();
  }, []);

  async function cargarProyectos() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("calendario_proyectos")
        .select(
          `
          *,
          proyecto:proyectos_maestro(cliente_nombre, estado)
        `
        )
        .order("fecha_acta_inicio", { ascending: true });

      if (error) throw error;
      setProyectos(data || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  function cambiarMes(direccion: number) {
    const nuevaFecha = new Date(mesActual);
    nuevaFecha.setMonth(nuevaFecha.getMonth() + direccion);
    setMesActual(nuevaFecha);
  }

  function getDiasEnMes(fecha: Date) {
    const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
    return { primerDia, ultimoDia, totalDias: ultimoDia.getDate() };
  }

  function calcularDuracion(inicio: string, fin: string) {
    const diff = new Date(fin).getTime() - new Date(inicio).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function calcularPosicion(
    fecha: string,
    primerDia: Date,
    totalDias: number
  ) {
    const fechaProyecto = new Date(fecha);
    if (fechaProyecto < primerDia) return 0;
    const dia = fechaProyecto.getDate();
    return ((dia - 1) / totalDias) * 100;
  }

  function calcularAncho(
    inicio: string,
    fin: string,
    primerDia: Date,
    ultimoDia: Date,
    totalDias: number
  ) {
    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);

    const inicioVisible = fechaInicio < primerDia ? primerDia : fechaInicio;
    const finVisible = fechaFin > ultimoDia ? ultimoDia : fechaFin;

    if (inicioVisible > ultimoDia || finVisible < primerDia) return 0;

    const diaInicio = inicioVisible.getDate();
    const diaFin = finVisible.getDate();

    return ((diaFin - diaInicio + 1) / totalDias) * 100;
  }

  const { primerDia, ultimoDia, totalDias } = getDiasEnMes(mesActual);

  const proyectosFiltrados = proyectos.filter((p) => {
    const inicio = new Date(p.fecha_acta_inicio);
    const fin = new Date(p.fecha_entrega_programada);
    return inicio <= ultimoDia && fin >= primerDia;
  });

  const nombreMes = mesActual.toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <div className="flex items-center gap-3">
            <Calendar className="size-6 text-[#007AFF]" />
            <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">
              Calendario de Proyectos
            </h1>
          </div>
          <Button
            onClick={() => router.push("/calendario/nuevo")}
            className="rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
          >
            <Plus className="size-4" />
            Programar Proyecto
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-8 py-8">
        {/* Navegación de mes */}
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-[#D2D2D7]/60 bg-white p-4">
          <button
            onClick={() => cambiarMes(-1)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium text-[#86868B] transition-colors hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
          >
            <ChevronLeft className="size-4" />
            Mes anterior
          </button>

          <h2 className="text-lg font-semibold capitalize text-[#1D1D1F]">
            {nombreMes}
          </h2>

          <button
            onClick={() => cambiarMes(1)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium text-[#86868B] transition-colors hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
          >
            Mes siguiente
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-4 border-[#007AFF] border-r-transparent" />
          </div>
        ) : proyectosFiltrados.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
            <Calendar className="size-12 text-[#D2D2D7]" />
            <p className="text-[15px] text-[#1D1D1F]">
              No hay proyectos programados para este mes
            </p>
            <p className="text-sm text-[#86868B]">
              Programa un proyecto para verlo en el calendario
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Escala de días */}
            <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
              <div className="mb-4 flex justify-between text-[11px] text-[#86868B]">
                {Array.from({ length: totalDias }, (_, i) => i + 1).map(
                  (dia) => (
                    <div key={dia} className="w-full text-center">
                      {dia}
                    </div>
                  )
                )}
              </div>

              {/* Barras de proyectos */}
              <div className="relative space-y-3">
                {proyectosFiltrados.map((proyecto) => {
                  const posicion = calcularPosicion(
                    proyecto.fecha_acta_inicio,
                    primerDia,
                    totalDias
                  );
                  const ancho = calcularAncho(
                    proyecto.fecha_acta_inicio,
                    proyecto.fecha_entrega_programada,
                    primerDia,
                    ultimoDia,
                    totalDias
                  );

                  if (ancho === 0) return null;

                  const duracion = calcularDuracion(
                    proyecto.fecha_acta_inicio,
                    proyecto.fecha_entrega_programada
                  );
                  const hoy = new Date();
                  const fechaFin = new Date(proyecto.fecha_entrega_programada);
                  const estaRetrasado =
                    hoy > fechaFin &&
                    proyecto.proyecto.estado !== "FINALIZADO";

                  return (
                    <div key={proyecto.id} className="relative h-12">
                      <div
                        onClick={() =>
                          router.push(`/calendario/${proyecto.id}`)
                        }
                        className={cn(
                          "absolute h-10 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]",
                          estaRetrasado
                            ? "bg-[#FF3B30]"
                            : proyecto.proyecto.estado === "FINALIZADO"
                              ? "bg-[#34C759]"
                              : proyecto.proyecto.estado === "ACTIVO"
                                ? "bg-[#007AFF]"
                                : "bg-[#86868B]"
                        )}
                        style={{
                          left: `${posicion}%`,
                          width: `${ancho}%`,
                          minWidth: "60px",
                        }}
                      >
                        <div className="flex h-full items-center justify-between px-3 text-[11px] font-medium text-white">
                          <span className="truncate">
                            {proyecto.proyecto.cliente_nombre}
                          </span>
                          <span className="whitespace-nowrap ml-1">
                            {duracion}d
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leyenda */}
            <div className="flex items-center gap-6 text-[13px] text-[#86868B]">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm bg-[#007AFF]" />
                <span>Activo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm bg-[#34C759]" />
                <span>Finalizado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm bg-[#FF3B30]" />
                <span>Retrasado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm bg-[#86868B]" />
                <span>Pausado</span>
              </div>
            </div>

            {/* Lista de proyectos */}
            <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
              <h3 className="mb-4 text-[16px] font-semibold text-[#1D1D1F]">
                Proyectos del mes
              </h3>
              <div className="space-y-3">
                {proyectosFiltrados.map((proyecto) => {
                  const duracion = calcularDuracion(
                    proyecto.fecha_acta_inicio,
                    proyecto.fecha_entrega_programada
                  );

                  return (
                    <div
                      key={proyecto.id}
                      onClick={() =>
                        router.push(`/calendario/${proyecto.id}`)
                      }
                      className="cursor-pointer rounded-xl border border-[#D2D2D7]/60 p-4 transition-all hover:border-[#D2D2D7] hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-[14px] font-semibold text-[#1D1D1F]">
                            {proyecto.proyecto.cliente_nombre}
                          </h4>
                          <div className="mt-1 flex items-center gap-4 text-[12px] text-[#86868B]">
                            <span>
                              {new Date(
                                proyecto.fecha_acta_inicio
                              ).toLocaleDateString("es-CO")}{" "}
                              →{" "}
                              {new Date(
                                proyecto.fecha_entrega_programada
                              ).toLocaleDateString("es-CO")}
                            </span>
                            <span>{duracion} días</span>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                            proyecto.proyecto.estado === "ACTIVO"
                              ? "bg-[#34C759]/10 text-[#34C759]"
                              : proyecto.proyecto.estado === "PAUSADO"
                                ? "bg-[#FF9500]/10 text-[#FF9500]"
                                : "bg-[#86868B]/10 text-[#86868B]"
                          )}
                        >
                          {proyecto.proyecto.estado}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
