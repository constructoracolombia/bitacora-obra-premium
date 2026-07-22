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
import { calcularDiasHabiles, calcularProgreso } from "@/lib/programacion";

interface ProyectoCalendario {
  id: string;
  proyecto_id: string;
  fecha_acta_inicio: string;
  fecha_entrega_programada: string;
  notas: string;
  _source?: "calendario" | "maestro";
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
      // Query 1: entradas manuales en calendario_proyectos
      const { data: calData, error: calError } = await supabase
        .from("calendario_proyectos")
        .select(
          `*, proyecto:proyectos_maestro(cliente_nombre, estado, presupuesto_total)`
        )
        .order("fecha_acta_inicio", { ascending: true });

      if (calError) throw calError;
      console.log('calendario_proyectos (manual):', calData?.length, calData);

      const scheduledIds = new Set((calData || []).map((c: any) => c.proyecto_id));

      // Query 2: proyectos con fecha_entrega_contractual que no tienen entrada manual
      const { data: maestroData, error: maestroError } = await supabase
        .from("proyectos_maestro")
        .select(
          "id, cliente_nombre, estado, presupuesto_total, fecha_acta_inicio, fecha_inicio, fecha_entrega_contractual"
        )
        .not("fecha_entrega_contractual", "is", null)
        .neq("estado", "CANCELADO");

      if (maestroError) {
        console.error('Error en query proyectos_maestro:', maestroError);
        throw maestroError;
      }
      console.log('proyectos_maestro candidatos:', maestroData?.length, maestroData);

      const autoEntries: ProyectoCalendario[] = (maestroData || [])
        .filter((m: any) => !scheduledIds.has(m.id))
        .filter((m: any) => m.fecha_acta_inicio || m.fecha_inicio)
        .map((m: any) => ({
          id: m.id,
          proyecto_id: m.id,
          fecha_acta_inicio: m.fecha_acta_inicio || m.fecha_inicio,
          fecha_entrega_programada: m.fecha_entrega_contractual,
          notas: "",
          _source: "maestro" as const,
          proyecto: {
            cliente_nombre: m.cliente_nombre || "Sin nombre",
            estado: (m.estado || "ACTIVO").toUpperCase(),
            presupuesto_total: m.presupuesto_total || 0,
          },
        }));

      const calEntries = (calData || []).map((c: any) => ({
        ...c,
        _source: "calendario" as const,
      }));

