"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Save, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ImageLightbox } from "@/components/proyecto/ImageLightbox";

interface BitacoraEntry {
  id: string;
  fecha: string;
  novedades: string | null;
  personal_count: number;
  oficiales_count?: number;
  ayudantes_count?: number;
  fotos_url: string[];
  fotos_manana?: string[];
  fotos_tarde?: string[];
  novedad_tipo?: string | null;
}

interface BitacoraDayCardProps {
  entry: BitacoraEntry | null;
  fecha: string;
  proyectoId: string;
  proyectoNombre: string;
  onSave: (data: Partial<BitacoraEntry>) => Promise<void>;
}

const NOVEDAD_TIPOS = [
  { value: "", label: "Sin tipo" },
  { value: "clima", label: "Clima" },
  { value: "retrasos", label: "Retrasos" },
  { value: "imprevistos", label: "Imprevistos" },
];

export function BitacoraDayCard({
  entry,
  fecha,
  proyectoId,
  proyectoNombre,
  onSave,
}: BitacoraDayCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<{ open: boolean; src: string }>({
    open: false,
    src: "",
  });

  const [form, setForm] = useState({
    novedades: entry?.novedades ?? "",
    oficiales: entry?.oficiales_count ?? 0,
    ayudantes: entry?.ayudantes_count ?? 0,
    novedad_tipo: entry?.novedad_tipo ?? "",
    fotos_manana: (entry?.fotos_manana ?? entry?.fotos_url ?? []) as string[],
    fotos_tarde: (entry?.fotos_tarde ?? []) as string[],
  });

  useEffect(() => {
    if (entry) {
      setForm({
        novedades: entry.novedades ?? "",
        oficiales: entry.oficiales_count ?? 0,
        ayudantes: entry.ayudantes_count ?? 0,
        novedad_tipo: entry.novedad_tipo ?? "",
        fotos_manana: (entry.fotos_manana ?? entry.fotos_url ?? []) as string[],
        fotos_tarde: (entry.fotos_tarde ?? []) as string[],
      });
    }
  }, [entry]);

  const fotosManana = form.fotos_manana;
  const fotosTarde = form.fotos_tarde;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        novedades: form.novedades || null,
        oficiales_count: form.oficiales,
        ayudantes_count: form.ayudantes,
        personal_count: form.oficiales + form.ayudantes,
        novedad_tipo: form.novedad_tipo || null,
        fotos_manana: fotosManana,
        fotos_tarde: fotosTarde,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative flex gap-4">
      {/* Línea vertical */}
      <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-blue-200" />

      {/* Punto del timeline */}
      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-blue-500 bg-background">
        <div className="h-2 w-2 rounded-full bg-blue-500" />
      </div>

      {/* Card expandible */}
      <div className="min-w-0 flex-1 pb-6">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-gray-300"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-[#2D3748]">
                {format(new Date(fecha), "EEEE d 'de' MMMM, yyyy", {
                  locale: es,
                })}
              </h3>
              {entry?.novedades && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {entry.novedades}
                </p>
              )}
            </div>
            {expanded ? (
              <ChevronUp className="size-5 shrink-0 text-blue-600" />
            ) : (
              <ChevronDown className="size-5 shrink-0 text-blue-600" />
            )}
          </div>
        </button>

        {expanded && (
          <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Novedades del Día</Label>
                <textarea
                  value={form.novedades}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, novedades: e.target.value }))
                  }
                  placeholder="Describe las novedades del día..."
                  className="min-h-[100px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de novedad</Label>
                <select
                  value={form.novedad_tipo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, novedad_tipo: e.target.value }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {NOVEDAD_TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Oficiales</Label>
                  <input
                    type="number"
                    min="0"
                    value={form.oficiales}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        oficiales: Math.max(0, parseInt(e.target.value) || 0),
                      }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ayudantes</Label>
                  <input
                    type="number"
                    min="0"
                    value={form.ayudantes}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        ayudantes: Math.max(
                          0,
                          parseInt(e.target.value) || 0
                        ),
                      }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Galería Mañana */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="text-blue-600">Mañana</span>
                  <span className="text-xs text-muted-foreground">
                    (antes 12pm)
                  </span>
                </Label>
                <FotoGrid
                  fotos={fotosManana}
                  proyectoId={proyectoId}
                  fecha={fecha}
                  periodo="manana"
                  onAdd={(url) =>
                    setForm((f) => ({
                      ...f,
                      fotos_manana: [...f.fotos_manana, url],
                    }))
                  }
                  onRemove={(idx) =>
                    setForm((f) => ({
                      ...f,
                      fotos_manana: f.fotos_manana.filter((_, i) => i !== idx),
                    }))
                  }
                  onPreview={(src) => setLightbox({ open: true, src })}
                />
              </div>

              {/* Galería Tarde */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="text-blue-600">Tarde</span>
                  <span className="text-xs text-muted-foreground">
                    (después 12pm)
                  </span>
                </Label>
                <FotoGrid
                  fotos={fotosTarde}
                  proyectoId={proyectoId}
                  fecha={fecha}
                  periodo="tarde"
                  onAdd={(url) =>
                    setForm((f) => ({
                      ...f,
                      fotos_tarde: [...f.fotos_tarde, url],
                    }))
                  }
                  onRemove={(idx) =>
                    setForm((f) => ({
                      ...f,
                      fotos_tarde: f.fotos_tarde.filter((_, i) => i !== idx),
                    }))
                  }
                  onPreview={(src) => setLightbox({ open: true, src })}
                />
              </div>

              <Button
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Guardar Entrada
              </Button>
            </div>
          </div>
        )}
      </div>

      <ImageLightbox
        open={lightbox.open}
        onOpenChange={(open) => setLightbox((prev) => ({ ...prev, open }))}
        src={lightbox.src}
      />
    </div>
  );
}

interface FotoGridProps {
  fotos: string[];
  proyectoId: string;
  fecha: string;
  periodo: "manana" | "tarde";
  onAdd: (url: string) => void;
  onRemove: (idx: number) => void;
  onPreview: (src: string) => void;
}

function FotoGrid({
  fotos,
  proyectoId,
  fecha,
  periodo,
  onAdd,
  onRemove,
  onPreview,
}: FotoGridProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !proyectoId) return;

    setUploading(true);
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const supabase = getSupabase();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${proyectoId}/bitacora/${fecha}/${periodo}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("proyecto-evidencias")
        .upload(path, file, { upsert: false });

      if (error) throw error;

      const { data } = supabase.storage
        .from("proyecto-evidencias")
        .getPublicUrl(path);

      onAdd(data.publicUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {fotos.map((url, idx) => (
        <div
          key={url}
          className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-sm"
        >
          <button
            type="button"
            onClick={() => onPreview(url)}
            className="h-full w-full"
          >
            <img
              src={url}
              alt={`Foto ${idx + 1}`}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </button>
          <button
            type="button"
            onClick={() => onRemove(idx)}
            className="absolute right-1 top-1 rounded bg-gray-800/80 px-1.5 py-0.5 text-xs text-destructive hover:bg-gray-900"
          >
            ×
          </button>
        </div>
      ))}
      <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-blue-400 hover:bg-blue-50">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
        {uploading ? (
          <Loader2 className="size-8 animate-spin text-blue-600" />
        ) : (
          <Plus className="size-8 text-blue-600" />
        )}
      </label>
    </div>
  );
}
