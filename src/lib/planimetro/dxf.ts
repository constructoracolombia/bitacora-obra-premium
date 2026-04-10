/**
 * Parser DXF minimalista para extracción de planimetría.
 * Maneja ASCII DXF (el formato estándar de exportación de AutoCAD).
 * Entidades soportadas: LWPOLYLINE, POLYLINE, LINE, TEXT, MTEXT
 */

export interface Vertice { x: number; y: number }

export interface EntidadDxf {
  tipo: string;
  capa: string;
  vertices: Vertice[];   // LWPOLYLINE / POLYLINE
  cerrada: boolean;
  texto: string;         // TEXT / MTEXT
  posicion: Vertice;     // TEXT / MTEXT / LINE inicio
  posicionFin: Vertice;  // LINE fin
}

export interface ResultadoDxf {
  entidades: EntidadDxf[];
  insunits: number; // 0=sin definir, 4=mm, 5=cm, 6=m
  version: string;
}

// ─── Utilidades geométricas ────────────────────────────────────────────────

/** Área con fórmula de Gauss (Shoelace). Resultado en unidades del plano. */
export function areaPoligono(vertices: Vertice[]): number {
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

/** Perímetro de un polígono. */
export function perimetroPoligono(vertices: Vertice[]): number {
  let p = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = vertices[j].x - vertices[i].x;
    const dy = vertices[j].y - vertices[i].y;
    p += Math.sqrt(dx * dx + dy * dy);
  }
  return p;
}

/** Bounding box de un polígono. */
export function boundingBox(vertices: Vertice[]) {
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, ancho: maxX - minX, alto: maxY - minY };
}

/** Punto dentro de polígono (ray casting). */
export function puntoEnPoligono(p: Vertice, poly: Vertice[]): boolean {
  let dentro = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) {
      dentro = !dentro;
    }
  }
  return dentro;
}

/** Centroide de un polígono. */
export function centroide(vertices: Vertice[]): Vertice {
  const x = vertices.reduce((s, v) => s + v.x, 0) / vertices.length;
  const y = vertices.reduce((s, v) => s + v.y, 0) / vertices.length;
  return { x, y };
}

// ─── Factor de conversión a metros ────────────────────────────────────────

export function factorAMetros(insunits: number, muestraCoord: number): number {
  // INSUNITS explícito
  if (insunits === 6) return 1;           // metros
  if (insunits === 5) return 0.01;        // centímetros
  if (insunits === 4) return 0.001;       // milímetros
  if (insunits === 1) return 0.0254;      // pulgadas
  if (insunits === 2) return 0.3048;      // pies

  // Heurística por magnitud de coordenadas
  if (muestraCoord > 10000) return 0.001; // probablemente mm
  if (muestraCoord > 100)   return 0.01;  // probablemente cm
  return 1;                               // metros
}

// ─── Parser DXF ───────────────────────────────────────────────────────────

/**
 * Parsea el contenido ASCII de un archivo DXF.
 * Extrae entidades LWPOLYLINE, POLYLINE, LINE, TEXT y MTEXT.
 */
