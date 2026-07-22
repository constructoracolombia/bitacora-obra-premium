// GET /api/obra/[token] — sirve el feed de avances para el portal público /obra/[token] (service role)
// Solo expone bitacora_entradas + bitacora_fotos. bitacora_tareas ("Por Hacer") es interno y nunca se sirve aquí.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  const { data: compartido, error: errorToken } = await supabaseAdmin
    .from("bitacora_compartidos")
    .select("proyecto_id")
    .eq("token", token)
    .single();

  if (errorToken || !compartido) {
    return NextResponse.json(
      { error: "Link inválido o proyecto no encontrado" },
      { status: 404 }
    );
  }

  const { data: proyecto, error: errorProyecto } = await supabaseAdmin
    .from("proyectos_maestro")
    .select("id, cliente_nombre")
    .eq("id", compartido.proyecto_id)
    .single();

  if (errorProyecto || !proyecto) {
    return NextResponse.json(
      { error: "Proyecto no encontrado" },
      { status: 404 }
    );
  }

  const { data: entradas, error: errorEntradas } = await supabaseAdmin
    .from("bitacora_entradas")
    .select("id, fecha, titulo, descripcion, video_url, bitacora_fotos(id, foto_url, orden)")
    .eq("proyecto_id", proyecto.id)
    .order("fecha", { ascending: false });

  if (errorEntradas) {
    return NextResponse.json(
      { error: "Error al cargar los avances" },
      { status: 500 }
    );
  }

  const entradasOrdenadas = (entradas ?? []).map((e) => ({
    ...e,
    bitacora_fotos: [...(e.bitacora_fotos ?? [])].sort((a, b) => a.orden - b.orden),
  }));

  return NextResponse.json({ proyecto, entradas: entradasOrdenadas });
}
