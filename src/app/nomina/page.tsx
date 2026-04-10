"use client";

import { useEffect, useState, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, FileSpreadsheet, CheckCircle2, Clock, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

interface NominaDetalle {
  fecha_pago: string;
  nombre_trabajador: string;
  centro_costo: string;
  actividad: string;
  porcentaje_avance: string;
  valor_pagado: number;
  forma_pago: string;
  cuenta: string;
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
  nomina_detalle?: NominaDetalle[];
}

const formatCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

export default function NominaPage() {
  const [nominas, setNominas] = useState<NominaSemanal[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<NominaDetalle[] | null>(null);
  const [previewLabel, setPreviewLabel] = useState("");
  const [previewTotal, setPreviewTotal] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const db = getSupabaseClient();

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    const { data } = await db
      .from("nomina_semanal")
      .select("*, nomina_detalle(*)")
      .order("created_at", { ascending: false });
    setNominas(data || []);
    setLoading(false);
  }

  function parseExcel(file: File): Promise<NominaDetalle[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

          // Buscar fila de encabezados
          let headerRow = -1;
          for (let i = 0; i < rows.length; i++) {
            const r = rows[i].map((c: any) => String(c).toLowerCase());
            if (r.some(c => c.includes("nombre") || c.includes("trabajador"))) {
              headerRow = i;
              break;
            }
          }
          if (headerRow === -1) headerRow = 0;

          const headers = rows[headerRow].map((c: any) => String(c).toLowerCase().trim());
          const detalles: NominaDetalle[] = [];

          for (let i = headerRow + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.every((c: any) => !c)) continue;

            const get = (terms: string[]) => {
              const idx = headers.findIndex(h => terms.some(t => h.includes(t)));
              return idx >= 0 ? String(row[idx] || "").trim() : "";
            };

            const valorRaw = get(["valor", "pago", "pagado"]);
            const valor = parseFloat(String(valorRaw).replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;
            const nombre = get(["nombre", "trabajador"]);
            if (!nombre || valor === 0) continue;

            detalles.push({
              fecha_pago: get(["fecha"]),
              nombre_trabajador: nombre,
              centro_costo: get(["centro", "costo", "proyecto"]),
              actividad: get(["actividad"]),
              porcentaje_avance: get(["avance", "%"]),
              valor_pagado: valor,
              forma_pago: get(["forma", "pago"]),
              cuenta: get(["cuenta"]),
            });
          }
          resolve(detalles);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const detalles = await parseExcel(file);
      if (detalles.length === 0) {
        alert("No se encontraron datos en el archivo. Verifica que tenga las columnas: Nombre Trabajador, Valor Pagado.");
        return;
      }
      const total = detalles.reduce((s, d) => s + d.valor_pagado, 0);
      const hoy = new Date();
      const label = `Semana ${getWeekOfMonth(hoy)} - ${hoy.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}`;
      setPreview(detalles);
      setPreviewLabel(label);
      setPreviewTotal(total);
    } catch {
      alert("Error leyendo el archivo Excel. Verifica el formato.");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function getWeekOfMonth(d: Date) {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    return Math.ceil((d.getDate() + start.getDay()) / 7);
  }

  async function guardarNomina() {
    if (!preview) return;
    setUploading(true);
    try {
      const hoy = new Date();
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1);
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 6);

      const trabajadoresUnicos = new Set(preview.map(d => d.nombre_trabajador)).size;

      const { data: nomina, error } = await db
        .from("nomina_semanal")
        .insert({
          semana_label: previewLabel,
          fecha_inicio: inicioSemana.toISOString().split("T")[0],
          fecha_fin: finSemana.toISOString().split("T")[0],
          total_pagar: previewTotal,
          num_trabajadores: trabajadoresUnicos,
          estado: "pendiente",
        })
        .select()
        .single();

      if (error) throw error;

      const detalleRows = preview.map(d => ({ ...d, nomina_id: nomina.id }));
      await db.from("nomina_detalle").insert(detalleRows);

      setPreview(null);
      await cargar();
      alert(`✅ Nómina "${previewLabel}" subida correctamente. ${preview.length} registros guardados.`);
    } catch (err: any) {
      alert("Error guardando nómina: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Nómina Semanal</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sube el Excel de nómina cada semana</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
          <Button onClick={() => fileRef.current?.click()} className="gap-2">
            <Upload className="size-4" />
            Subir Excel
          </Button>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="border border-blue-200 rounded-xl bg-blue-50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-900">{previewLabel}</p>
              <p className="text-sm text-blue-700">{preview.length} registros · {formatCOP(previewTotal)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreview(null)}>Cancelar</Button>
              <Button onClick={guardarNomina} disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
                {uploading ? <><Loader2 className="size-4 animate-spin mr-2" />Guardando...</> : "✓ Confirmar y Guardar"}
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-blue-200">
            <table className="w-full text-xs">
              <thead className="bg-blue-100">
                <tr>
                  {["Trabajador", "Proyecto", "Actividad", "% Avance", "Valor", "Forma Pago"].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-medium text-blue-800">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((d, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/50"}>
                    <td className="px-3 py-2 font-medium">{d.nombre_trabajador}</td>
                    <td className="px-3 py-2 text-gray-600">{d.centro_costo}</td>
                    <td className="px-3 py-2 text-gray-600">{d.actividad}</td>
                    <td className="px-3 py-2 text-gray-600">{d.porcentaje_avance}</td>
                    <td className="px-3 py-2 font-semibold text-green-700">{formatCOP(d.valor_pagado)}</td>
                    <td className="px-3 py-2 text-gray-600">{d.forma_pago}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lista de nóminas */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-gray-400" /></div>
      ) : nominas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileSpreadsheet className="size-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay nóminas subidas aún</p>
        </div>
      ) : (
        <div className="space-y-3">
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
                <div className="flex items-center gap-4">
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
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Trabajador", "Proyecto", "Actividad", "% Avance", "Valor", "Forma Pago", "Cuenta"].map(h => (
                          <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {n.nomina_detalle.map((d, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="px-3 py-2 font-medium">{d.nombre_trabajador}</td>
                          <td className="px-3 py-2 text-gray-600">{d.centro_costo}</td>
                          <td className="px-3 py-2 text-gray-600">{d.actividad}</td>
                          <td className="px-3 py-2 text-gray-600">{d.porcentaje_avance}</td>
                          <td className="px-3 py-2 font-semibold text-green-700">{formatCOP(d.valor_pagado)}</td>
                          <td className="px-3 py-2 text-gray-600">{d.forma_pago}</td>
                          <td className="px-3 py-2 text-gray-500">{d.cuenta}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td colSpan={4} className="px-3 py-2 font-semibold text-gray-700">Total</td>
                        <td className="px-3 py-2 font-bold text-green-700">{formatCOP(n.total_pagar)}</td>
                        <td colSpan={2}></td>
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
  );
}
