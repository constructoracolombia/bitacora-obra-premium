'use client';

import { useState } from 'react';
import type { ResultadoPlanimetro } from './types';

// Color de piso según tipo de ambiente (detectado por nombre)
function colorPiso(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes('baño') || n.includes('wc') || n.includes('toilet'))  return '#DDE8E4';
  if (n.includes('cocina'))                                              return '#EAE0CC';
  if (n.includes('sala') || n.includes('living') || n.includes('estar')) return '#C8A870';
  if (n.includes('dormitorio') || n.includes('habitacion') || n.includes('cuarto') || n.includes('alcoba')) return '#D4B48A';
  if (n.includes('lavand') || n.includes('ropas'))                       return '#D4DCE0';
  if (n.includes('pasillo') || n.includes('circulac') || n.includes('corredor')) return '#D0CCC6';
  if (n.includes('balcon') || n.includes('terraza') || n.includes('patio')) return '#C8CCB8';
  if (n.includes('comedor'))                                             return '#CCBA96';
  return '#D8CCBC';
}

// Colores de marcador para la leyenda
const MARCADORES = [
  '#4A9EFF','#34C759','#FF9500','#FF6B6B','#AF52DE',
  '#5AC8FA','#FFCC00','#FF6B35','#4CD964','#0055D4',
];

