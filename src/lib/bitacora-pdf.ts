import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface BitacoraEntry {
  fecha: string;
  novedades: string | null;
  oficiales_count?: number;
  ayudantes_count?: number;
  personal_count: number;
  novedad_tipo?: string | null;
  fotos_manana?: string[];
  fotos_tarde?: string[];
}

interface BitacoraPDFOptions {
  proyectoNombre: string;
  entries: BitacoraEntry[];
}

export function generateBitacoraPDF({
  proyectoNombre,
  entries,
}: BitacoraPDFOptions): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  // Título
  doc.setFontSize(18);
  doc.setTextColor(255, 184, 0);
  doc.text("Bitácora de Obra", margin, y);
  y += 8;

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Proyecto: ${proyectoNombre}`, margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  for (const entry of entries) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(
      format(new Date(entry.fecha), "EEEE d 'de' MMMM, yyyy", { locale: es }),
      margin,
      y
    );
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    if (entry.novedad_tipo) {
      doc.text(`Tipo: ${entry.novedad_tipo}`, margin, y);
      y += 6;
    }

    const personal =
      (entry.oficiales_count ?? 0) + (entry.ayudantes_count ?? 0) ||
      entry.personal_count;
    doc.text(
      `Personal: ${personal} (Oficiales: ${entry.oficiales_count ?? 0}, Ayudantes: ${entry.ayudantes_count ?? 0})`,
      margin,
      y
    );
    y += 6;

    if (entry.novedades) {
      const lines = doc.splitTextToSize(entry.novedades, pageWidth - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 4;
    }

    const fotosManana = entry.fotos_manana ?? [];
    const fotosTarde = entry.fotos_tarde ?? [];
    if (fotosManana.length > 0 || fotosTarde.length > 0) {
      doc.text("Fotos: Mañana " + fotosManana.length + ", Tarde " + fotosTarde.length, margin, y);
      y += 6;
    }

    y += 8;
  }

  doc.save(`bitacora-${proyectoNombre.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
