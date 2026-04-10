import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

const PROMPT = `Eres un ingeniero civil experto en lectura de planos arquitectónicos. Analiza este plano y extrae todos los espacios con sus dimensiones.

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta (sin texto adicional, sin markdown, sin bloques de código):

{
  "unidad": "m",
  "escala": "<escala del plano si se puede leer, ej: 1:50, o null>",
  "altura_piso_a_piso": <número en metros, usa 2.6 si no se especifica>,
  "ambientes": [
    {
      "id": "<slug único lowercase sin espacios>",
      "nombre": "<nombre del espacio tal como aparece en el plano>",
      "x": <posición X en metros desde esquina inferior izquierda del plano>,
      "y": <posición Y en metros desde esquina inferior izquierda del plano>,
      "largo": <dimensión mayor en metros>,
      "ancho": <dimensión menor en metros>,
      "area_piso": <largo × ancho, redondeado a 2 decimales>,
      "perimetro": <2 × (largo + ancho), redondeado a 2 decimales>,
      "area_muros": <perimetro × altura_piso_a_piso, redondeado a 2 decimales>
    }
  ],
  "resumen": {
    "area_total_piso": <suma de todas las areas_piso>,
    "area_total_muros": <suma de todas las areas_muros>,
    "perimetro_exterior": <perímetro exterior total del edificio si se puede determinar, o null>
  },
  "advertencias": ["<mensaje si alguna dimensión es estimada o ilegible>"]
}

Reglas:
- Si una dimensión no es legible, estímala por proporción visual respecto a dimensiones conocidas
- Los valores x, y son para posicionar los ambientes en el modelo 3D (en metros desde el origen)
- Si el plano no tiene escala visible, estima dimensiones razonables para el tipo de espacio
- Incluye TODOS los espacios visibles: habitaciones, baños, cocina, zonas comunes, circulaciones, etc.
- NO incluyas ningún texto fuera del JSON`;

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

    // Construir el mensaje según el tipo de archivo
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
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            contentBlock,
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extraer JSON de la respuesta
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'No se pudo extraer JSON de la respuesta', raw: rawText }, { status: 500 });
    }

    const resultado = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ ok: true, data: resultado });
  } catch (err) {
    console.error('Error en /api/planimetro/analizar:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
