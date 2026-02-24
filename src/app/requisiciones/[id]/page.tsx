// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Building2,
  Home,
  Tag,
  Package,
  User,
  Calendar,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Requisicion {
  id: string;
  proyecto_id: string;
  apartamento: string;
  tipo_material: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  estado: string;
  urgencia: string | null;
  solicitado_por: string | null;
  aprobado_por: string | null;
  notas: string | null;
  fecha_solicitada: string | null;
  fecha_por_aprobar: string | null;
  fecha_en_compras: string | null;
  fecha_recepcion_obra: string | null;
  fecha_asignado_proyecto: string | null;
  created_at: string;
}

const STEPS = [
  {
    key: "solicitada",
    label: "Solicitada",
    description: "Requisición creada",
    dateField: "fecha_solicitada",
  },
  {
    key: "por_aprobar",
    label: "Por Aprobar",
    description: "Pendiente de aprobación",
    dateField: "fecha_por_aprobar",
  },
  {
    key: "en_compras",
    label: "En Compras",
    description: "En proceso de compra",
    dateField: "fecha_en_compras",
  },
  {
    key: "recepcion_obra",
    label: "Recepción por obra",
    description: "Materiales en obra",
    dateField: "fecha_recepcion_obra",
  },
  {
    key: "asignado_proyecto",
    label: "Asignado a proyecto",
    description: "Completado",
    dateField: "fecha_asignado_proyecto",
  },
];

const STEP_KEYS = STEPS.map((s) => s.key);

function getStepIndex(estado: string): number {
  const idx = STEP_KEYS.indexOf(estado);
  return idx >= 0 ? idx : 0;
}

const urgenciaColors: Record<string, string> = {
  baja: "bg-gray-100 text-gray-700",
  normal: "bg-blue-100 text-blue-700",
  alta: "bg-red-100 text-red-700",
};

