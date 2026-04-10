'use client';

import { useState } from 'react';
import type { ResultadoPlanimetro } from './types';

// Paleta: top (techo), east (muro derecho), south (muro izquierdo)
const PALETA = [
  { top: '#7BC4FF', east: '#3A8FE8', south: '#1C6EC4' },
  { top: '#6EE68A', east: '#28B84A', south: '#109030' },
  { top: '#FFB85C', east: '#E08800', south: '#C06800' },
  { top: '#FF9090', east: '#E04848', south: '#C02828' },
  { top: '#CE8EF0', east: '#A040D0', south: '#7C18B0' },
  { top: '#8CE0FA', east: '#38AAD4', south: '#1888B8' },
  { top: '#FFE066', east: '#D4A800', south: '#B08600' },
  { top: '#FFA080', east: '#D85020', south: '#B83000' },
  { top: '#78EE90', east: '#24C040', south: '#089E28' },
  { top: '#7AAAFF', east: '#2860E0', south: '#0840C0' },
];

function fmt(n: number) {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  data: ResultadoPlanimetro;
}

export function Modelo3D({ data }: Props) {
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  if (!data.ambientes.length) return null;

  const ambienteSelec = data.ambientes.find((a) => a.id === seleccionado) ?? null;
  const WALL_H = data.altura_piso_a_piso || 2.6;

  // Escala adaptativa según tamaño del plano
  const maxWX = Math.max(...data.ambientes.map((a) => a.x + a.largo));
  const maxWY = Math.max(...data.ambientes.map((a) => a.y + a.ancho));
  const planDim = Math.max(maxWX, maxWY);
  const S = Math.min(38, Math.max(16, 280 / planDim));   // px por metro en plano
  const SZ = S * 0.65;                                   // px por metro de altura

  // Proyección isométrica: x→derecha-abajo, y→izquierda-abajo, z→arriba
  const isoRaw = (wx: number, wy: number, wz = 0) => ({
    x: (wx - wy) * S,
    y: (wx + wy) * S * 0.5 - wz * SZ,
  });

  // Bounding box para centrar el SVG
  const allPts: { x: number; y: number }[] = [];
  data.ambientes.forEach((a) => {
    const corners: [number, number, number][] = [
      [a.x,          a.y,          0],
      [a.x + a.largo, a.y,         0],
      [a.x + a.largo, a.y + a.ancho, 0],
      [a.x,          a.y + a.ancho, 0],
      [a.x,          a.y,          WALL_H],
      [a.x + a.largo, a.y,         WALL_H],
      [a.x + a.largo, a.y + a.ancho, WALL_H],
      [a.x,          a.y + a.ancho, WALL_H],
    ];
    corners.forEach(([wx, wy, wz]) => allPts.push(isoRaw(wx, wy, wz)));
  });

  const PAD = 48;
  const minX = Math.min(...allPts.map((p) => p.x));
  const maxX = Math.max(...allPts.map((p) => p.x));
  const minY = Math.min(...allPts.map((p) => p.y));
  const maxY = Math.max(...allPts.map((p) => p.y));
  const SVG_W = maxX - minX + PAD * 2;
  const SVG_H = maxY - minY + PAD * 2;
  const ox = -minX + PAD;
  const oy = -minY + PAD;

  const iso = (wx: number, wy: number, wz = 0) => {
    const p = isoRaw(wx, wy, wz);
    return { x: p.x + ox, y: p.y + oy };
  };

  const pts = (...verts: { x: number; y: number }[]) =>
    verts.map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' ');

  // Painter's algorithm: menor x+y = fondo, mayor x+y = frente
  const sorted = [...data.ambientes].sort((a, b) => (a.x + a.y) - (b.x + b.y));

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b from-[#DEE8F5] via-[#D0DCEE] to-[#C4D0E6]">
        <svg
          width="100%"
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ display: 'block' }}
        >
          {/* Sombra de base */}
          {sorted.map((a) => {
            const x = a.x, y = a.y, w = a.largo, h = a.ancho;
            const A = iso(x,     y,     0);
            const B = iso(x + w, y,     0);
            const C = iso(x + w, y + h, 0);
            const D = iso(x,     y + h, 0);
            return (
              <polygon
                key={`shadow-${a.id}`}
                points={pts(A, B, C, D)}
                fill="rgba(0,0,0,0.10)"
                transform="translate(4,6)"
              />
            );
          })}

          {/* Cajas isométricas */}
          {sorted.map((a) => {
            const idx = data.ambientes.indexOf(a);
            const pal = PALETA[idx % PALETA.length];
            const isSel = seleccionado === a.id;

            const x = a.x, y = a.y, w = a.largo, h = a.ancho;

            // 8 vértices
            const A  = iso(x,     y,     WALL_H);  // frente-izq-top
            const B  = iso(x + w, y,     WALL_H);  // frente-der-top
            const C  = iso(x + w, y + h, WALL_H);  // fondo-der-top
            const D  = iso(x,     y + h, WALL_H);  // fondo-izq-top
            const Fb = iso(x + w, y,     0);        // frente-der-bot
            const Gb = iso(x + w, y + h, 0);        // fondo-der-bot
            const Hb = iso(x,     y + h, 0);        // fondo-izq-bot

            // Centro del techo para etiquetas
            const cx = (A.x + B.x + C.x + D.x) / 4;
            const cy = (A.y + B.y + C.y + D.y) / 4;

            // Tamaño de fuente adaptativo basado en el ancho proyectado del techo
            const faceW = Math.abs(B.x - A.x);
            const fs = Math.max(7, Math.min(12, faceW / 4.5));

            const sw = isSel ? 2 : 0.7;

            return (
              <g
                key={a.id}
                onClick={() => setSeleccionado(isSel ? null : a.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Muro Este (cara x+w) — derecha */}
                <polygon
                  points={pts(B, C, Gb, Fb)}
                  fill={pal.east}
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth={sw}
                />
                {/* Muro Sur (cara y+h) — izquierda */}
                <polygon
                  points={pts(D, C, Gb, Hb)}
                  fill={pal.south}
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth={sw}
                />
                {/* Techo (cara superior) */}
                <polygon
                  points={pts(A, B, C, D)}
                  fill={pal.top}
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth={isSel ? 2.5 : 1.2}
                />
                {/* Brillo de selección */}
                {isSel && (
                  <polygon
                    points={pts(A, B, C, D)}
                    fill="rgba(255,255,255,0.22)"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                )}
                {/* Etiqueta nombre */}
                <text
                  x={cx} y={cy - fs * 0.5}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={fs} fontWeight="700" fill="white"
                  style={{ userSelect: 'none' }}
                  filter="url(#ts)"
                >
                  {a.nombre.length > 13 ? a.nombre.slice(0, 12) + '…' : a.nombre}
                </text>
                {/* Etiqueta área */}
                <text
                  x={cx} y={cy + fs * 0.9}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={fs * 0.82} fill="rgba(255,255,255,0.92)"
                  style={{ userSelect: 'none' }}
                  filter="url(#ts)"
                >
                  {fmt(a.area_piso)} m²
                </text>
              </g>
            );
          })}

          {/* Filtro sombra texto */}
          <defs>
            <filter id="ts" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.55)" />
            </filter>
          </defs>
        </svg>

        {/* Badge */}
        <div className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-[11px] text-gray-500 shadow-sm">
          Click en un ambiente para ver detalle
        </div>

        {/* Panel detalle ambiente seleccionado */}
        {ambienteSelec && (
          <div className="absolute right-3 top-3 rounded-xl bg-white/97 p-4 shadow-lg min-w-[178px] border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: PALETA[data.ambientes.indexOf(ambienteSelec) % PALETA.length].top }}
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
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: PALETA[i % PALETA.length].top }}
            />
            {a.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
