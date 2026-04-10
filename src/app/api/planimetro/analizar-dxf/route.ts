import { NextRequest, NextResponse } from 'next/server';
import { parsearDxf, dxfAResultado } from '@/lib/planimetro/dxf';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.dxf')) {
      return NextResponse.json({ error: 'El archivo debe ser .dxf' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    // DXF puede estar en UTF-8 o Latin-1 (CP1252 en Windows)
    let contenido: string;
    try {
      contenido = new TextDecoder('utf-8').decode(buffer);
    } catch {
      contenido = new TextDecoder('latin1').decode(buffer);
    }

    const dxf = parsearDxf(contenido);

    if (dxf.entidades.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron entidades en el DXF. Verifica que el archivo no esté vacío o sea un DXF binario (solo se soporta ASCII DXF).' },
        { status: 422 }
      );
    }

    const resultado = dxfAResultado(dxf);

    return NextResponse.json({ ok: true, data: resultado, meta: {
      version: dxf.version,
      insunits: dxf.insunits,
      totalEntidades: dxf.entidades.length,
    }});
  } catch (err) {
    console.error('Error en /api/planimetro/analizar-dxf:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