const MURO_LUZ   = '#F8F4EF';  // cara norte (derecha en iso)
const MURO_SOMBRA = '#EAE3DA'; // cara oeste (izquierda en iso)
const MURO_STROKE = 'rgba(180,165,150,0.55)';

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

  // Escala adaptativa
  const maxWX = Math.max(...data.ambientes.map((a) => a.x + a.largo));
  const maxWY = Math.max(...data.ambientes.map((a) => a.y + a.ancho));
  const planDim = Math.max(maxWX, maxWY, 1);
  const S  = Math.min(42, Math.max(16, 300 / planDim));
  const SZ = S * 0.65;

  const isoRaw = (wx: number, wy: number, wz = 0) => ({
    x: (wx - wy) * S,
    y: (wx + wy) * S * 0.5 - wz * SZ,
  });

  // Bounding box de toda la escena
  const allPts: { x: number; y: number }[] = [];
  data.ambientes.forEach((a) => {
    ([
      [a.x, a.y, 0], [a.x+a.largo, a.y, 0], [a.x+a.largo, a.y+a.ancho, 0], [a.x, a.y+a.ancho, 0],
      [a.x, a.y, WALL_H], [a.x+a.largo, a.y, WALL_H], [a.x+a.largo, a.y+a.ancho, WALL_H], [a.x, a.y+a.ancho, WALL_H],
    ] as [number,number,number][]).forEach(([wx,wy,wz]) => allPts.push(isoRaw(wx,wy,wz)));
  });

  const PAD = 52;
  const minX = Math.min(...allPts.map(p => p.x));
  const maxX = Math.max(...allPts.map(p => p.x));
  const minY = Math.min(...allPts.map(p => p.y));
  const maxY = Math.max(...allPts.map(p => p.y));
  const SVG_W = maxX - minX + PAD * 2;
  const SVG_H = maxY - minY + PAD * 2;
  const ox = -minX + PAD;
  const oy = -minY + PAD;

  const iso = (wx: number, wy: number, wz = 0) => {
    const p = isoRaw(wx, wy, wz);
    return { x: p.x + ox, y: p.y + oy };
  };
  const pts = (...v: {x:number;y:number}[]) =>
    v.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Pintor: menor x+y = fondo, mayor = frente
  const sorted = [...data.ambientes].sort((a, b) => (a.x + a.y) - (b.x + b.y));

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-gray-300 bg-[#8C9BAE]">
        <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ display: 'block' }}>
          <defs>
            {/* Sombra suave para texto */}
            <filter id="tshadow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="0.5" stdDeviation="0.7" floodColor="rgba(0,0,0,0.35)" />
            </filter>
            {/* Patrón de piso madera */}
            <pattern id="madera" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
              <rect width="8" height="8" fill="transparent"/>
              <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(0,0,0,0.06)" strokeWidth="1"/>
            </pattern>
          </defs>

          {/* ── 1. Sombras de base ────────────────────────────── */}
          {sorted.map((a) => {
            const A = iso(a.x,        a.y,        0);
            const B = iso(a.x+a.largo, a.y,        0);
            const C = iso(a.x+a.largo, a.y+a.ancho, 0);
            const D = iso(a.x,        a.y+a.ancho, 0);
            return (
              <polygon key={`sh-${a.id}`} points={pts(A,B,C,D)}
                fill="rgba(0,0,0,0.18)" transform="translate(6,10)" />
            );
          })}

          {/* ── 2. Por cada ambiente: piso + muro Norte + muro Oeste ── */}
          {sorted.map((a) => {
            const isSel = seleccionado === a.id;
            const cpiso = colorPiso(a.nombre);
            const sw    = isSel ? 1.8 : 0.7;

            const x = a.x, y = a.y, w = a.largo, h = a.ancho;

            // --- Piso (cara bottom, z=0) ---
            const P0 = iso(x,   y,   0);
            const P1 = iso(x+w, y,   0);
            const P2 = iso(x+w, y+h, 0);
            const P3 = iso(x,   y+h, 0);

            // Centro del piso para etiquetas
            const cx = (P0.x+P1.x+P2.x+P3.x)/4;
            const cy = (P0.y+P1.y+P2.y+P3.y)/4;
            const faceW = Math.abs(P1.x - P0.x);
            const fs = Math.max(7, Math.min(12, faceW / 4.5));

            // --- Muro Norte (cara y = a.y, visible por derecha) ---
            const N0 = iso(x,   y, 0);
            const N1 = iso(x+w, y, 0);
            const N2 = iso(x+w, y, WALL_H);
            const N3 = iso(x,   y, WALL_H);

            // --- Muro Oeste (cara x = a.x, visible por izquierda) ---
            const W0 = iso(x, y,   0);
            const W1 = iso(x, y+h, 0);
            const W2 = iso(x, y+h, WALL_H);
            const W3 = iso(x, y,   WALL_H);

            return (
              <g key={a.id} onClick={() => setSeleccionado(isSel ? null : a.id)} style={{ cursor: 'pointer' }}>
                {/* Piso */}
                <polygon points={pts(P0,P1,P2,P3)}
                  fill={cpiso} stroke={MURO_STROKE} strokeWidth={sw}
                />
                {/* Textura piso */}
                <polygon points={pts(P0,P1,P2,P3)}
                  fill="url(#madera)" opacity="0.4"
                />
                {/* Selección overlay */}
                {isSel && (
                  <polygon points={pts(P0,P1,P2,P3)}
                    fill="rgba(255,255,255,0.28)"
                    stroke="#888" strokeWidth="2" strokeDasharray="4,2"
                  />
                )}

                {/* Muro Norte */}
                <polygon points={pts(N0,N1,N2,N3)}
                  fill={MURO_LUZ} stroke={MURO_STROKE} strokeWidth={sw}
                />
                {/* Muro Oeste */}
                <polygon points={pts(W0,W1,W2,W3)}
                  fill={MURO_SOMBRA} stroke={MURO_STROKE} strokeWidth={sw}
                />

                {/* Nombre ambiente */}
                <text x={cx} y={cy - fs*0.35}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={fs} fontWeight="700"
                  fill="#2C1E10"
                  style={{ userSelect: 'none' }}
                  filter="url(#tshadow)"
                >
                  {a.nombre.length > 14 ? a.nombre.slice(0,13)+'…' : a.nombre}
                </text>
                {/* Área */}
                {faceW > 38 && (
                  <text x={cx} y={cy + fs*0.95}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={fs * 0.8} fill="#3D2A14" opacity="0.85"
                    style={{ userSelect: 'none' }}
                  >
                    {fmt(a.area_piso)} m²
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Badge */}
        <div className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-[11px] text-gray-500 shadow-sm">
          Click en un ambiente para ver detalle
        </div>

        {/* Panel detalle */}
        {ambienteSelec && (
          <div className="absolute right-3 top-3 rounded-xl bg-white/97 p-4 shadow-lg min-w-[178px] border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: MARCADORES[data.ambientes.indexOf(ambienteSelec) % MARCADORES.length] }}
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
          <button key={a.id}
            onClick={() => setSeleccionado(seleccionado === a.id ? null : a.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all ${
              seleccionado === a.id
                ? 'bg-gray-800 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: MARCADORES[i % MARCADORES.length] }} />
            {a.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