export default function RequisicionDetailPage() {
  const supabase = getSupabaseClient();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [requisicion, setRequisicion] = useState<Requisicion | null>(null);
  const [proyectoNombre, setProyectoNombre] = useState<string>("—");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [editando, setEditando] = useState(false);
  const [formEdit, setFormEdit] = useState({
    descripcion: "",
    urgencia: "normal",
    cantidad: "",
    unidad: "",
    notas: "",
  });
  const [items, setItems] = useState<any[]>([]);
  const [nuevoItem, setNuevoItem] = useState({
    descripcion: "",
    cantidad: "",
    unidad: "",
  });
  const [agregandoItem, setAgregandoItem] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("requisiciones")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) {
        const r = data as Record<string, unknown>;
        const req: Requisicion = {
          id: r.id as string,
          proyecto_id: r.proyecto_id as string,
          apartamento: r.apartamento as string,
          tipo_material: (r.tipo_material as string) ?? "Otros",
          descripcion: r.descripcion as string,
          cantidad: Number(r.cantidad) || 0,
          unidad: (r.unidad as string) ?? "und",
          estado: (r.estado as string) ?? "solicitada",
          urgencia: (r.urgencia as string) ?? null,
          solicitado_por: (r.solicitado_por as string) ?? null,
          aprobado_por: (r.aprobado_por as string) ?? null,
          notas: (r.notas as string) ?? null,
          fecha_solicitada: (r.fecha_solicitada as string) ?? null,
          fecha_por_aprobar: (r.fecha_por_aprobar as string) ?? null,
          fecha_en_compras: (r.fecha_en_compras as string) ?? null,
          fecha_recepcion_obra: (r.fecha_recepcion_obra as string) ?? null,
          fecha_asignado_proyecto: (r.fecha_asignado_proyecto as string) ?? null,
          created_at: (r.created_at as string) ?? "",
        };
        setRequisicion(req);

        const { data: proj } = await supabase
          .from("proyectos_maestro")
          .select("cliente_nombre")
          .eq("id", req.proyecto_id)
          .single();
        if (proj)
          setProyectoNombre(
            ((proj as Record<string, unknown>).cliente_nombre as string) ?? "—"
          );
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  useEffect(() => {
    if (requisicion) {
      cargarItems();
      setFormEdit({
        descripcion: requisicion.descripcion || "",
        urgencia: requisicion.urgencia || "normal",
        cantidad: requisicion.cantidad?.toString() || "",
        unidad: requisicion.unidad || "",
        notas: requisicion.notas || "",
      });
    }
  }, [requisicion]);

  async function cargarItems() {
    if (!requisicion) return;
    try {
      const { data, error } = await supabase
        .from("requisicion_items")
        .select("*")
        .eq("requisicion_id", requisicion.id)
        .order("orden", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error cargando items:", err);
    }
  }

  async function agregarItem() {
    if (!requisicion) return;
    if (!nuevoItem.descripcion.trim()) {
      alert("Escribe una descripción del item");
      return;
    }

    setAgregandoItem(true);
    try {
      const { error } = await supabase.from("requisicion_items").insert({
        requisicion_id: requisicion.id,
        descripcion: nuevoItem.descripcion,
        cantidad: nuevoItem.cantidad ? Number(nuevoItem.cantidad) : null,
        unidad: nuevoItem.unidad || null,
        orden: items.length,
      } as any);

      if (error) throw error;

      setNuevoItem({ descripcion: "", cantidad: "", unidad: "" });
      await cargarItems();
    } catch (err) {
      console.error("Error:", err);
      alert("Error al agregar item");
    } finally {
      setAgregandoItem(false);
    }
  }

  async function toggleCheckbox(
    itemId: string,
    campo: "comprado" | "recibido",
    valorActual: boolean,
  ) {
    try {
      const { error } = await supabase
        .from("requisicion_items")
        .update({ [campo]: !valorActual } as any)
        .eq("id", itemId);

      if (error) throw error;

      await cargarItems();
    } catch (err) {
      console.error("Error:", err);
      alert("Error al actualizar");
    }
  }

  async function eliminarItem(itemId: string) {
    if (!confirm("¿Eliminar este item?")) return;

    try {
      const { error } = await supabase
        .from("requisicion_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      await cargarItems();
    } catch (err) {
      console.error("Error:", err);
      alert("Error al eliminar");
    }
  }

  async function guardarCambios() {
    if (!requisicion) return;

    setActing(true);
    try {
      const { error } = await supabase
        .from("requisiciones")
        .update({
          descripcion: formEdit.descripcion,
          urgencia: formEdit.urgencia,
          cantidad: formEdit.cantidad ? Number(formEdit.cantidad) : null,
          unidad: formEdit.unidad || null,
          notas: formEdit.notas || null,
        } as any)
        .eq("id", requisicion.id);

      if (error) throw error;

      await fetchData();
      setEditando(false);
    } catch (err) {
      console.error("Error:", err);
      alert("Error al guardar cambios");
    } finally {
      setActing(false);
    }
  }

  async function eliminarRequisicion() {
    if (!requisicion) return;
    if (!confirm("¿Estás seguro de eliminar esta requisición? Esta acción no se puede deshacer.")) return;

    try {
      const { error } = await supabase
        .from("requisiciones")
        .delete()
        .eq("id", requisicion.id);

      if (error) throw error;
      router.push("/requisiciones");
    } catch (err) {
      console.error("Error:", err);
      alert("Error al eliminar requisición");
    }
  }

  async function avanzarPaso() {
    if (!requisicion) return;

    const currentIdx = getStepIndex(requisicion.estado);

    if (currentIdx + 1 >= STEPS.length) {
      alert("La requisición ya está completada");
      return;
    }

    const nextStep = STEPS[currentIdx + 1];
    setActing(true);

    try {
      const update: any = {
        estado: nextStep.key,
        [nextStep.dateField]: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("requisiciones")
        .update(update as any)
        .eq("id", requisicion.id);

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error("Error:", err);
      alert("Error al avanzar paso");
    } finally {
      setActing(false);
    }
  }

  async function retrocederPaso(targetIdx: number) {
    if (!requisicion) return;

    if (targetIdx === 0) {
      alert("No se puede retroceder más");
      return;
    }

    const previousStep = STEPS[targetIdx - 1];
    setActing(true);

    try {
      const update: any = {
        estado: previousStep.key,
        [STEPS[targetIdx].dateField]: null,
      };

      const { error } = await supabase
        .from("requisiciones")
        .update(update as any)
        .eq("id", requisicion.id);

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error("Error:", err);
      alert("Error al retroceder paso");
    } finally {
      setActing(false);
    }
  }

  function fmtDate(date: string | null): string {
    if (!date) return "";
    try {
      return format(new Date(date), "d MMM yyyy, HH:mm", { locale: es });
    } catch {
      return date;
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  if (!requisicion) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8">
        <p className="text-[#86868B]">Requisición no encontrada</p>
        <Button variant="outline" asChild>
          <Link href="/requisiciones">Volver</Link>
        </Button>
      </div>
    );
  }

  const currentStepIndex = getStepIndex(requisicion.estado);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-[#86868B] hover:bg-[#F5F5F7]"
              asChild
            >
              <Link href="/requisiciones">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <h1 className="truncate text-lg font-semibold tracking-tight text-[#1D1D1F]">
              Detalle Requisición
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (editando) {
                  setEditando(false);
                  if (requisicion) {
                    setFormEdit({
                      descripcion: requisicion.descripcion || "",
                      urgencia: requisicion.urgencia || "normal",
                      cantidad: requisicion.cantidad?.toString() || "",
                      unidad: requisicion.unidad || "",
                      notas: requisicion.notas || "",
                    });
                  }
                } else {
                  setEditando(true);
                }
              }}
              className={cn(
                "rounded-lg text-[13px]",
                editando
                  ? "text-[#86868B] hover:bg-[#F5F5F7]"
                  : "text-[#007AFF] hover:bg-[#007AFF]/5"
              )}
            >
              {editando ? (
                <>
                  <X className="size-3.5" />
                  Cancelar
                </>
              ) : (
                <>
                  <Pencil className="size-3.5" />
                  Editar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={eliminarRequisicion}
              className="rounded-lg text-[13px] text-[#FF3B30] hover:bg-[#FF3B30]/5"
            >
              <Trash2 className="size-3.5" />
              Eliminar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-8 py-8">
        <div className="rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Información</h2>
            {editando && (
              <Button
                onClick={guardarCambios}
                disabled={acting}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {acting ? "Guardando..." : "Guardar"}
              </Button>
            )}
          </div>

          {editando ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Descripción *
                </label>
                <textarea
                  value={formEdit.descripcion}
                  onChange={(e) =>
                    setFormEdit({ ...formEdit, descripcion: e.target.value })
                  }
                  className="w-full rounded-lg border px-3 py-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Urgencia
                </label>
                <select
                  value={formEdit.urgencia}
                  onChange={(e) =>
                    setFormEdit({ ...formEdit, urgencia: e.target.value as any })
                  }
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="baja">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notas generales
                </label>
                <textarea
                  value={formEdit.notas}
                  onChange={(e) =>
                    setFormEdit({ ...formEdit, notas: e.target.value })
                  }
                  className="w-full rounded-lg border px-3 py-2"
                  rows={2}
                  placeholder="Observaciones adicionales sobre la requisición..."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Descripción</span>
                <p className="font-medium">{requisicion.descripcion}</p>
              </div>

              <div>
                <span className="text-sm text-gray-600">Urgencia</span>
                <p>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                      urgenciaColors[requisicion.urgencia || "normal"]
                    }`}
                  >
                    {(requisicion.urgencia || "normal")
                      .charAt(0)
                      .toUpperCase() + (requisicion.urgencia || "normal").slice(1)}
                  </span>
                </p>
              </div>

              {requisicion.notas && (
                <div>
                  <span className="text-sm text-gray-600">Notas</span>
                  <p className="text-sm">{requisicion.notas}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Items de la requisición - SIEMPRE VISIBLE */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">Items de la requisición</h3>

          {/* Formulario para agregar item */}
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <h4 className="mb-3 text-sm font-medium text-gray-700">
              Agregar nuevo item
            </h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-6">
                <input
                  value={nuevoItem.descripcion}
                  onChange={(e) =>
                    setNuevoItem({ ...nuevoItem, descripcion: e.target.value })
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Descripción del item *"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !agregandoItem) {
                      agregarItem();
                    }
                  }}
                />
              </div>
              <div className="md:col-span-2">
                <input
                  type="number"
                  value={nuevoItem.cantidad}
                  onChange={(e) =>
                    setNuevoItem({ ...nuevoItem, cantidad: e.target.value })
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Cantidad"
                />
              </div>
              <div className="md:col-span-2">
                <input
                  value={nuevoItem.unidad}
                  onChange={(e) =>
                    setNuevoItem({ ...nuevoItem, unidad: e.target.value })
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Unidad"
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  onClick={agregarItem}
                  disabled={agregandoItem || !nuevoItem.descripcion.trim()}
                  className="w-full bg-blue-500 hover:bg-blue-600"
                >
                  {agregandoItem ? "..." : "Agregar"}
                </Button>
              </div>
            </div>
          </div>

          {/* Lista de items */}
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No hay items registrados. Agrega el primer item arriba.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 border-b pb-2 text-xs font-medium text-gray-600">
                <div className="col-span-5">Descripción</div>
                <div className="col-span-2 text-center">Cantidad</div>
                <div className="col-span-2 text-center">Comprado</div>
                <div className="col-span-2 text-center">Recibido</div>
                <div className="col-span-1"></div>
              </div>

              {/* Items */}
              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 items-center gap-2 border-b py-3 hover:bg-gray-50"
                >
                  <div className="col-span-5">
                    <p className="font-medium text-gray-900">{item.descripcion}</p>
                  </div>

                  <div className="col-span-2 text-center text-sm text-gray-600">
                    {item.cantidad && (
                      <span>
                        {item.cantidad} {item.unidad || ""}
                      </span>
                    )}
                  </div>

                  <div className="col-span-2 flex justify-center">
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={item.comprado}
                        onChange={() =>
                          toggleCheckbox(item.id, "comprado", item.comprado)
                        }
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300" />
                    </label>
                  </div>

                  <div className="col-span-2 flex justify-center">
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={item.recibido}
                        onChange={() =>
                          toggleCheckbox(item.id, "recibido", item.recibido)
                        }
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300" />
                    </label>
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => eliminarItem(item.id)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Estadísticas */}
          {items.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{items.length}</p>
                <p className="text-xs text-gray-600">Total items</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {items.filter((i) => i.comprado).length}
                </p>
                <p className="text-xs text-gray-600">Comprados</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {items.filter((i) => i.recibido).length}
                </p>
                <p className="text-xs text-gray-600">Recibidos</p>
              </div>
            </div>
          )}
        </div>

        {/* Timeline with checkboxes */}
        <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6">
          <h3 className="mb-6 text-[14px] font-semibold text-[#1D1D1F]">
            Flujo de requisición
          </h3>

          <div className="space-y-2">
            {STEPS.map((step, idx) => {
              const isCompleted = currentStepIndex > idx;
              const isCurrent = currentStepIndex === idx;
              const canCheck = isCurrent;
              const stepDate =
                requisicion[step.dateField as keyof Requisicion] as
                  | string
                  | null;

              return (
                <div key={step.key} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <label className="relative cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        disabled={acting}
                        onChange={async () => {
                          if (acting) return;
                          if (isCompleted) {
                            await retrocederPaso(idx);
                          } else if (canCheck) {
                            await avanzarPaso();
                          }
                        }}
                        className="peer sr-only"
                      />
                      <div
                        className={cn(
                          "flex size-6 items-center justify-center rounded border-2 transition-all",
                          isCompleted
                            ? "cursor-pointer border-[#007AFF] bg-[#007AFF] hover:bg-[#0051D5]"
                            : canCheck
                              ? "cursor-pointer border-[#007AFF] hover:bg-[#007AFF]/5"
                              : "cursor-not-allowed border-[#D2D2D7] bg-[#F5F5F7]"
                        )}
                      >
                        {isCompleted && (
                          <svg
                            className="size-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </label>
                    {idx < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "mt-2 h-12 w-0.5 transition-colors",
                          isCompleted ? "bg-[#007AFF]" : "bg-[#D2D2D7]"
                        )}
                      />
                    )}
                  </div>

                  <div className="flex-1 pb-2">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          isCompleted
                            ? "bg-[#007AFF] text-white"
                            : isCurrent
                              ? "border-2 border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]"
                              : "bg-[#F5F5F7] text-[#86868B]"
                        )}
                      >
                        {idx + 1}
                      </span>
                      <h4
                        className={cn(
                          "font-semibold",
                          isCompleted
                            ? "text-[#1D1D1F]"
                            : isCurrent
                              ? "text-[#007AFF]"
                              : "text-[#86868B]"
                        )}
                      >
                        {step.label}
                      </h4>
                    </div>

                    <p
                      className={cn(
                        "ml-8 mt-1 text-sm",
                        isCompleted || isCurrent
                          ? "text-[#86868B]"
                          : "text-[#C7C7CC]"
                      )}
                    >
                      {step.description}
                    </p>

                    {stepDate && (
                      <p className="ml-8 mt-1 text-xs text-[#86868B]">
                        {new Date(stepDate).toLocaleString("es-CO", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}

                    {isCurrent && !acting && (
                      <p className="ml-8 mt-1 text-xs font-medium text-[#007AFF]">
                        ← Marca la casilla para avanzar
                      </p>
                    )}

                    {acting && isCurrent && (
                      <div className="ml-8 mt-2 flex items-center gap-2 text-[#007AFF]">
                        <div className="size-3 animate-spin rounded-full border-2 border-[#007AFF] border-t-transparent" />
                        <span className="text-xs">Procesando...</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {currentStepIndex >= STEPS.length - 1 && (
          <div className="rounded-2xl border border-[#34C759]/30 bg-[#34C759]/5 p-5 text-center">
            <CheckCircle2 className="mx-auto size-8 text-[#34C759]" />
            <p className="mt-2 text-[14px] font-medium text-[#34C759]">
              Requisición completada — Asignada a proyecto
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
