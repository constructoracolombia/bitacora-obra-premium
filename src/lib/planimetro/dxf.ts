/**
 * Parser DXF para extracción de planimetría.
 * Soporta: LWPOLYLINE, POLYLINE, HATCH (boundary paths), LINE, TEXT, MTEXT
 * Parsea tanto la sección ENTITIES como BLOCKS para capturar toda la geometría.
 */

export interface Vertice { x: number; y: number }

export interface EntidadDxf {
  tipo: string;
  capa: string;
  vertices: Vertice[];
  cerrada: boolean;
  texto: string;
  posicion: Vertice;
  posicionFin: Vertice;
}

export interface ResultadoDxf {
  entidades: EntidadDxf[];
  insunits: number;
  version: string;
  debug: { tiposEncontrados: Record<string, number> };
}

// ─── Utilidades geométricas ────────────────────────────────────────────────

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

export function boundingBox(vertices: Vertice[]) {
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, ancho: maxX - minX, alto: maxY - minY };
}

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

export function centroide(vertices: Vertice[]): Vertice {
  const x = vertices.reduce((s, v) => s + v.x, 0) / vertices.length;
  const y = vertices.reduce((s, v) => s + v.y, 0) / vertices.length;
  return { x, y };
}

export function factorAMetros(insunits: number, muestraCoord: number): number {
  if (insunits === 6) return 1;
  if (insunits === 5) return 0.01;
  if (insunits === 4) return 0.001;
  if (insunits === 1) return 0.0254;
  if (insunits === 2) return 0.3048;
  if (muestraCoord > 10000) return 0.001;
  if (muestraCoord > 100)   return 0.01;
  return 1;
}

// ─── Parser DXF ───────────────────────────────────────────────────────────

