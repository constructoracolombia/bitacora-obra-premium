'use client';

import { AlertTriangle, Download } from 'lucide-react';
import type { ResultadoPlanimetro } from './types';

interface Props {
  data: ResultadoPlanimetro;
}

const COLORES_AMBIENTE = [
  '#007AFF', '#34C759', '#FF9500', '#FF2D55', '#AF52DE',
  '#5AC8FA', '#FFCC00', '#FF6B35', '#4CD964', '#007AFF',
];

function fmt(n: number) {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ResultadosAreas({ data }: Props) {
  const handleExport = () => {
    const lines = [
      'Ambiente,Largo (m),Ancho (m),Área Piso (m²),Perímetro (m),Área Muros (m²)',
      ...data.ambientes.map((a) =>
        `"${a.nombre}",${a.largo},${a.ancho},${a.area_piso},${a.perimetro},${a.area_muros}`
      ),
      '',
      `Total,,,${fmt(data.resumen.area_total_piso)},,${fmt(data.resumen.area_total_muros)}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'planimetria.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Resumen KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{fmt(data.resumen.area_total_piso)}</p>
          <p className="mt-1 text-xs font-medium text-blue-500">m² área piso total</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{fmt(data.resumen.area_total_muros)}</p>
          <p className="mt-1 text-xs font-medium text-green-500">m² área muros total</p>
        </div>
        <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-center">
          <p className="text-2xl font-bold text-orange-700">
            {data.resumen.perimetro_exterior ? fmt(data.resumen.perimetro_exterior) : '—'}
          </p>
          <p className="mt-1 text-xs font-medium text-orange-500">m perímetro exterior</p>
        </div>
      </div>

      {/* Info adicional */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {data.escala && (
          <span className="rounded-full bg-gray-100 px-3 py-1">Escala {data.escala}</span>
        )}
        <span className="rounded-full bg-gray-100 px-3 py-1">
          Altura piso-piso: {data.altura_piso_a_piso} m
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1">
          {data.ambientes.length} ambientes detectados
        </span>
      </div>

      {/* Tabla de ambientes */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="flex items-center justify-between bg-gray-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-700">Desglose por ambiente</h3>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-white text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Ambiente</th>
                <th className="px-4 py-3 font-medium text-right">Largo</th>
                <th className="px-4 py-3 font-medium text-right">Ancho</th>
                <th className="px-4 py-3 font-medium text-right">Área Piso</th>
                <th className="px-4 py-3 font-medium text-right">Perímetro</th>
                <th className="px-4 py-3 font-medium text-right">Área Muros</th>
              </tr>
            </thead>
            <tbody>
              {data.ambientes.map((a, i) => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: COLORES_AMBIENTE[i % COLORES_AMBIENTE.length] }}
                      />
                      <span className="font-medium text-gray-800">{a.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(a.largo)} m</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(a.ancho)} m</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(a.area_piso)} m²</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(a.perimetro)} m</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(a.area_muros)} m²</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold text-gray-800">
                <td className="px-4 py-3 text-xs uppercase tracking-wide text-gray-500">Total</td>
                <td />
                <td />
                <td className="px-4 py-3 text-right text-[#007AFF]">{fmt(data.resumen.area_total_piso)} m²</td>
                <td />
                <td className="px-4 py-3 text-right text-[#007AFF]">{fmt(data.resumen.area_total_muros)} m²</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Advertencias */}
      {data.advertencias && data.advertencias.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700">Notas de la IA</p>
              {data.advertencias.map((adv, i) => (
                <p key={i} className="text-xs text-amber-600">{adv}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