export function parsearDxf(contenido: string): ResultadoDxf {
  // Normalizar saltos de línea y dividir en pares código/valor
  const lineas = contenido.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  let insunits = 0;
  let version = '';
  const entidades: EntidadDxf[] = [];

  let i = 0;

  function peek(offset = 0) {
    return lineas[i + offset]?.trim() ?? '';
  }

  function next(): [string, string] {
    const code = lineas[i++]?.trim() ?? '';
    const value = lineas[i++]?.trim() ?? '';
    return [code, value];
  }

  // Leer header para INSUNITS y VERSION
  while (i < lineas.length) {
    const [code, value] = next();
    if (code === '9' && value === '$INSUNITS') {
      const [, v] = next();
      insunits = parseInt(v) || 0;
    }
    if (code === '9' && value === '$ACADVER') {
      const [, v] = next();
      version = v;
    }
    // Entrar a la sección ENTITIES
    if (code === '2' && value === 'ENTITIES') break;
    if (i > lineas.length) break;
  }

  // Parsear entidades
  while (i < lineas.length) {
    const [code, value] = next();

    if (code === '0' && value === 'ENDSEC') break;
    if (code === '0' && value === 'EOF') break;

    if (code === '0' && (value === 'LWPOLYLINE' || value === 'POLYLINE')) {
      const ent = parsearLwpolyline(value);
      if (ent.vertices.length >= 3) entidades.push(ent);
      continue;
    }

    if (code === '0' && value === 'LINE') {
      const ent = parsearLine();
      entidades.push(ent);
      continue;
    }

    if (code === '0' && (value === 'TEXT' || value === 'MTEXT')) {
      const ent = parsearText(value);
      if (ent.texto.trim()) entidades.push(ent);
      continue;
    }
  }

  return { entidades, insunits, version };

  // ── Sub-parsers ─────────────────────────────────────────────────────

  function parsearLwpolyline(tipo: string): EntidadDxf {
    const ent: EntidadDxf = {
      tipo,
      capa: '0',
      vertices: [],
      cerrada: false,
      texto: '',
      posicion: { x: 0, y: 0 },
      posicionFin: { x: 0, y: 0 },
    };
    let numVertices = 0;
    let xActual: number | null = null;

    while (i < lineas.length) {
      // Peek: si el siguiente código 0 es otra entidad, salir
      if (peek() === '0') break;

      const [code, value] = next();

      if (code === '8') { ent.capa = value; continue; }
      if (code === '70') {
        const flags = parseInt(value) || 0;
        ent.cerrada = (flags & 1) === 1;
        continue;
      }
      if (code === '90') { numVertices = parseInt(value) || 0; continue; }

      // Vértices: grupo 10 = X, grupo 20 = Y (van intercalados)
      if (code === '10') {
        xActual = parseFloat(value);
        continue;
      }
      if (code === '20' && xActual !== null) {
        ent.vertices.push({ x: xActual, y: parseFloat(value) });
        xActual = null;
        continue;
      }
    }

    // Si numVertices no está o la polilínea está abierta pero es cíclica
    if (numVertices === 0) numVertices = ent.vertices.length;
    return ent;
  }

  function parsearLine(): EntidadDxf {
    const ent: EntidadDxf = {
      tipo: 'LINE',
      capa: '0',
      vertices: [],
      cerrada: false,
      texto: '',
      posicion: { x: 0, y: 0 },
      posicionFin: { x: 0, y: 0 },
    };
    let x1: number | null = null, y1: number | null = null;
    let x2: number | null = null, y2: number | null = null;
    let leyendoFin = false;

    while (i < lineas.length) {
      if (peek() === '0') break;
      const [code, value] = next();
      if (code === '8') { ent.capa = value; continue; }
      if (code === '10') { if (!leyendoFin) x1 = parseFloat(value); else x2 = parseFloat(value); continue; }
      if (code === '20') { if (!leyendoFin) { y1 = parseFloat(value); leyendoFin = true; } else y2 = parseFloat(value); continue; }
      if (code === '11') { x2 = parseFloat(value); continue; }
      if (code === '21') { y2 = parseFloat(value); continue; }
    }
    if (x1 !== null && y1 !== null) ent.posicion = { x: x1, y: y1 };
    if (x2 !== null && y2 !== null) ent.posicionFin = { x: x2, y: y2 };
    return ent;
  }

  function parsearText(tipo: string): EntidadDxf {
    const ent: EntidadDxf = {
      tipo,
      capa: '0',
      vertices: [],
      cerrada: false,
      texto: '',
      posicion: { x: 0, y: 0 },
      posicionFin: { x: 0, y: 0 },
    };

    while (i < lineas.length) {
      if (peek() === '0') break;
      const [code, value] = next();
      if (code === '8') { ent.capa = value; continue; }
      if (code === '1') {
        // Limpiar códigos de formato MTEXT ({\fArial;SALA} → SALA)
        ent.texto = value.replace(/\{\\[^;]+;([^}]+)\}/g, '$1').replace(/[{}\\]/g, '').trim();
        continue;
      }
      if (code === '10') { ent.posicion.x = parseFloat(value); continue; }
      if (code === '20') { ent.posicion.y = parseFloat(value); continue; }
    }
    return ent;
  }
}

// ─── Conversión a ResultadoPlanimetro ─────────────────────────────────────

import type { ResultadoPlanimetro, Ambiente } from '@/components/planimetro/types';

