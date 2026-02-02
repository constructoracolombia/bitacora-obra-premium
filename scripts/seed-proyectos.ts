/**
 * Seed: Insertar 5 proyectos de ejemplo con nombres colombianos
 *
 * Ejecutar: npx tsx scripts/seed-proyectos.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const PROYECTOS_EJEMPLO = [
  {
    cliente_nombre: "Constructora Valle del Cauca S.A.S",
    direccion: "Calle 15 #28-45, Cali",
    presupuesto_total: 45_000_000,
    fecha_inicio: "2025-01-15",
    fecha_entrega_estimada: "2025-08-30",
    margen_objetivo: 22,
    residente_asignado: "Carlos Mendoza",
    estado: "ACTIVO",
    porcentaje_avance: 35,
    lista_actividades: [],
  },
  {
    cliente_nombre: "Inversiones Antioquia Ltda",
    direccion: "Carrera 43A #1-50, Medellín",
    presupuesto_total: 62_000_000,
    fecha_inicio: "2025-02-01",
    fecha_entrega_estimada: "2025-06-15",
    margen_objetivo: 20,
    residente_asignado: "María Fernanda López",
    estado: "ACTIVO",
    porcentaje_avance: 58,
    lista_actividades: [],
  },
  {
    cliente_nombre: "Edificaciones Bogotá S.A.",
    direccion: "Avenida 68 #90-12, Bogotá",
    presupuesto_total: 78_000_000,
    fecha_inicio: "2024-11-01",
    fecha_entrega_estimada: "2025-09-30",
    margen_objetivo: 18,
    residente_asignado: "Andrés Rodríguez",
    estado: "ACTIVO",
    porcentaje_avance: 42,
    lista_actividades: [],
  },
  {
    cliente_nombre: "Vivienda Popular Barranquilla",
    direccion: "Calle 72 #54-20, Barranquilla",
    presupuesto_total: 35_000_000,
    fecha_inicio: "2025-03-10",
    fecha_entrega_estimada: "2025-07-20",
    margen_objetivo: 25,
    residente_asignado: "Pedro Martínez",
    estado: "EN_PAUSA",
    porcentaje_avance: 12,
    lista_actividades: [],
  },
  {
    cliente_nombre: "Centro Comercial Pereira",
    direccion: "Carrera 7 #19-20, Pereira",
    presupuesto_total: 52_000_000,
    fecha_inicio: "2024-06-01",
    fecha_entrega_estimada: "2025-02-28",
    margen_objetivo: 20,
    residente_asignado: "Laura Gómez",
    estado: "TERMINADO",
    porcentaje_avance: 100,
    lista_actividades: [],
  },
];

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Faltan credenciales en .env.local");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log("🌱 Insertando 5 proyectos de ejemplo...\n");

  for (let i = 0; i < PROYECTOS_EJEMPLO.length; i++) {
    const p = PROYECTOS_EJEMPLO[i];
    const { error } = await supabase.from("hoja_vida_proyecto").insert(p);

    if (error) {
      console.error(`   ❌ ${p.cliente_nombre}: ${error.message}`);
    } else {
      console.log(`   ✅ [${i + 1}/5] ${p.cliente_nombre}`);
    }
  }

  console.log("\n✅ Seed completado.");
}

main();