export function parsearDxf(contenido: string): ResultadoDxf {
  const lineas = contenido.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  let insunits = 0;
  let version = '';
  const entidades: EntidadDxf[] = [];
  const tiposEncontrados: Record<string, number> = {};

  let i = 0;

  function peek(offset = 0) {
    return lineas[i + offset]?.trim() ?? '';
  }

  function next(): [string, string] {
    const code = lineas[i++]?.trim() ?? '';
    const value = lineas[i++]?.trim() ?? '';
    return [code, value];
  }

  // ── Header: INSUNITS + ACADVER ─────────────────────────────────────────
  while (i < lineas.length) {
    const [code, value] = next();
    if (code === '9' && value === '$INSUNITS') {
      const [, v] = next(); insunits = parseInt(v) || 0;
    }
    if (code === '9' && value === '$ACADVER') {
      const [, v] = next(); version = v;
    }
    // Entrar a BLOCKS o ENTITIES (lo que aparezca primero con geometría útil)
    if (code === '2' && (value === 'ENTITIES' || value === 'BLOCKS')) break;
    if (i >= lineas.length) break;
  }

  // ── Parsear secciones BLOCKS + ENTITIES ────────────────────────────────
  // Seguimos parseando hasta EOF para capturar AMBAS secciones
  while (i < lineas.length) {
    const [code, value] = next();

    if (code === '0' && value === 'EOF') break;

    // Registrar tipos para debug
    if (code === '0' && value && value !== 'ENDSEC' && value !== 'SECTION' &&
        value !== 'BLOCK' && value !== 'ENDBLK' && !/^\d+$/.test(value)) {
      tiposEncontrados[value] = (tiposEncontrados[value] ?? 0) + 1;
    }

    if (code === '0' && (value === 'LWPOLYLINE' || value === 'POLYLINE')) {
      const ent = parsearLwpolyline(value);
      if (ent.vertices.length >= 3) entidades.push(ent);
      continue;
    }

    if (code === '0' && value === 'HATCH') {
      const hatchEnts = parsearHatch();
      hatchEnts.forEach((e) => { if (e.vertices.length >= 3) entidades.push(e); });
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

  return { entidades, insunits, version, debug: { tiposEncontrados } };

  // ── Sub-parsers ──────────────────────────────────────────────────────

  function parsearLwpolyline(tipo: string): EntidadDxf {
    const ent: EntidadDxf = {
      tipo, capa: '0', vertices: [], cerrada: false,
      texto: '', posicion: { x: 0, y: 0 }, posicionFin: { x: 0, y: 0 },
    };
    let xActual: number | null = null;

    while (i < lineas.length) {
      if (peek() === '0') break;
      const [code, value] = next();
      if (code === '8')  { ent.capa = value; continue; }
      if (code === '70') { ent.cerrada = (parseInt(value) & 1) === 1; continue; }
      if (code === '10') { xActual = parseFloat(value); continue; }
      if (code === '20' && xActual !== null) {
        ent.vertices.push({ x: xActual, y: parseFloat(value) });
        xActual = null;
      }
    }
    return ent;
  }

  /**
   * Parser HATCH: extrae los boundary paths como polígonos.
   * Un HATCH puede tener múltiples boundary paths → devolvemos uno por path.
   * Soporta edge-based (LINE edges) y polyline-based boundaries.
   */
  function parsearHatch(): EntidadDxf[] {
    let capa = '0';
    const resultado: EntidadDxf[] = [];

    // Primero leer la capa y datos generales hasta llegar a los boundary paths
    let numPaths = 0;
    while (i < lineas.length) {
      if (peek() === '0') break;
      const [code, value] = next();
      if (code === '8')  { capa = value; continue; }
      if (code === '91') { numPaths = parseInt(value) || 0; break; }
    }

    // Parsear cada boundary path
    for (let p = 0; p < numPaths && i < lineas.length; p++) {
      const pathVerts: Vertice[] = [];
      let numEdgesOrVerts = 0;
      let xActual: number | null = null;
      let inPath = false;

      while (i < lineas.length) {
        if (peek() === '0') break;
        const [code, value] = next();

        // Inicio de path (boundary path type)
        if (code === '92') {
          inPath = true;
          continue;
        }

        if (!inPath) continue;

        // Número de edges (path basado en edges) o vértices (polyline path)
        if (code === '93') { numEdgesOrVerts = parseInt(value) || 0; continue; }

        // Coordenadas de vértices (polyline path) o extremos de LINE edges
        if (code === '10') { xActual = parseFloat(value); continue; }
        if (code === '20' && xActual !== null) {
          pathVerts.push({ x: xActual, y: parseFloat(value) });
          xActual = null;
          // Si recopilamos suficientes vértices para cerrar el path, paramos
          if (numEdgesOrVerts > 0 && pathVerts.length >= numEdgesOrVerts) break;
          continue;
        }

        // Detectar inicio de siguiente path
        if (code === '92') {
          // Re-procesar: decrementar i*2 para que el próximo ciclo lo lea
          i -= 2;
          break;
        }
      }

      if (pathVerts.length >= 3) {
        resultado.push({
          tipo: 'HATCH',
          capa,
          vertices: pathVerts,
          cerrada: true,
          texto: '',
          posicion: { x: 0, y: 0 },
          posicionFin: { x: 0, y: 0 },
        });
      }
    }

    // Consumir el resto del HATCH hasta la siguiente entidad
    while (i < lineas.length && peek() !== '0') next();

    return resultado;
  }

  function parsearLine(): EntidadDxf {
    const ent: EntidadDxf = {
      tipo: 'LINE', capa: '0', vertices: [], cerrada: false,
      texto: '', posicion: { x: 0, y: 0 }, posicionFin: { x: 0, y: 0 },
    };
    let x1: number | null = null;

    while (i < lineas.length) {
      if (peek() === '0') break;
      const [code, value] = next();
      if (code === '8')  { ent.capa = value; continue; }
      if (code === '10') { x1 = parseFloat(value); continue; }
      if (code === '20') { if (x1 !== null) { ent.posicion = { x: x1, y: parseFloat(value) }; x1 = null; } continue; }
      if (code === '11') { ent.posicionFin.x = parseFloat(value); continue; }
      if (code === '21') { ent.posicionFin.y = parseFloat(value); continue; }
    }
    return ent;
  }

  function parsearText(tipo: string): EntidadDxf {
    const ent: EntidadDxf = {
      tipo, capa: '0', vertices: [], cerrada: false,
      texto: '', posicion: { x: 0, y: 0 }, posicionFin: { x: 0, y: 0 },
    };

    while (i < lineas.length) {
      if (peek() === '0') break;
      const [code, value] = next();
      if (code === '8') { ent.capa = value; continue; }
      if (code === '1') {
        ent.texto = value
          .replace(/\\P/g, ' ')
          .replace(/\{\\[^;]+;([^}]*)\}/g, '$1')
          .replace(/[{}\\]/g, '')
          .trim();
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

const AREA_MINIMA_M2 = 0.3;
const AREA_MAXIMA_M2 = 5000;

export function dxfAResultado(dxf: ResultadoDxf): ResultadoPlanimetro {
  const { entidades, insunits, debug } = dxf;

  const todasCoordenadas = entidades
    .flatMap((e) => [...e.vertices, e.posicion])
    .map((v) => Math.abs(v.x) + Math.abs(v.y))
    .filter((n) => n > 0);
  const muestraCoord = todasCoordenadas.length
    ? todasCoordenadas.reduce((a, b) => a + b, 0) / todasCoordenadas.length
    : 1;

  const factor = factorAMetros(insunits, muestraCoord);

  // Candidatos a polígonos de ambiente: LWPOLYLINE, POLYLINE y HATCH
  const poligonos = entidades.filter(
    (e) => (e.tipo === 'LWPOLYLINE' || e.tipo === 'POLYLINE' || e.tipo === 'HATCH') &&
            e.vertices.length >= 3
  );

  const textos = entidades.filter(
    (e) => (e.tipo === 'TEXT' || e.tipo === 'MTEXT') && e.texto.trim()
  );

  const ALTURA = 2.6;
  const ambientes: Ambiente[] = [];
  const usados = new Set<number>();

  // Referencia de posición del primer polígono
  const refX = poligonos[0]?.vertices[0]?.x ?? 0;
  const refY = poligonos[0]?.vertices[0]?.y ?? 0;

  poligonos.forEach((poly) => {
    const areaUnidades = areaPoligono(poly.vertices);
    const areaM2 = areaUnidades * factor * factor;
    if (areaM2 < AREA_MINIMA_M2 || areaM2 > AREA_MAXIMA_M2) return;

    const bb = boundingBox(poly.vertices);

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

    const largoM = parseFloat((bb.ancho * factor).toFixed(2));
    const anchoM = parseFloat((bb.alto * factor).toFixed(2));
    const area_piso = parseFloat(areaM2.toFixed(2));
    const perim = parseFloat((perimetroPoligono(poly.vertices) * factor).toFixed(2));
    const area_muros = parseFloat((perim * ALTURA).toFixed(2));

    ambientes.push({
      id: nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 40),
      nombre,
      x: parseFloat(((bb.minX - refX) * factor).toFixed(2)),
      y: parseFloat(((bb.minY - refY) * factor).toFixed(2)),
      largo: Math.max(largoM, anchoM),
      ancho: Math.min(largoM, anchoM),
      area_piso,
      perimetro: perim,
      area_muros,
    });
  });

  // Normalizar al origen
  if (ambientes.length > 0) {
    const minX = Math.min(...ambientes.map((a) => a.x));
    const minY = Math.min(...ambientes.map((a) => a.y));
    ambientes.forEach((a) => {
      a.x = parseFloat((a.x - minX).toFixed(2));
      a.y = parseFloat((a.y - minY).toFixed(2));
    });
  }

  const area_total_piso  = parseFloat(ambientes.reduce((s, a) => s + a.area_piso, 0).toFixed(2));
  const area_total_muros = parseFloat(ambientes.reduce((s, a) => s + a.area_muros, 0).toFixed(2));

  const tiposStr = Object.entries(debug.tiposEncontrados)
    .map(([k, v]) => `${k}(${v})`).join(', ');

  const advertencias: string[] = [];
  if (ambientes.length === 0) {
    advertencias.push(
      `No se encontraron ambientes. Entidades detectadas: ${tiposStr || 'ninguna'}. ` +
      `El plano debe tener LWPOLYLINE cerradas o HATCH de relleno de área para cada espacio.`
    );
  } else {
    advertencias.push(`${ambientes.length} ambientes detectados. Entidades: ${tiposStr}`);
  }

  return {
    unidad: 'm',
    escala: null,
    altura_piso_a_piso: ALTURA,
    ambientes,
    resumen: { area_total_piso, area_total_muros, perimetro_exterior: null },
    advertencias,
  };
}
