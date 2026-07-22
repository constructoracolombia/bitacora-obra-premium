"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { Plus, Pencil, Trash2, Calendar, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvanceModal } from "@/components/AvanceModal";
import { BITACORA_BUCKET, pathFromPublicUrl, type Foto, type EntradaBase } from "@/lib/bitacora-types";

// Feed de avances de UN proyecto — lee directamente bitacora_entradas por
// proyecto_id. Es la misma tabla que usa /bitacora: lo que se registra aquí
// aparece allá y viceversa, no dos historiales paralelos.

export function AvancesFeed({
  proyectoId,
  proyectoNombre,
}: {
  proyectoId: string;
  proyectoNombre?: string;
}) {
  const supabase = getSupabaseClient();
  const [entradas, setEntradas] = useState<EntradaBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<EntradaBase | null>(null);

  useEffect(() => {
    if (proyectoId) void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectoId]);

  async function cargar() {
    setLoading(true);
    const { data } = await supabase
      .from("bitacora_entradas")
      .select("id, proyecto_id, fecha, titulo, descripcion, video_url, bitacora_fotos(id, foto_url, orden)")
      .eq("proyecto_id", proyectoId)
      .order("fecha", { ascending: false });

    if (data) {
      setEntradas(
        (data as Array<Omit<EntradaBase, "fotos"> & { bitacora_fotos: Foto[] }>).map((e) => ({
          id: e.id,
          proyecto_id: e.proyecto_id,
          fecha: e.fecha,
          titulo: e.titulo,
          descripcion: e.descripcion,
          video_url: e.video_url,
          fotos: [...(e.bitacora_fotos ?? [])].sort((a, b) => a.orden - b.orden),
        }))
      );
    }
    setLoading(false);
  }

  async function eliminar(entrada: EntradaBase) {
    if (!window.confirm(`¿Eliminar el avance "${entrada.titulo}"?`)) return;
    if (entrada.fotos.length > 0) {
      const paths = entrada.fotos.map((f) => pathFromPublicUrl(f.foto_url)).filter(Boolean) as string[];
      if (paths.length > 0) await supabase.storage.from(BITACORA_BUCKET).remove(paths);
    }
    const { error } = await supabase.from("bitacora_entradas").delete().eq("id", entrada.id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    setEntradas((prev) => prev.filter((e) => e.id !== entrada.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditando(null);
            setMostrarForm(true);
          }}
          className="h-11 rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5] sm:h-9"
        >
          <Plus className="size-4 mr-1" />
          Nuevo avance
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-sm text-gray-400">Cargando...</div>
      ) : entradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D2D2D7] bg-white py-12 text-center text-sm text-gray-400">
          Sin avances registrados. Agrega el primero con el botón de arriba.
        </div>
      ) : (
        <div className="space-y-4">
          {entradas.map((entrada) => (
            <div key={entrada.id} className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-4 sm:p-5">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="size-3.5" />
                  {new Date(entrada.fecha).toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <div className="flex shrink-0 items-center">
                  <button
                    onClick={() => {
                      setEditando(entrada);
                      setMostrarForm(true);
                    }}
                    title="Editar"
                    className="flex size-8 items-center justify-center rounded-lg text-gray-300 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => void eliminar(entrada)}
                    title="Eliminar"
                    className="flex size-8 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="mb-1.5 text-base font-semibold text-gray-900">{entrada.titulo}</h3>

              {entrada.descripcion && (
                <p className="mb-3 whitespace-pre-wrap text-sm text-gray-600">{entrada.descripcion}</p>
              )}

              {entrada.fotos.length > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {entrada.fotos.map((foto) => (
                    <a key={foto.id} href={foto.foto_url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={foto.foto_url}
                        alt={entrada.titulo}
                        className="aspect-square w-full rounded-lg object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}

              {entrada.video_url && (
                <a
                  href={entrada.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                >
                  <PlayCircle className="size-4" />
                  Ver video
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {mostrarForm && (
        <AvanceModal
          proyectoFijo={{ id: proyectoId, nombre: proyectoNombre }}
          entrada={editando}
          onClose={() => setMostrarForm(false)}
          onSaved={async () => {
            setMostrarForm(false);
            await cargar();
          }}
        />
      )}
    </div>
  );
}
