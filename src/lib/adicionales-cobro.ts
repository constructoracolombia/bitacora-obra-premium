import type { SupabaseClient } from "@supabase/supabase-js";

// Compartido entre adicionales/[id]/page.tsx (timeline con checkboxes) y
// adicionales/page.tsx (selector rápido en la lista) — misma lógica, un
// solo lugar. Cuando un adicional queda APROBADO (estado
// "pendiente_pago_50" — gerencia dio el visto bueno, falta que el
// cliente pague), su valor se suma a cuentas_por_cobrar.monto_adicionales
// del proyecto, con una nota sutil identificando el adicional y una
// marca [adicional:<id>] para no duplicar la suma ni perder el rastro
// al revertir (si se "desaprueba").
export type AdicionalParaCobro = { id: string; proyecto_id: string; descripcion: string; monto: number };

export type BucketAdicional = "creado" | "aprobado" | "pagado";

// Los 3 pasos simplificados y a qué valor literal de `estado` (+ su
// dateField) corresponde cada uno al escribir en la tabla `adicionales`.
export const BUCKET_A_ESTADO: Record<BucketAdicional, { estado: string; dateField: string }> = {
  creado: { estado: "solicitado", dateField: "fecha_solicitud" },
  aprobado: { estado: "pendiente_pago_50", dateField: "fecha_pendiente_pago_50" },
  pagado: { estado: "entregado", dateField: "fecha_entregado" },
};

// Mapa inverso — incluye los 3 valores históricos que ya no se escriben
// para adicionales nuevos (pendiente_aprobacion, iniciar_trabajos,
// revision_final) para que los registros viejos se sigan viendo bien.
const ESTADO_A_BUCKET: Record<string, BucketAdicional> = {
  solicitado: "creado",
  pendiente_aprobacion: "creado",
  pendiente_pago_50: "aprobado",
  iniciar_trabajos: "aprobado",
  revision_final: "aprobado",
  entregado: "pagado",
};

const ORDEN_BUCKET: Record<BucketAdicional, number> = { creado: 0, aprobado: 1, pagado: 2 };

export function bucketDeEstado(estado: string): BucketAdicional {
  return ESTADO_A_BUCKET[estado] ?? "creado";
}

export function ordenBucket(b: BucketAdicional): number {
  return ORDEN_BUCKET[b];
}

export async function sincronizarCobroAdicional(
  supabase: SupabaseClient,
  ad: AdicionalParaCobro,
  accion: "sumar" | "restar"
) {
  try {
    const { data: cuentas, error: errCuenta } = await supabase
      .from("cuentas_por_cobrar")
      .select("id, monto_adicionales, notas, concepto")
      .eq("proyecto_id", ad.proyecto_id)
      .not("concepto", "ilike", "Adicional:%")
      .order("created_at", { ascending: true })
      .limit(1);

    if (errCuenta) throw errCuenta;
    const cuenta = cuentas?.[0] as { id: string; monto_adicionales: number | null; notas: string | null } | undefined;
    if (!cuenta) {
      if (accion === "sumar") {
        alert(
          "Este adicional quedó aprobado, pero no encontré una cuenta por cobrar para su proyecto en Finanzas — súmalo manualmente."
        );
      }
      return;
    }

    const marca = `[adicional:${ad.id}]`;
    const yaAplicado = (cuenta.notas || "").includes(marca);

    if (accion === "sumar") {
      if (yaAplicado) return;
      const montoFmt = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
      }).format(ad.monto);
      const fechaFmt = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" }).format(
        new Date()
      );
      const notaLinea = `\n+ Adicional aprobado: "${ad.descripcion}" — ${montoFmt} (${fechaFmt}) ${marca}`;
      await supabase
        .from("cuentas_por_cobrar")
        .update({
          monto_adicionales: (Number(cuenta.monto_adicionales) || 0) + ad.monto,
          notas: (cuenta.notas || "") + notaLinea,
        } as any)
        .eq("id", cuenta.id);
    } else {
      if (!yaAplicado) return;
      const notasSinLinea = (cuenta.notas || "")
        .split("\n")
        .filter((l) => !l.includes(marca))
        .join("\n");
      await supabase
        .from("cuentas_por_cobrar")
        .update({
          monto_adicionales: Math.max(0, (Number(cuenta.monto_adicionales) || 0) - ad.monto),
          notas: notasSinLinea,
        } as any)
        .eq("id", cuenta.id);
    }
  } catch (err) {
    console.error("Error sincronizando cobro del adicional:", err);
  }
}
