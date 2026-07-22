"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { X, Link2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProyectoCombobox, type Proyecto } from "@/components/proyecto-combobox";
import { BITACORA_BUCKET, pathFromPublicUrl, type Foto, type EntradaBase } from "@/lib/bitacora-types";

// Modal de alta/edición de un avance (bitacora_entradas). Se usa tanto desde
// /bitacora (selector de proyecto visible, vía `proyectos`/`proyectoIdInicial`)
// como desde el detalle de un proyecto (proyecto fijo, vía `proyectoFijo`) —
// misma tabla, mismo formulario, no dos implementaciones distintas.

export function AvanceModal({
  proyectos,
  proyectoIdInicial,
  proyectoFijo,
  entrada,
  onClose,
  onSaved,
}: {
  proyectos?: Proyecto[];
  proyectoIdInicial?: string;
  proyectoFijo?: { id: string; nombre?: string };
  entrada: EntradaBase | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = getSupabaseClient();
  const [proyectoId, setProyectoId] = useState(
    entrada?.proyecto_id ?? proyectoFijo?.id ?? proyectoIdInicial ?? ""
  );
  const [titulo, setTitulo] = useState(entrada?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(entrada?.descripcion ?? "");
  const [videoUrl, setVideoUrl] = useState(entrada?.video_url ?? "");
  const [fotosExistentes, setFotosExistentes] = useState<Foto[]>(entrada?.fotos ?? []);
  const [fotosNuevas, setFotosNuevas] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  async function eliminarFotoExistente(foto: Foto) {
    const path = pathFromPublicUrl(foto.foto_url);
    if (path) await supabase.storage.from(BITACORA_BUCKET).remove([path]);
    await supabase.from("bitacora_fotos").delete().eq("id", foto.id);
    setFotosExistentes((prev) => prev.filter((f) => f.id !== foto.id));
  }

  function agregarFotosNuevas(files: FileList | null) {
    if (!files) return;
    setFotosNuevas((prev) => [...prev, ...Array.from(files)]);
  }

  function quitarFotoNueva(idx: number) {
    setFotosNuevas((prev) => prev.filter((_, i) => i !== idx));
  }

  async function subirFotos(entradaId: string, ordenInicial: number) {
    let orden = ordenInicial;
    for (const file of fotosNuevas) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `bitacora/${entradaId}/${Date.now()}-${orden}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(BITACORA_BUCKET).upload(path, file, { upsert: true });
      if (uploadError) {
        console.error("Error subiendo foto:", uploadError);
        continue;
      }
      const { data: urlData } = supabase.storage.from(BITACORA_BUCKET).getPublicUrl(path);
      await supabase.from("bitacora_fotos").insert({
        entrada_id: entradaId,
        foto_url: urlData.publicUrl,
        orden,
      });
      orden++;
    }
  }

  async function guardar() {
    if (!titulo.trim() || !proyectoId) return;
    setSaving(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        video_url: videoUrl.trim() || null,
      };

      if (entrada) {
        const { error } = await supabase
          .from("bitacora_entradas")
          .update({ ...payload, proyecto_id: proyectoId })
          .eq("id", entrada.id);
        if (error) throw error;
        await subirFotos(entrada.id, fotosExistentes.length);
      } else {
        const { data: creada, error } = await supabase
          .from("bitacora_entradas")
          .insert({ ...payload, proyecto_id: proyectoId })
          .select()
          .single();
        if (error || !creada) throw error ?? new Error("No se pudo crear el avance");
        await subirFotos(creada.id, 0);
      }

      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "desconocido";
      alert("Error: " + message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-6 sm:pb-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {entrada ? "Editar avance" : "Nuevo avance"}
          </h2>
          <button
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-lg text-gray-400 active:bg-gray-100 sm:size-8 sm:hover:text-gray-600"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          {proyectoFijo ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Proyecto</label>
              <div className="flex h-11 w-full items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
                {proyectoFijo.nombre || "Este proyecto"}
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Proyecto <span className="text-red-500">*</span>
              </label>
              <ProyectoCombobox
                value={proyectoId}
                onChange={setProyectoId}
                proyectos={proyectos ?? []}
                placeholder="Selecciona un proyecto"
                className="w-full"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="ej. Instalación de drywall - Apto 302"
              className="h-11 w-full rounded-lg border border-gray-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalles del avance..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Link2 className="size-3.5" /> Link de video (opcional)
            </label>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://drive.google.com/... o YouTube"
              className="h-11 w-full rounded-lg border border-gray-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Fotos</label>

            {(fotosExistentes.length > 0 || fotosNuevas.length > 0) && (
              <div className="mb-2 grid grid-cols-4 gap-1.5">
                {fotosExistentes.map((foto) => (
                  <div key={foto.id} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={foto.foto_url} alt="" className="aspect-square w-full rounded-lg object-cover" />
                    <button
                      onClick={() => void eliminarFotoExistente(foto)}
                      className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-red-500 text-white shadow"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                {fotosNuevas.map((file, i) => (
                  <div key={i} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(file)} alt="" className="aspect-square w-full rounded-lg object-cover" />
                    <button
                      onClick={() => quitarFotoNueva(i)}
                      className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-red-500 text-white shadow"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50">
              <ImagePlus className="size-4" />
              Agregar fotos
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={(e) => agregarFotosNuevas(e.target.files)}
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} className="h-12 w-full sm:h-9 sm:w-auto">
            Cancelar
          </Button>
          <Button
            onClick={() => void guardar()}
            disabled={saving || !titulo.trim() || !proyectoId}
            className="h-12 w-full sm:h-9 sm:w-auto"
          >
            {saving ? "Guardando..." : entrada ? "Guardar cambios" : "Publicar avance"}
          </Button>
        </div>
      </div>
    </div>
  );
}