      const resultado = [...calEntries, ...autoEntries];
      console.log('merge final:', resultado?.length, resultado);
      setProyectos(resultado);
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
        <div className="mx-auto flex max-w-[95vw] items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Calendar className="size-6 text-[#007AFF]" />
            <h1 className="text-xl font-semibold tracking-tight text-[#1D1D1F]">
              Programación de Proyectos
            </h1>
          </div>
          <Button
            onClick={() => router.push("/calendario/nuevo")}
            className="h-11 rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5] sm:h-9"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Programar Proyecto</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[95vw] px-4 py-6 sm:px-6">
        {/* Aviso móvil — el Gantt necesita pantalla grande */}
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FF9500]/30 bg-[#FF9500]/5 p-3 text-[13px] text-[#1D1D1F] md:hidden">
          <Calendar className="mt-0.5 size-4 shrink-0 text-[#FF9500]" />
          <span>
            La programación (Gantt) se ve mejor en pantalla grande. Aquí abajo tienes una lista
            simplificada con fechas y estado de cada proyecto.
          </span>
        </div>

        {/* Controles */}
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#D2D2D7]/60 bg-white p-4 md:flex-row md:items-center md:justify-between">
          {/* Vista toggle + navegación — solo aplican al Gantt, oculto en móvil */}
          <div className="hidden items-center gap-4 md:flex">
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
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="hidden size-4 shrink-0 text-[#86868B] sm:block" />
            <div className="flex flex-wrap gap-2">
              {ESTADOS_FILTRO.map((estado) => (
                <button
                  key={estado}
                  onClick={() => setFiltroEstado(estado)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors sm:py-1.5",
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
            </div>

            {/* Ordenamiento */}
            <div className="flex items-center gap-2 border-[#D2D2D7] pl-0 sm:ml-4 sm:border-l sm:pl-4">
              <span className="hidden text-[13px] text-[#86868B] sm:inline">Ordenar:</span>
              <select
                value={ordenamiento}
                onChange={(e) =>
                  setOrdenamiento(
                    e.target.value as "nombre" | "fecha_inicio" | "fecha_fin"
                  )
                }
                className="h-11 rounded-lg border border-[#D2D2D7] px-3 text-[13px] text-[#1D1D1F] transition-colors focus:border-[#007AFF] focus:outline-none focus:ring-1 focus:ring-[#007AFF] sm:h-auto sm:py-1.5"
              >
                <option value="fecha_fin">Fecha entrega (próxima primero)</option>
                <option value="fecha_inicio">Fecha inicio</option>
                <option value="nombre">Nombre</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista simplificada — móvil */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center md:hidden">
            <div className="size-8 animate-spin rounded-full border-4 border-[#007AFF] border-r-transparent" />
          </div>
        ) : (
          <div className="mb-6 space-y-3 md:hidden">
            {proyectosFiltrados.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
                <Calendar className="size-10 text-[#D2D2D7]" />
                <p className="text-[14px] text-[#86868B]">No hay proyectos programados</p>
              </div>
            ) : (
              proyectosFiltrados.map((proyecto) => {
                const progreso = calcularProgreso(
                  proyecto.fecha_acta_inicio,
                  proyecto.fecha_entrega_programada
                );
                const ahora = new Date();
                const fechaFin = new Date(proyecto.fecha_entrega_programada);
                const estaRetrasado =
                  ahora > fechaFin && proyecto.proyecto.estado !== "FINALIZADO";

                return (
                  <div
                    key={proyecto.id}
                    onClick={() =>
                      proyecto._source === "maestro"
                        ? router.push(`/proyectos/${proyecto.id}`)
                        : router.push(`/calendario/${proyecto.id}`)
                    }
                    className="cursor-pointer rounded-xl border border-[#D2D2D7]/60 bg-white p-3.5 active:bg-[#FAFAFA]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-base font-medium text-[#1D1D1F]">
                        {proyecto.proyecto.cliente_nombre}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
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

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F5F5F7]">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          estaRetrasado ? "bg-[#FF3B30]" : "bg-[#007AFF]"
                        )}
                        style={{ width: `${progreso}%` }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-[#86868B]">
                      <span>
                        {new Date(proyecto.fecha_acta_inicio).toLocaleDateString("es-CO", {
                          day: "2-digit",
                          month: "short",
                        })}
                        {" → "}
                        {new Date(proyecto.fecha_entrega_programada).toLocaleDateString("es-CO", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {estaRetrasado ? (
                        <span className="font-semibold text-[#FF3B30]">Retrasado</span>
                      ) : (
                        <span>
                          {calcularDiasHabiles(
                            proyecto.fecha_acta_inicio,
                            proyecto.fecha_entrega_programada
                          )}{" "}
                          d háb
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Gantt Chart — desktop */}
        {loading ? (
          <div className="hidden min-h-[400px] items-center justify-center md:flex">
            <div className="size-8 animate-spin rounded-full border-4 border-[#007AFF] border-r-transparent" />
          </div>
        ) : (
          <div className="hidden overflow-x-auto rounded-2xl border border-[#D2D2D7]/60 bg-white shadow-sm md:block">
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
                            proyecto._source === "maestro"
                              ? router.push(`/proyectos/${proyecto.id}`)
                              : router.push(`/calendario/${proyecto.id}`)
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
                              proyecto._source === "maestro"
                              ? router.push(`/proyectos/${proyecto.id}`)
                              : router.push(`/calendario/${proyecto.id}`)
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
                              {" · "}
                              {calcularDiasHabiles(
                                proyecto.fecha_acta_inicio,
                                proyecto.fecha_entrega_programada
                              )}
                              d háb
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

        {/* Leyenda — solo aplica al Gantt de desktop */}
        <div className="mt-4 hidden items-center gap-6 text-[13px] text-[#86868B] md:flex">
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
