"use client";

import { useState, useRef } from "react";
import { AlertTriangle, Camera, Loader2, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface FotoEvidenciaInputProps {
  fotos: string[];
  proyectoId: string;
  onFotosChange: (urls: string[]) => void;
}

export function FotoEvidenciaInput({
  fotos,
  proyectoId,
  onFotosChange,
}: FotoEvidenciaInputProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !proyectoId) return;

    setError(null);
    setUploading(true);

    try {
      const supabase = getSupabase();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${proyectoId}/pedidos/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("proyecto-evidencias")
        .upload(path, file, { upsert: false });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("proyecto-evidencias")
        .getPublicUrl(path);

      onFotosChange([...fotos, urlData.publicUrl]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeFoto(idx: number) {
    onFotosChange(fotos.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Camera className="size-4" />
        Fotos de evidencia (obligatorio para items &gt;500k COP)
      </Label>
      <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
        <AlertTriangle className="size-5 shrink-0 text-destructive" />
        <p className="text-sm text-destructive">
          Este ítem supera $500.000 COP. Debes subir al menos una foto de
          evidencia.
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading || !proyectoId}
      />
      <div className="flex flex-wrap gap-2">
        {fotos.map((url, idx) => (
          <div
            key={url}
            className="relative aspect-square w-16 overflow-hidden rounded-lg border border-[var(--gold)]/30 bg-black/50"
          >
            <img
              src={url}
              alt={`Evidencia ${idx + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeFoto(idx)}
              className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-destructive hover:bg-black/90"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || !proyectoId}
          className={cn(
            "flex aspect-square w-16 items-center justify-center rounded-lg border-2 border-dashed border-[var(--gold)]/40 bg-black/30 transition-colors hover:border-[var(--gold)]/60",
            (uploading || !proyectoId) && "opacity-50"
          )}
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-[var(--gold)]" />
          ) : (
            <Camera className="size-6 text-[var(--gold)]" />
          )}
        </button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {fotos.length > 0 && (
        <p className="text-sm text-emerald-400">
          ✓ {fotos.length} foto(s) subida(s)
        </p>
      )}
    </div>
  );
}

