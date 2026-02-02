/**
 * Script de migración: Copiar proyectos de Finanzas a proyectos_maestro
 *
 * Ejecutar: npx tsx scripts/migrar-proyectos-existentes.ts
 *
 * Requiere: .env.local con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
 * Para acceso completo (bypass RLS), usar SUPABASE_SERVICE_ROLE_KEY si está disponible
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Cargar .env.local
config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Tabla origen en Finanzas (puede sobreescribirse con env TABLA_FINANZAS)
const TABLA_FINANZAS = process.env.TABLA_FINANZAS || "proyectos";

// Campos posibles en la tabla Finanzas (flexible para diferentes esquemas)
interface ProyectoFinanzas {
  id: string;
  cliente_nombre?: string | null;
  presupuesto?: number | null;
  presupuesto_total?: number | null;
  fecha_inicio?: string | null;
  fecha_entrega_estimada?: string | null;
  margen_objetivo?: number | null;
  estado?: string | null;
  direccion?: string | null;
  porcentaje_avance?: number | null;
  residente_asignado?: string | null;
  [key: string]: unknown;
}

interface ProyectoMaestro {
  id: string;
  cliente_nombre: string | null;
  direccion: string | null;
  presupuesto_total: number | null;
  fecha_inicio: string | null;
  fecha_entrega_estimada: string | null;
  margen_objetivo: number | null;
  estado: string;
  porcentaje_avance: number;
  residente_asignado: string | null;
  app_origen: string;
}

function mapearProyecto(row: ProyectoFinanzas): ProyectoMaestro {
  const presupuesto =
    row.presupuesto ?? row.presupuesto_total ?? null;
  return {
    id: row.id,
    cliente_nombre: row.cliente_nombre ?? null,
    direccion: row.direccion ?? null,
    presupuesto_total: presupuesto != null ? Number(presupuesto) : null,
    fecha_inicio: row.fecha_inicio ?? null,
    fecha_entrega_estimada: row.fecha_entrega_estimada ?? null,
    margen_objetivo:
      row.margen_objetivo != null ? Number(row.margen_objetivo) : null,
    estado: (row.estado as string) ?? "ACTIVO",
    porcentaje_avance: Number(row.porcentaje_avance) || 0,
    residente_asignado: row.residente_asignado ?? null,
    app_origen: "FINANZAS",
  };
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Faltan credenciales. Verifica .env.local:");
    console.error("   - NEXT_PUBLIC_SUPABASE_URL");
    console.error("   - NEXT_PUBLIC_SUPABASE_ANON_KEY (o SUPABASE_SERVICE_ROLE_KEY)");
    process.exit(1);
  }

  const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

  const stats = {
    total: 0,
    insertados: 0,
    actualizados: 0,
    errores: 0,
    erroresDetalle: [] as string[],
  };

  console.log("🔄 Iniciando migración de proyectos Finanzas → proyectos_maestro\n");
  console.log(`   Origen: ${TABLA_FINANZAS}`);
  console.log(`   Destino: proyectos_maestro`);
  console.log(`   Filtro: estado = 'ACTIVO'\n`);

  try {
    // 1. Leer proyectos de Finanzas (solo ACTIVO)
    const { data: proyectosFinanzas, error: errorLectura } = await supabase
      .from(TABLA_FINANZAS)
      .select("*")
      .eq("estado", "ACTIVO");

    if (errorLectura) {
      throw new Error(
        `Error leyendo ${TABLA_FINANZAS}: ${errorLectura.message}. ` +
          `¿Existe la tabla? ¿Tienes permisos?`
      );
    }

    const proyectos = (proyectosFinanzas ?? []) as ProyectoFinanzas[];
    stats.total = proyectos.length;

    if (proyectos.length === 0) {
      console.log("⚠️  No se encontraron proyectos con estado = 'ACTIVO' en Finanzas.");
      mostrarResumen(stats);
      return;
    }

    console.log(`📋 Proyectos a procesar: ${proyectos.length}\n`);

    // 2. Obtener proyectos existentes en proyectos_maestro (para detectar duplicados)
    const { data: existentes, error: errorExistentes } = await supabase
      .from("proyectos_maestro")
      .select("id, cliente_nombre, fecha_inicio");

    if (errorExistentes) {
      throw new Error(
        `Error leyendo proyectos_maestro: ${errorExistentes.message}. ` +
          `¿Existe la tabla?`
      );
    }

    const mapaExistentes = new Map<string, string>(); // key -> id
    for (const p of existentes ?? []) {
      const r = p as { id: string; cliente_nombre: string | null; fecha_inicio: string | null };
      const key = `${r.cliente_nombre ?? ""}|${r.fecha_inicio ?? ""}`;
      mapaExistentes.set(key, r.id);
    }

    // 3. Procesar cada proyecto
    for (let i = 0; i < proyectos.length; i++) {
      const row = proyectos[i];
      const cliente = row.cliente_nombre ?? "Sin nombre";

      try {
        const proyecto = mapearProyecto(row);
        const keyExistente = `${proyecto.cliente_nombre ?? ""}|${proyecto.fecha_inicio ?? ""}`;
        const idExistente = mapaExistentes.get(keyExistente);

        if (!idExistente) {
          const { error: errorInsert } = await supabase
            .from("proyectos_maestro")
            .insert(proyecto);

          if (errorInsert) {
            stats.errores++;
            stats.erroresDetalle.push(
              `[${cliente}] Insert: ${errorInsert.message}`
            );
            console.log(`   ❌ [${i + 1}/${proyectos.length}] ${cliente}: ${errorInsert.message}`);
          } else {
            stats.insertados++;
            mapaExistentes.set(keyExistente, proyecto.id);
            console.log(`   ✅ [${i + 1}/${proyectos.length}] Insertado: ${cliente}`);
          }
        } else {
          const { error: errorUpdate } = await supabase
            .from("proyectos_maestro")
            .update({
              cliente_nombre: proyecto.cliente_nombre,
              direccion: proyecto.direccion,
              presupuesto_total: proyecto.presupuesto_total,
              fecha_inicio: proyecto.fecha_inicio,
              fecha_entrega_estimada: proyecto.fecha_entrega_estimada,
              margen_objetivo: proyecto.margen_objetivo,
              estado: proyecto.estado,
              porcentaje_avance: proyecto.porcentaje_avance,
              residente_asignado: proyecto.residente_asignado,
              app_origen: proyecto.app_origen,
              updated_at: new Date().toISOString(),
            })
            .eq("id", idExistente);

          if (errorUpdate) {
            stats.errores++;
            stats.erroresDetalle.push(
              `[${cliente}] Update: ${errorUpdate.message}`
            );
            console.log(`   ❌ [${i + 1}/${proyectos.length}] ${cliente}: ${errorUpdate.message}`);
          } else {
            stats.actualizados++;
            console.log(`   🔄 [${i + 1}/${proyectos.length}] Actualizado: ${cliente}`);
          }
        }
      } catch (err) {
        stats.errores++;
        const msg = err instanceof Error ? err.message : String(err);
        stats.erroresDetalle.push(`[${cliente}]: ${msg}`);
        console.log(`   ❌ [${i + 1}/${proyectos.length}] ${cliente}: ${msg}`);
      }
    }

    mostrarResumen(stats);
  } catch (err) {
    console.error("\n❌ Error fatal:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

function mostrarResumen(stats: {
  total: number;
  insertados: number;
  actualizados: number;
  errores: number;
  erroresDetalle: string[];
}) {
  console.log("\n" + "─".repeat(50));
  console.log("📊 RESUMEN");
  console.log("─".repeat(50));
  console.log(`   Total procesados:  ${stats.total}`);
  console.log(`   Nuevos insertados: ${stats.insertados}`);
  console.log(`   Actualizados:     ${stats.actualizados}`);
  console.log(`   Errores:          ${stats.errores}`);
  if (stats.erroresDetalle.length > 0) {
    console.log("\n   Detalle de errores:");
    stats.erroresDetalle.forEach((e) => console.log(`   - ${e}`));
  }
  console.log("─".repeat(50));
}

main();
