import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let textoContrato = '';
    
    if (file.type === 'application/pdf') {
      const pdfData = await pdfParse(buffer);
      textoContrato = pdfData.text;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      textoContrato = result.value;
    } else {
      return NextResponse.json({ error: 'Formato no soportado. Use PDF o DOCX' }, { status: 400 });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Analiza este contrato de construcción/remodelación y extrae la información en formato JSON.

CONTRATO:
${textoContrato}

Responde SOLO con este JSON:

{
  "cliente_nombre": "Nombre del cliente",
  "proyecto_nombre": "Dirección",
  "presupuesto_total": 50000000,
  "fecha_firma": "2026-01-15",
  "fecha_inicio": "2026-01-29",
  "fecha_entrega": "2026-04-30",
  "conjunto": "Nombre conjunto o null",
  "alcance": [
    {"actividad": "Demolición", "cantidad": 50, "unidad": "m²"}
  ]
}`
      }]
    });

    const respuestaTexto = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonLimpio = respuestaTexto.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const datosExtraidos = JSON.parse(jsonLimpio);

    return NextResponse.json({
      success: true,
      datos: datosExtraidos
    });

  } catch (error: any) {
    console.error('Error analizando contrato:', error);
    return NextResponse.json({
      error: 'Error procesando el contrato',
      details: error.message
    }, { status: 500 });
  }
}
