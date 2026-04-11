"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Trash2, CheckCircle2, Clock, ChevronDown, ChevronRight, Loader2, Save } from "lucide-react";

const db = getSupabaseClient();

interface FilaNomina {
  _key: string;
  fecha_pago: string;
  nombre_trabajador: string;
  centro_costo: string;
  actividad: string;
  porcentaje_avance: string;
  valor_total_actividad: string;
  valor_pagado: string;
  forma_pago: string;
  numero_cuenta: string;
  titular_cuenta: string;
  cc_titular: string;
  observaciones: string;
}

interface NominaSemanal {
  id: string;
  semana_label: string;
  fecha_inicio: string;
  fecha_fin: string;
  total_pagar: number;
  num_trabajadores: number;
  estado: string;
  created_at: string;
  nomina_detalle?: any[];
}

const formatCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const parseCOP = (s: string) => parseFloat(s.replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;

function filaVacia(fecha: string): FilaNomina {
  return {
    _key: crypto.randomUUID(),
    fecha_pago: fecha,
    nombre_trabajador: "",
    centro_costo: "",
    actividad: "",
    porcentaje_avance: "",
    valor_total_actividad: "",
    valor_pagado: "",
    forma_pago: "",
    numero_cuenta: "",
    titular_cuenta: "",
    cc_titular: "",
    observaciones: "",
  };
}

function getWeekLabel() {
  const hoy = new Date();
  const start = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const semana = Math.ceil((hoy.getDate() + start.getDay()) / 7);
  return `Semana ${semana} - ${hoy.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}`;
}

const COLS: { key: keyof Omit<FilaNomina, "_key">; label: string; width: string; type?: string }[] = [
  { key: "fecha_pago", label: "Fecha", width: "110px", type: "date" },
  { key: "nombre_trabajador", label: "Trabajador", width: "150px" },
  { key: "centro_costo", label: "Proyecto", width: "130px" },
  { key: "actividad", label: "Actividad", width: "120px" },
  { key: "porcentaje_avance", label: "% Avance", width: "80px" },
  { key: "valor_total_actividad", label: "Valor Total Actividad", width: "130px", type: "number" },
  { key: "valor_pagado", label: "Valor a Pagar", width: "120px", type: "number" },
  { key: "forma_pago", label: "Forma de Pago", width: "130px" },
  { key: "numero_cuenta", label: "Número de Cuenta", width: "130px" },
  { key: "titular_cuenta", label: "Titular Cuenta", width: "140px" },
  { key: "cc_titular", label: "CC Titular", width: "110px" },
  { key: "observaciones", label: "Observaciones", width: "160px" },
];

export default function NominaPage() {
  const hoy = new Date().toISOString().split("T")[0];
  const [filas, setFilas] = useState<FilaNomina[]>([filaVacia(hoy)]);
  const [semanaLabel, setSemanaLabel] = useState(getWeekLabel());
  const [guardando, setGuardando] = useState(false);
  const [nominas, setNominas] = useState<NominaSemanal[]>([]);
  const [loadingNominas, setLoadingNominas] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { cargarNominas(); }, []);

  async function cargarNominas() {
    setLoadingNominas(true);
    const { data } = await db
      .from("nomina_semanal")
      .select("*, nomina_detalle(*)")
      .order("created_at", { ascending: false });
    setNominas(data || []);
    setLoadingNominas(false);
  }

  function actualizarFila(key: string, campo: keyof Omit<FilaNomina, "_key">, valor: string) {
    setFilas(prev => prev.map(f => f._key === key ? { ...f, [campo]: valor } : f));
  }

  function agregarFila() {
    const ultima = filas[filas.length - 1];
    setFilas(prev => [...prev, filaVacia(ultima?.fecha_pago || hoy)]);
  }

  function eliminarFila(key: string) {
    if (filas.length === 1) return;
    setFilas(prev => prev.filter(f => f._key !== key));
  }

  async function guardar() {
    const validas = filas.filter(f => f.nombre_trabajador.trim() && parseCOP(f.valor_pagado) > 0);
    if (validas.length === 0) {
      alert("Agrega al menos un trabajador con nombre y valor a pagar.");
      return;
    }

    setGuardando(true);
    try {
      const total = validas.reduce((s, f) => s + parseCOP(f.valor_pagado), 0);
      const trabajadoresUnicos = new Set(validas.map(f => f.nombre_trabajador.trim())).size;
      const inicio = new Date(); inicio.setDate(inicio.getDate() - inicio.getDay() + 1);
      const fin = new Date(inicio); fin.setDate(inicio.getDate() + 6);

      const { data: nomina, error } = await db
        .from("nomina_semanal")
        .insert({
          semana_label: semanaLabel,
          fecha_inicio: inicio.toISOString().split("T")[0],
          fecha_fin: fin.toISOString().split("T")[0],
          total_pagar: total,
          num_trabajadores: trabajadoresUnicos,
          estado: "pendiente",
        })
        .select()
        .single();

      if (error) throw error;

      const detalleRows = validas.map(f => ({
        nomina_id: nomina.id,
        fecha_pago: f.fecha_pago,
        nombre_trabajador: f.nombre_trabajador.trim(),
        centro_costo: f.centro_costo.trim(),
        actividad: f.actividad.trim(),
        porcentaje_avance: f.porcentaje_avance.trim(),
        valor_total_actividad: parseCOP(f.valor_total_actividad),
        valor_pagado: parseCOP(f.valor_pagado),
        forma_pago: f.forma_pago.trim(),
        numero_cuenta: f.numero_cuenta.trim(),
        titular_cuenta: f.titular_cuenta.trim(),
        cc_titular: f.cc_titular.trim(),
        observaciones: f.observaciones.trim(),
      }));

      await db.from("nomina_detalle").insert(detalleRows);

      setFilas([filaVacia(hoy)]);
      setSemanaLabel(getWeekLabel());
      await cargarNominas();
      alert(`✅ Nómina "${semanaLabel}" guardada. ${validas.length} registros.`);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setGuardando(false);
    }
  }

  const totalActual = filas.reduce((s, f) => s + parseCOP(f.valor_pagado), 0);

  return (
    <div className="p-6 space-y-8">

      {/* Formulario nueva nómina */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Nómina Semanal</h1>
            <p className="text-sm text-gray-500 mt-0.5">Registra los pagos de la semana</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              value={semanaLabel}
              onChange={e => setSemanaLabel(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-semibold text-green-700">{formatCOP(totalActual)}</span>
            <Button onClick={guardar} disabled={guardando} className="gap-2 bg-blue-600 hover:bg-blue-700">
              {guardando ? <><Loader2 className="size-4 animate-spin" />Guardando...</> : <><Save className="size-4" />Guardar Nómina</>}
            </Button>
          </div>
        </div>

        {/* Tabla editable */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: "1600px" }}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {COLS.map(c => (
                    <th key={c.key} style={{ minWidth: c.width }} className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                  <th className="w-10 px-2 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, i) => (
                  <tr key={fila._key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                    {COLS.map(c => (
                      <td key={c.key} className="px-1.5 py-1">
                        <input
                          type={c.type === "date" ? "date" : "text"}
                          value={fila[c.key]}
                          onChange={e => actualizarFila(fila._key, c.key, e.target.value)}
                          placeholder={c.type === "number" ? "0" : c.label}
                          className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                          style={{ minWidth: c.width }}
                        />
                      </td>
                    ))}
                    <td className="px-1.5 py-1">
                      <button
                        onClick={() => eliminarFila(fila._key)}
                        disabled={filas.length === 1}
                        className="p-1 rounded text-gray-300 hover:text-red-500 disabled:opacity-20"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 p-2">
            <button
              onClick={agregarFila}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            >
              <Plus className="size-3.5" /> Agregar trabajador
            </button>
          </div>
        </div>
      </div>

      {/* Historial */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Historial</h2>
        {loadingNominas ? (
          <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : nominas.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No hay nóminas guardadas aún</p>
        ) : (
          <div className="space-y-2">
            {nominas.map(n => (
              <div key={n.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}
                >
                  <div className="flex items-center gap-3">
                    {n.estado === "pagado"
                      ? <CheckCircle2 className="size-5 text-green-500" />
                      : <Clock className="size-5 text-amber-500" />}
                    <div className="text-left">
                      <p className="font-medium text-sm text-gray-900">{n.semana_label}</p>
                      <p className="text-xs text-gray-500">{n.num_trabajadores} trabajadores · {new Date(n.created_at).toLocaleDateString("es-CO")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">{formatCOP(n.total_pagar)}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                      n.estado === "pagado" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {n.estado === "pagado" ? "Pagado" : "Pendiente"}
                    </span>
                    {expandedId === n.id ? <ChevronDown className="size-4 text-gray-400" /> : <ChevronRight className="size-4 text-gray-400" />}
                  </div>
                </button>

                {expandedId === n.id && n.nomina_detalle && (
                  <div className="border-t border-gray-100 overflow-x-auto">
                    <table className="w-full text-xs" style={{ minWidth: "1400px" }}>
                      <thead className="bg-gray-50">
                        <tr>
                          {COLS.map(c => (
                            <th key={c.key} className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">{c.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {n.nomina_detalle.map((d: any, i: number) => (
                          <tr key={d.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                            <td className="px-3 py-2">{d.fecha_pago}</td>
                            <td className="px-3 py-2 font-medium">{d.nombre_trabajador}</td>
                            <td className="px-3 py-2 text-gray-600">{d.centro_costo}</td>
                            <td className="px-3 py-2 text-gray-600">{d.actividad}</td>
                            <td className="px-3 py-2 text-gray-600">{d.porcentaje_avance}</td>
                            <td className="px-3 py-2 text-gray-600">{d.valor_total_actividad ? formatCOP(d.valor_total_actividad) : "-"}</td>
                            <td className="px-3 py-2 font-semibold text-green-700">{formatCOP(d.valor_pagado)}</td>
                            <td className="px-3 py-2 text-gray-600">{d.forma_pago}</td>
                            <td className="px-3 py-2 text-gray-500">{d.numero_cuenta}</td>
                            <td className="px-3 py-2 text-gray-600">{d.titular_cuenta}</td>
                            <td className="px-3 py-2 text-gray-500">{d.cc_titular}</td>
                            <td className="px-3 py-2 text-gray-500">{d.observaciones}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-100">
                        <tr>
                          <td colSpan={6} className="px-3 py-2 font-semibold text-gray-700">Total</td>
                          <td className="px-3 py-2 font-bold text-green-700">{formatCOP(n.total_pagar)}</td>
                          <td colSpan={5}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
