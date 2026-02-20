// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
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
    presupuesto_total: number;
  };
}

export default function CalendarioPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [proyectos, setProyectos] = useState<ProyectoCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [rangoVista, setRangoVista] = useState<"semana" | "mes" | "trimestre">(
    "trimestre"
  );
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [ordenamiento, setOrdenamiento] = useState<
    "nombre" | "fecha_inicio" | "fecha_fin"
  >("fecha_fin");

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
          proyecto:proyectos_maestro(cliente_nombre, estado, presupuesto_total)
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

  function cambiarPeriodo(direccion: number) {
    const nueva = new Date(fechaInicio);
    if (rangoVista === "semana") {
      nueva.setDate(nueva.getDate() + direccion * 7);
    } else if (rangoVista === "mes") {
      nueva.setMonth(nueva.getMonth() + direccion);
    } else {
      nueva.setMonth(nueva.getMonth() + direccion * 3);
    }
    setFechaInicio(nueva);
  }

  function generarColumnasFechas() {
    const columnas: Date[] = [];
    const inicio = new Date(fechaInicio);

    if (rangoVista === "semana") {
      const dia = inicio.getDay();
      const diff = inicio.getDate() - dia + (dia === 0 ? -6 : 1);
      const lunes = new Date(inicio);
      lunes.setDate(diff);

      for (let i = 0; i < 7; i++) {
        const fecha = new Date(lunes);
        fecha.setDate(fecha.getDate() + i);
        columnas.push(fecha);
      }
    } else if (rangoVista === "mes") {
      const primerDia = new Date(
        inicio.getFullYear(),
        inicio.getMonth(),
        1
      );
      const ultimoDia = new Date(
        inicio.getFullYear(),
        inicio.getMonth() + 1,
        0
      );

      for (
        let d = new Date(primerDia);
        d <= ultimoDia;
        d.setDate(d.getDate() + 1)
      ) {
        columnas.push(new Date(d));
      }
    } else {
      const primerMes = Math.floor(inicio.getMonth() / 3) * 3;
      const primerDia = new Date(inicio.getFullYear(), primerMes, 1);

      for (let i = 0; i < 90; i++) {
        const fecha = new Date(primerDia);
        fecha.setDate(fecha.getDate() + i);
        columnas.push(fecha);
      }
    }

    return columnas;
  }

  function calcularPosicionBarra(
    proyectoInicio: string,
    proyectoFin: string,
    columnas: Date[]
  ) {
    const inicio = new Date(proyectoInicio);
    const fin = new Date(proyectoFin);
    const primerColumna = columnas[0];
    const ultimaColumna = columnas[columnas.length - 1];

    if (fin < primerColumna || inicio > ultimaColumna) return null;

    let indiceInicio = 0;
    for (let i = 0; i < columnas.length; i++) {
      if (columnas[i] >= inicio) {
        indiceInicio = i;
        break;
      }
    }

    let indiceFin = columnas.length - 1;
    for (let i = columnas.length - 1; i >= 0; i--) {
      if (columnas[i] <= fin) {
        indiceFin = i;
        break;
      }
    }

    const ancho = indiceFin - indiceInicio + 1;

    return {
      inicio: indiceInicio,
      ancho,
      porcentajeInicio: (indiceInicio / columnas.length) * 100,
      porcentajeAncho: (ancho / columnas.length) * 100,
    };
  }

  function calcularProgreso(inicio: string, fin: string) {
    const hoy = new Date();
    const fechaIni = new Date(inicio);
    const fechaFin = new Date(fin);

    if (hoy < fechaIni) return 0;
    if (hoy > fechaFin) return 100;

    const total = fechaFin.getTime() - fechaIni.getTime();
    const transcurrido = hoy.getTime() - fechaIni.getTime();
    return Math.round((transcurrido / total) * 100);
  }

  const columnasFechas = generarColumnasFechas();

  const proyectosFiltrados = proyectos
    .filter((p) => {
      if (filtroEstado === "TODOS") return true;
      return p.proyecto.estado === filtroEstado;
    })
    .sort((a, b) => {
      if (ordenamiento === "fecha_fin") {
        return (
          new Date(a.fecha_entrega_programada).getTime() -
          new Date(b.fecha_entrega_programada).getTime()
        );
      } else if (ordenamiento === "fecha_inicio") {
        return (
          new Date(a.fecha_acta_inicio).getTime() -
          new Date(b.fecha_acta_inicio).getTime()
        );
      } else {
        return a.proyecto.cliente_nombre.localeCompare(
          b.proyecto.cliente_nombre
        );
      }
    });

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let columnaHoy = -1;
  columnasFechas.forEach((fecha, idx) => {
    const fechaCol = new Date(fecha);
    fechaCol.setHours(0, 0, 0, 0);
    if (fechaCol.getTime() === hoy.getTime()) {
      columnaHoy = idx;
    }
  });

  const VISTAS = [
    { key: "semana" as const, label: "Semana" },
    { key: "mes" as const, label: "Mes" },
    { key: "trimestre" as const, label: "Trimestre" },
  ];

  const ESTADOS_FILTRO = ["TODOS", "ACTIVO", "PAUSADO", "FINALIZADO"];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[95vw] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Calendar className="size-6 text-[#007AFF]" />
            <h1 className="text-xl font-semibold tracking-tight text-[#1D1D1F]">
              Programación de Proyectos
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

      <main className="mx-auto max-w-[95vw] px-6 py-6">
        {/* Controles */}
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#D2D2D7]/60 bg-white p-4">
          <div className="flex items-center gap-4">
            {/* Vista toggle */}
            <div className="flex overflow-hidden rounded-lg border border-[#D2D2D7]">
              {VISTAS.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setRangoVista(v.key)}
                  className={cn(
                    "px-3 py-1.5 text-[13px] font-medium transition-colors",
                    rangoVista === v.key
                      ? "bg-[#007AFF] text-white"
                      : "text-[#1D1D1F] hover:bg-[#F5F5F7]"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Navegación */}
            <button
              onClick={() => cambiarPeriodo(-1)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#86868B] transition-colors hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
            >
              <ChevronLeft className="size-4" />
              Anterior
            </button>

            <button
              onClick={() => setFechaInicio(new Date())}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#007AFF] transition-colors hover:bg-[#007AFF]/5"
            >
              Hoy
            </button>

            <button
              onClick={() => cambiarPeriodo(1)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#86868B] transition-colors hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
            >
              Siguiente
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Filtros de estado */}
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-[#86868B]" />
            {ESTADOS_FILTRO.map((estado) => (
              <button
                key={estado}
                onClick={() => setFiltroEstado(estado)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                  filtroEstado === estado
                    ? "bg-[#007AFF] text-white"
                    : "bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E8E8ED]"
                )}
              >
                {estado === "TODOS"
                  ? "Todos"
                  : estado.charAt(0) + estado.slice(1).toLowerCase()}
              </button>
            ))}

            {/* Ordenamiento */}
            <div className="ml-4 flex items-center gap-2 border-l border-[#D2D2D7] pl-4">
              <span className="text-[13px] text-[#86868B]">Ordenar:</span>
              <select
                value={ordenamiento}
                onChange={(e) =>
                  setOrdenamiento(
                    e.target.value as "nombre" | "fecha_inicio" | "fecha_fin"
                  )
                }
                className="rounded-lg border border-[#D2D2D7] px-3 py-1.5 text-[13px] text-[#1D1D1F] transition-colors focus:border-[#007AFF] focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
              >
                <option value="fecha_fin">Fecha entrega (próxima primero)</option>
                <option value="fecha_inicio">Fecha inicio</option>
                <option value="nombre">Nombre</option>
              </select>
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-4 border-[#007AFF] border-r-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#D2D2D7]/60 bg-white shadow-sm">
            <div className="min-w-[1200px]">
              {/* Header de fechas */}
              <div className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-[#FAFAFA]">
                <div className="flex">
                  {/* Columna de proyectos */}
                  <div className="w-64 flex-shrink-0 border-r border-[#D2D2D7]/40 bg-[#F5F5F7] p-3">
                    <span className="text-[13px] font-semibold text-[#86868B]">
                      Proyecto
                    </span>
                  </div>

                  {/* Columnas de fechas */}
                  <div className="flex flex-1">
                    {columnasFechas.map((fecha, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex-1 border-r border-[#D2D2D7]/20 p-2 text-center",
                          idx === columnaHoy && "bg-[#007AFF]/5"
                        )}
                      >
                        <div className="text-[11px] font-medium text-[#86868B]">
                          {rangoVista === "semana" && (
                            <>
                              <div>
                                {fecha.toLocaleDateString("es-CO", {
                                  weekday: "short",
                                })}
                              </div>
                              <div className="text-lg font-bold text-[#1D1D1F]">
                                {fecha.getDate()}
                              </div>
                            </>
                          )}
                          {rangoVista === "mes" && (
                            <div
                              className={cn(
                                (fecha.getDay() === 0 ||
                                  fecha.getDay() === 6) &&
                                  "text-[#D2D2D7]"
                              )}
                            >
                              {fecha.getDate()}
                            </div>
                          )}
                          {rangoVista === "trimestre" &&
                            fecha.getDate() === 1 && (
                              <div className="font-bold text-[#1D1D1F]">
                                {fecha.toLocaleDateString("es-CO", {
                                  month: "short",
                                })}
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filas de proyectos */}
              {proyectosFiltrados.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 text-center">
                  <Calendar className="size-10 text-[#D2D2D7]" />
                  <p className="text-[14px] text-[#86868B]">
                    No hay proyectos programados
                  </p>
                </div>
              ) : (
                <div>
                  {proyectosFiltrados.map((proyecto) => {
                    const posicion = calcularPosicionBarra(
                      proyecto.fecha_acta_inicio,
                      proyecto.fecha_entrega_programada,
                      columnasFechas
                    );

                    if (!posicion) return null;

                    const progreso = calcularProgreso(
                      proyecto.fecha_acta_inicio,
                      proyecto.fecha_entrega_programada
                    );

                    const ahora = new Date();
                    const fechaFin = new Date(
                      proyecto.fecha_entrega_programada
                    );
                    const estaRetrasado =
                      ahora > fechaFin &&
                      proyecto.proyecto.estado !== "FINALIZADO";

                    return (
                      <div
                        key={proyecto.id}
                        className="flex border-b border-[#D2D2D7]/30 transition-colors hover:bg-[#FAFAFA]"
                      >
                        {/* Nombre del proyecto */}
                        <div
                          onClick={() =>
                            router.push(`/calendario/${proyecto.id}`)
                          }
                          className="w-64 flex-shrink-0 cursor-pointer border-r border-[#D2D2D7]/40 p-3"
                        >
                          <div className="text-[13px] font-medium text-[#1D1D1F]">
                            {proyecto.proyecto.cliente_nombre}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                proyecto.proyecto.estado === "ACTIVO"
                                  ? "bg-[#34C759]/10 text-[#34C759]"
                                  : proyecto.proyecto.estado === "PAUSADO"
                                    ? "bg-[#FF9500]/10 text-[#FF9500]"
                                    : "bg-[#86868B]/10 text-[#86868B]"
                              )}
                            >
                              {proyecto.proyecto.estado}
                            </span>
                            {estaRetrasado && (
                              <span className="text-[10px] font-semibold text-[#FF3B30]">
                                Retrasado
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Timeline */}
                        <div className="relative flex flex-1">
                          {/* Línea de hoy */}
                          {columnaHoy >= 0 && (
                            <div
                              className="absolute bottom-0 top-0 z-10 w-0.5 bg-[#007AFF]"
                              style={{
                                left: `${(columnaHoy / columnasFechas.length) * 100}%`,
                              }}
                            />
                          )}

                          {/* Barra del proyecto */}
                          <div
                            onClick={() =>
                              router.push(`/calendario/${proyecto.id}`)
                            }
                            className="absolute top-3 cursor-pointer"
                            style={{
                              left: `${posicion.porcentajeInicio}%`,
                              width: `${posicion.porcentajeAncho}%`,
                            }}
                          >
                            <div
                              className={cn(
                                "h-6 overflow-hidden rounded-md shadow-sm transition-shadow hover:shadow-md",
                                estaRetrasado
                                  ? "bg-[#FF3B30]"
                                  : proyecto.proyecto.estado === "FINALIZADO"
                                    ? "bg-[#34C759]"
                                    : proyecto.proyecto.estado === "ACTIVO"
                                      ? "bg-[#007AFF]"
                                      : "bg-[#86868B]"
                              )}
                            >
                              <div
                                className="h-full rounded-md bg-black/20"
                                style={{ width: `${progreso}%` }}
                              />
                            </div>

                            <div className="mt-1 text-[10px] text-[#86868B] whitespace-nowrap">
                              {new Date(
                                proyecto.fecha_acta_inicio
                              ).toLocaleDateString("es-CO", {
                                day: "2-digit",
                                month: "short",
                              })}
                              {" - "}
                              {new Date(
                                proyecto.fecha_entrega_programada
                              ).toLocaleDateString("es-CO", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </div>
                          </div>

                          {/* Grid de fondo */}
                          <div className="absolute inset-0 flex">
                            {columnasFechas.map((_, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "flex-1 border-r border-[#D2D2D7]/10",
                                  idx === columnaHoy && "bg-[#007AFF]/[0.03]"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leyenda */}
        <div className="mt-4 flex items-center gap-6 text-[13px] text-[#86868B]">
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
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-14 overflow-hidden rounded bg-[#007AFF]">
              <div className="h-full w-1/2 bg-black/20" />
            </div>
            <span>Progreso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-0.5 bg-[#007AFF]" />
            <span>Hoy</span>
          </div>
        </div>
      </main>
    </div>
  );
}
