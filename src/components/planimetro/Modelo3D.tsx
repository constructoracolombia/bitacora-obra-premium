'use client';

import { useState } from 'react';
import type { ResultadoPlanimetro } from './types';

const COLORES = [
  '#4A9EFF', '#34C759', '#FF9500', '#FF6B6B', '#AF52DE',
  '#5AC8FA', '#FFCC00', '#FF6B35', '#4CD964', '#0055D4',
];

const PADDING = 40; // px padding interno del SVG

interface Props {
  data: ResultadoPlanimetro;
}

function fmt(n: number) {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Modelo3D({ data }: Props) {
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  if (!data.ambientes.length) return null;

  const ambienteSelec = data.ambientes.find((a) => a.id === seleccionado) ?? null;

  // ── Calcular escala para que el plano quepa en el SVG ──────────────────
  const maxX = Math.max(...data.ambientes.map((a) => a.x + a.largo));
  const maxY = Math.max(...data.ambientes.map((a) => a.y + a.ancho));

  const SVG_W = 680;
  const SVG_H = Math.min(520, Math.max(300, (maxY / maxX) * SVG_W));
  const scaleX = (SVG_W - PADDING * 2) / maxX;
  const scaleY = (SVG_H - PADDING * 2) / maxY;
  const scale  = Math.min(scaleX, scaleY);

  // Convertir metros → px (SVG: Y invertido → ambientes crecen hacia abajo)
  const px = (xM: number) => PADDING + xM * scale;
  const py = (yM: number) => SVG_H - PADDING - (yM + 0) * scale; // flip Y
  const pw = (m: number)  => Math.max(m * scale, 1);

  return (
    <div className="space-y-4">
      {/* Plano 2D SVG */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-[#F7F8FA]">
        <svg
          width="100%"
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ display: 'block' }}
        >
          {/* Fondo cuadriculado */}
          <defs>
            <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse"
              x={PADDING} y={SVG_H - PADDING}>
              <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#E5E7EB" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={SVG_W} height={SVG_H} fill="url(#grid)" />

          {/* Ambientes */}
          {data.ambientes.map((a, i) => {
            const x  = px(a.x);
            const y  = py(a.y + a.ancho); // flip: top-left en SVG
            const w  = pw(a.largo);
            const h  = pw(a.ancho);
            const cx = x + w / 2;
            const cy = y + h / 2;
            const color = COLORES[i % COLORES.length];
            const isSelected = seleccionado === a.id;
            const fontSize = Math.max(9, Math.min(13, Math.min(w, h) / 4));

            return (
              <g
                key={a.id}
                onClick={() => setSeleccionado(isSelected ? null : a.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Sombra selección */}
                {isSelected && (
                  <rect
                    x={x - 3} y={y - 3} width={w + 6} height={h + 6}
                    rx="4" fill="none"
                    stroke={color} strokeWidth="2.5" strokeDasharray="5,3" opacity="0.7"
                  />
                )}
                {/* Relleno */}
                <rect
                  x={x} y={y} width={w} height={h}
                  rx="2"
                  fill={color}
                  fillOpacity={isSelected ? 0.35 : 0.18}
                  stroke={color}
                  strokeWidth={isSelected ? 2 : 1.5}
                />
                {/* Nombre */}
                {w > 40 && h > 24 && (
                  <text
                    x={cx} y={cy - (fontSize * 0.6)}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={fontSize} fontWeight="600" fill={color}
                    style={{ userSelect: 'none' }}
                  >
                    {a.nombre.length > 14 ? a.nombre.slice(0, 13) + '…' : a.nombre}
                  </text>
                )}
                {/* Área */}
                {w > 40 && h > 38 && (
                  <text
                    x={cx} y={cy + (fontSize * 0.8)}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={fontSize * 0.85} fill={color} opacity="0.8"
                    style={{ userSelect: 'none' }}
                  >
                    {fmt(a.area_piso)} m²
                  </text>
                )}
                {/* Cotas dimensión */}
                {isSelected && w > 60 && (
                  <>
                    {/* Cota ancho (horizontal inferior) */}
                    <line x1={x} y1={y+h+10} x2={x+w} y2={y+h+10} stroke={color} strokeWidth="1" />
                    <line x1={x} y1={y+h+6} x2={x} y2={y+h+14} stroke={color} strokeWidth="1" />
                    <line x1={x+w} y1={y+h+6} x2={x+w} y2={y+h+14} stroke={color} strokeWidth="1" />
                    <text x={cx} y={y+h+22} textAnchor="middle" fontSize="9" fill={color} fontWeight="500">
                      {fmt(a.largo)} m
                    </text>
                    {/* Cota alto (vertical derecha) */}
                    <line x1={x+w+10} y1={y} x2={x+w+10} y2={y+h} stroke={color} strokeWidth="1" />
                    <line x1={x+w+6} y1={y} x2={x+w+14} y2={y} stroke={color} strokeWidth="1" />
                    <line x1={x+w+6} y1={y+h} x2={x+w+14} y2={y+h} stroke={color} strokeWidth="1" />
                    <text
                      x={x+w+22} y={cy}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize="9" fill={color} fontWeight="500"
                      transform={`rotate(-90, ${x+w+22}, ${cy})`}
                    >
                      {fmt(a.ancho)} m
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Escala gráfica */}
          {scale > 5 && (
            <g transform={`translate(${PADDING}, ${SVG_H - 12})`}>
              <line x1="0" y1="0" x2={scale * 5} y2="0" stroke="#9CA3AF" strokeWidth="2" />
              <line x1="0" y1="-4" x2="0" y2="4" stroke="#9CA3AF" strokeWidth="1.5" />
              <line x1={scale * 5} y1="-4" x2={scale * 5} y2="4" stroke="#9CA3AF" strokeWidth="1.5" />
              <text x={scale * 2.5} y="-6" textAnchor="middle" fontSize="9" fill="#6B7280">5 m</text>
            </g>
          )}
        </svg>

        {/* Badge instrucción */}
        <div className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-[11px] text-gray-500 shadow-sm">
          Click en un ambiente para ver cotas
        </div>

        {/* Panel detalle */}
        {ambienteSelec && (
          <div className="absolute right-3 top-3 rounded-xl bg-white/97 p-4 shadow-lg min-w-[175px] border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: COLORES[data.ambientes.indexOf(ambienteSelec) % COLORES.length] }}
              />
              <p className="font-semibold text-gray-800 text-sm leading-tight">{ambienteSelec.nombre}</p>
            </div>
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between gap-4">
                <span>Largo</span>
                <span className="font-medium text-gray-800">{fmt(ambienteSelec.largo)} m</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Ancho</span>
                <span className="font-medium text-gray-800">{fmt(ambienteSelec.ancho)} m</span>
              </div>
              <div className="border-t border-gray-100 pt-1.5 space-y-1">
                <div className="flex justify-between gap-4">
                  <span>Área piso</span>
                  <span className="font-bold text-[#007AFF]">{fmt(ambienteSelec.area_piso)} m²</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Área muros</span>
                  <span className="font-bold text-green-600">{fmt(ambienteSelec.area_muros)} m²</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-2">
        {data.ambientes.map((a, i) => (
          <button
            key={a.id}
            onClick={() => setSeleccionado(seleccionado === a.id ? null : a.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all ${
              seleccionado === a.id
                ? 'bg-gray-800 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: COLORES[i % COLORES.length] }} />
            {a.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
