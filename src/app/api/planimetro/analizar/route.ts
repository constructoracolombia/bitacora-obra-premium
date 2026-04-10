import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

const PROMPT = `Eres un ingeniero civil experto en lectura de planos arquitectónicos. Analiza este plano y extrae todos los espacios con sus dimensiones.

Devuelve ÚNICAMENTE un JSON válido. Sin texto antes ni después. Sin bloques de código markdown. Sin comentarios dentro del JSON. Solo el JSON puro.

Estructura requerida:
{"unidad":"m","escala":null,"altura_piso_a_piso":2.6,"ambientes":[{"id":"sala","nombre":"Sala","x":0,"y":0,"largo":4.5,"ancho":3.2,"area_piso":14.4,"perimetro":15.4,"area_muros":40.04}],"resumen":{"area_total_piso":14.4,"area_total_muros":40.04,"perimetro_exterior":null},"advertencias":[]}

Reglas:
- id: slug lowercase sin espacios ni tildes (ej: "habitacion_principal")
- x, y: posición en metros desde esquina inferior izquierda del plano
- largo: dimensión mayor del ambiente en metros
- ancho: dimensión menor del ambiente en metros
- area_piso: largo × ancho redondeado a 2 decimales
- perimetro: 2 × (largo + ancho) redondeado a 2 decimales
- area_muros: perimetro × altura_piso_a_piso redondeado a 2 decimales
- Si una dimensión no es legible, estímala por proporción visual
- Si no hay escala visible, usa null y estima dimensiones razonables
- Incluye TODOS los espacios: habitaciones, baños, cocina, zonas comunes, circulaciones
- Solo JSON puro, sin nada más`;

function limpiarJSON(texto: string): string {
  // Remover bloques de código markdown
  let limpio = texto.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  // Extraer el objeto JSON más externo
  const inicio = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  if (inicio === -1 || fin === -1) return limpio;
  limpio = limpio.slice(inicio, fin + 1);
  // Remover comentarios de línea (// ...) que Claude a veces agrega
  limpio = limpio.replace(/\/\/[^\n]*/g, '');
  // Remover comas antes de } o ]
  limpio = limpio.replace(/,(\s*[}\]])/g, '$1');
  return limpio;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf';

    const contentBlock = mimeType === 'application/pdf'
      ? {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: base64,
          },
        }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64,
          },
        };

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            contentBlock,
            { type: 'text', text: PROMPT },
          ],
        },
        // Prefill para forzar que empiece directamente con el JSON
        {
          role: 'assistant',
          content: '{',
        },
      ],
    });

    const rawText = '{' + (message.content[0].type === 'text' ? message.content[0].text : '');

    let jsonLimpio: string;
    try {
      jsonLimpio = limpiarJSON(rawText);
      const resultado = JSON.parse(jsonLimpio);
      return NextResponse.json({ ok: true, data: resultado });
    } catch (parseErr) {
      console.error('JSON parse error. Raw:', rawText.slice(0, 500));
      return NextResponse.json(
        { error: `JSON inválido en respuesta de IA: ${String(parseErr)}` },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('Error en /api/planimetro/analizar:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
