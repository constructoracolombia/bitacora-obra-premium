import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const PROMPT = `Analiza el siguiente texto de un contrato de construcción y extrae la información en formato JSON.
Devuelve ÚNICAMENTE un objeto JSON válido, sin markdown ni texto adicional, con estas claves:
- cliente_nombre (string)
- proyecto_nombre (string)
- presupuesto_total (number, en COP)
- fecha_firma (string YYYY-MM-DD si existe, o null)
- fecha_inicio (string YYYY-MM-DD si existe, o null)
- fecha_entrega (string YYYY-MM-DD si existe, o null)
- conjunto (string o null)
- alcance (string descriptivo del alcance del contrato)

Si no encuentras un valor, usa null. Para fechas, normaliza al formato YYYY-MM-DD.`;

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse/node");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text || "";
  } finally {
    await parser.destroy();
  }
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY no configurada" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "No se envió archivo" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    let text = "";

    if (name.endsWith(".pdf")) {
      text = await extractTextFromPDF(buffer);
    } else if (name.endsWith(".docx") || name.endsWith(".doc")) {
      text = await extractTextFromDOCX(buffer);
    } else {
      return NextResponse.json(
        { error: "Formato no soportado. Use PDF o DOCX." },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "No se pudo extraer texto del documento" },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${PROMPT}\n\n---\nTexto del contrato:\n\n${text.slice(0, 50000)}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json(
        { error: "Respuesta inesperada del modelo" },
        { status: 500 }
      );
    }

    const raw = content.text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Error analizar-contrato:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Error al analizar el contrato",
      },
      { status: 500 }
    );
  }
}
