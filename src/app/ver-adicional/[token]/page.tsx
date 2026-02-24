"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  Building2,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const supabase = createClient(
  "https://ngawmyhrfgdckjyynhbr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nYXdteWhyZmdkY2tqeXluaGJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzI3MDUsImV4cCI6MjA1MjU0ODcwNX0.u3od7AuLHKMBnXWKNMOC_B_lLSJk5sh0-0wLSWbPCaw",
);

const STEPS = [
  {
    key: "solicitado",
    label: "Solicitud del cliente",
    description: "Se recibe la solicitud del adicional",
    dateField: "fecha_solicitud",
  },
  {
    key: "pendiente_aprobacion",
    label: "Pendiente aprobación",
    description: "Revisión y aprobación del adicional",
    dateField: "fecha_pendiente_aprobacion",
  },
  {
    key: "pendiente_pago_50",
    label: "Pendiente pago 50%",
    description: "Se requiere el pago del 50% para iniciar trabajos",
    highlight: true,
    dateField: "fecha_pendiente_pago_50",
  },
  {
    key: "iniciar_trabajos",
    label: "Iniciar trabajos adicional",
    description: "Inicio de trabajos del adicional",
    dateField: "fecha_iniciar_trabajos",
  },
  {
    key: "revision_final",
    label: "Revisión final adicional",
    description: "Inspección y revisión de trabajos",
    dateField: "fecha_revision_final",
  },
  {
    key: "entregado",
    label: "Entregado",
    description: "Adicional completado y entregado",
    dateField: "fecha_entregado",
  },
];

export default function VerAdicionalPage() {
  const params = useParams();
  const token = params.token as string;

  const [adicional, setAdicional] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      cargarAdicional();
    }
  }, [token]);

  async function cargarAdicional() {
    try {
      const { data: compartido, error: errorToken } = await supabase
        .from("adicionales_compartidos")
        .select("adicional_id, expires_at, visto")
        .eq("token", token)
        .single();

      if (errorToken || !compartido) {
        setError("Link inválido o expirado");
        setLoading(false);
        return;
      }

      const expira = new Date(compartido.expires_at);
      if (expira < new Date()) {
        setError("Este link ha expirado. Solicita uno nuevo a tu residente.");
        setLoading(false);
        return;
      }

      if (!compartido.visto) {
        await supabase
          .from("adicionales_compartidos")
          .update({
            visto: true,
            visto_at: new Date().toISOString(),
          } as any)
          .eq("token", token);
      }

      const { data: adicionalData, error: errorAdicional } = await supabase
        .from("adicionales")
        .select(
          `
          *,
          proyecto:proyectos_maestro(cliente_nombre)
        `,
        )
        .eq("id", compartido.adicional_id)
        .single();

      if (errorAdicional) throw errorAdicional;

      setAdicional(adicionalData);
    } catch (err) {
      console.error("Error:", err);
      setError("Error al cargar el adicional");
    } finally {
      setLoading(false);
    }
  }

  function getStepIndex(estado: string): number {
    return STEPS.findIndex((s) => s.key === estado);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-r-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
        <div className="max-w-md text-center">
          <div className="mb-4 inline-block rounded-full bg-red-100 p-4">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {error.includes("expirado") ? "Link Expirado" : "Error"}
          </h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!adicional) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Adicional no encontrado
          </h1>
        </div>
      </div>
    );
  }

  const currentStepIndex = getStepIndex(adicional.estado);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-block rounded-full bg-white p-4 shadow-lg">
            <Building2 className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Constructora Colombia
          </h1>
          <p className="text-gray-600">Diseño, remodelaciones y construcción</p>
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
            <h2 className="mb-2 text-2xl font-bold">Adicional de Obra</h2>
            <p className="text-blue-100">{adicional.proyecto?.cliente_nombre}</p>
          </div>

          <div className="p-8">
            <div className="mb-8">
              <h3 className="mb-4 text-xl font-semibold text-gray-900">
                {adicional.descripcion}
              </h3>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Valor del adicional</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {new Intl.NumberFormat("es-CO", {
                        style: "currency",
                        currency: "COP",
                        minimumFractionDigits: 0,
                      }).format(adicional.monto)}
                    </p>
                  </div>
                </div>

                {adicional.fecha_solicitud && (
                  <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
                    <Calendar className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Fecha de solicitud</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(adicional.fecha_solicitud).toLocaleDateString(
                          "es-CO",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {currentStepIndex === 2 && (
              <div className="mb-8 rounded-xl border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-orange-100 p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-orange-500 p-2">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="mb-2 text-lg font-bold text-orange-900">
                      Se requiere pago del 50% para continuar
                    </h4>
                    <p className="mb-3 text-orange-800">
                      Para iniciar los trabajos del adicional, es necesario
                      realizar el pago del 50% del valor total.
                    </p>
                    <div className="inline-block rounded-lg bg-white p-4">
                      <p className="mb-1 text-sm text-gray-600">
                        Monto a pagar (50%)
                      </p>
                      <p className="text-2xl font-bold text-orange-600">
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: "COP",
                          minimumFractionDigits: 0,
                        }).format(adicional.monto * 0.5)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-6 text-lg font-semibold text-gray-900">
                Proceso del adicional
              </h3>

              <div className="space-y-4">
                {STEPS.map((step, idx) => {
                  const isCompleted = currentStepIndex > idx;
                  const isCurrent = currentStepIndex === idx;
                  const stepDate = adicional[step.dateField];

                  return (
                    <div key={step.key} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
                            isCompleted
                              ? "bg-green-500 text-white"
                              : isCurrent
                                ? "bg-blue-500 text-white ring-4 ring-blue-200"
                                : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-7 w-7" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        {idx < STEPS.length - 1 && (
                          <div
                            className={`h-16 w-1 ${
                              isCompleted ? "bg-green-500" : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>

                      <div
                        className={`flex-1 pb-4 ${
                          step.highlight && isCurrent
                            ? "-ml-2 rounded-lg border-l-4 border-orange-500 bg-orange-50 p-4"
                            : ""
                        }`}
                      >
                        <h4
                          className={`text-lg font-semibold ${
                            isCompleted
                              ? "text-gray-900"
                              : isCurrent
                                ? "text-blue-600"
                                : "text-gray-400"
                          }`}
                        >
                          {step.label}
                          {isCurrent && (
                            <span className="ml-2 rounded-full bg-blue-500 px-3 py-1 text-xs text-white">
                              Paso actual
                            </span>
                          )}
                        </h4>
                        <p
                          className={`mt-1 text-sm ${
                            isCompleted || isCurrent
                              ? "text-gray-600"
                              : "text-gray-400"
                          }`}
                        >
                          {step.description}
                        </p>

                        {isCompleted && stepDate && (
                          <p className="mt-2 text-xs text-gray-500">
                            ✓ Completado el{" "}
                            {new Date(stepDate).toLocaleDateString("es-CO", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-600">
          <p className="mb-2">
            Si tienes preguntas, contacta a tu residente de obra.
          </p>
          <p className="text-xs text-gray-500">Constructora Colombia © 2026</p>
        </div>
      </div>
    </div>
  );
}
