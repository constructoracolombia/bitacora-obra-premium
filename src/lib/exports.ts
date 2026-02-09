import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface BitacoraEntry {
  fecha: string;
  novedades: string | null;
  oficiales_count?: number;
  ayudantes_count?: number;
  personal_count: number;
  novedad_tipo?: string | null;
}

export function exportBitacoraPDF(
  proyectoNombre: string,
  entries: BitacoraEntry[]
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

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
    y += 8;
  }

  doc.save(
    `bitacora-${proyectoNombre.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`
  );
}

interface PedidoRow {
  item: string;
  cantidad: number;
  unidad: string | null;
  estado: string;
  costo_estimado?: number | null;
  costo_real?: number | null;
  fecha_consumo?: string | null;
  created_at: string;
}

export function exportPedidosExcel(pedidos: PedidoRow[]): void {
  const data = pedidos.map((p) => ({
    Item: p.item,
    Cantidad: p.cantidad,
    Unidad: p.unidad ?? "",
    Estado: p.estado,
    "Costo estimado (COP)": p.costo_estimado ?? "",
    "Costo real (COP)": p.costo_real ?? "",
    "Fecha consumo": p.fecha_consumo
      ? format(new Date(p.fecha_consumo), "d MMM yyyy", { locale: es })
      : "",
    "Fecha solicitud": format(new Date(p.created_at), "d MMM yyyy", {
      locale: es,
    }),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
  XLSX.writeFile(
    wb,
    `pedidos-${format(new Date(), "yyyy-MM-dd")}.xlsx`
  );
}

export async function exportGanttAsImage(
  elementRef: HTMLElement | null
): Promise<void> {
  if (!elementRef) return;
  const canvas = await html2canvas(elementRef, {
    backgroundColor: "#FFFFFF",
    scale: 2,
    useCORS: true,
  });
  const link = document.createElement("a");
  link.download = `gantt-${format(new Date(), "yyyy-MM-dd")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