const AREA_MINIMA_M2 = 0.5;
const AREA_MAXIMA_M2 = 2000;

export function dxfAResultado(dxf: ResultadoDxf): ResultadoPlanimetro {
  const { entidades, insunits } = dxf;

  // Tomar muestra de coordenadas para heurística de unidades
  const todasCoordenadas = entidades
    .flatMap((e) => [...e.vertices, e.posicion])
    .map((v) => Math.abs(v.x) + Math.abs(v.y))
    .filter((n) => n > 0);
  const muestraCoord = todasCoordenadas.length
    ? todasCoordenadas.reduce((a, b) => a + b, 0) / todasCoordenadas.length
    : 1;

  const factor = factorAMetros(insunits, muestraCoord);

  // Polilíneas cerradas = posibles ambientes
  const poligonos = entidades.filter(
    (e) => (e.tipo === 'LWPOLYLINE' || e.tipo === 'POLYLINE') &&
            (e.cerrada || e.vertices.length >= 3) &&
            e.vertices.length >= 3
  );

  // Textos para identificar ambientes
  const textos = entidades.filter(
    (e) => (e.tipo === 'TEXT' || e.tipo === 'MTEXT') && e.texto.trim()
  );

  const ambientes: Ambiente[] = [];
  const usados = new Set<number>();
  const ALTURA = 2.6;

  poligonos.forEach((poly, idx) => {
    const areaUnidades = areaPoligono(poly.vertices);
    const areaM2 = areaUnidades * factor * factor;

    if (areaM2 < AREA_MINIMA_M2 || areaM2 > AREA_MAXIMA_M2) return;

    const bb = boundingBox(poly.vertices);
    const cx = centroide(poly.vertices);

    // Buscar texto dentro del polígono
    let nombre = '';
    for (let ti = 0; ti < textos.length; ti++) {
      if (usados.has(ti)) continue;
      if (puntoEnPoligono(textos[ti].posicion, poly.vertices)) {
        nombre = textos[ti].texto;
        usados.add(ti);
        break;
      }
    }
    if (!nombre) nombre = `Ambiente ${ambientes.length + 1}`;

    const largo = parseFloat((bb.ancho * factor).toFixed(2));
    const ancho = parseFloat((bb.alto * factor).toFixed(2));
    const area_piso = parseFloat(areaM2.toFixed(2));
    const perimetroUnid = perimetroPoligono(poly.vertices);
    const perim = parseFloat((perimetroUnid * factor).toFixed(2));
    const area_muros = parseFloat((perim * ALTURA).toFixed(2));

    ambientes.push({
      id: nombre.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_'),
      nombre,
      x: parseFloat(((bb.minX - (poligonos[0]?.vertices[0]?.x ?? 0)) * factor).toFixed(2)),
      y: parseFloat(((bb.minY - (poligonos[0]?.vertices[0]?.y ?? 0)) * factor).toFixed(2)),
      largo: Math.max(largo, ancho),
      ancho: Math.min(largo, ancho),
      area_piso,
      perimetro: perim,
      area_muros,
    });
  });

  // Normalizar posiciones relativas al origen (0,0)
  if (ambientes.length > 0) {
    const minX = Math.min(...ambientes.map((a) => a.x));
    const minY = Math.min(...ambientes.map((a) => a.y));
    ambientes.forEach((a) => { a.x = parseFloat((a.x - minX).toFixed(2)); a.y = parseFloat((a.y - minY).toFixed(2)); });
  }

  const area_total_piso = parseFloat(ambientes.reduce((s, a) => s + a.area_piso, 0).toFixed(2));
  const area_total_muros = parseFloat(ambientes.reduce((s, a) => s + a.area_muros, 0).toFixed(2));

  return {
    unidad: 'm',
    escala: null,
    altura_piso_a_piso: ALTURA,
    ambientes,
    resumen: { area_total_piso, area_total_muros, perimetro_exterior: null },
    advertencias: ambientes.length === 0
      ? ['No se encontraron polilíneas cerradas en el DXF. Verifica que el plano use LWPOLYLINE para definir los ambientes.']
      : [`${ambientes.length} ambientes detectados a partir de polilíneas cerradas.`],
  };
}
