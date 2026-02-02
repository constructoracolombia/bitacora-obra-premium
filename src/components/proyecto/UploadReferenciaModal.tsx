"use client";

import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export type ReferenciaTipo = "plano" | "render";

interface UploadReferenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proyectoId: string;
  onUploadComplete: (url: string, tipo: ReferenciaTipo) => void;
}

export function UploadReferenciaModal({
  open,
  onOpenChange,
  proyectoId,
  onUploadComplete,
}: UploadReferenciaModalProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState<ReferenciaTipo>("plano");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const supabase = getSupabase();
      const ext = file.name.split(".").pop() ?? "jpg";
      const folder = tipo === "plano" ? "planos" : "renders";
      const path = `${proyectoId}/referencias/${folder}/${crypto.randomUUID()}.${ext}`;

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

      onUploadComplete(urlData.publicUrl, tipo);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--gold)]/30 bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[var(--gold)]">
            Subir plano o render
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button
              variant={tipo === "plano" ? "default" : "outline"}
              size="sm"
              className={tipo === "plano" ? "bg-[var(--gold)] text-black" : "border-[var(--gold)]/40"}
              onClick={() => setTipo("plano")}
            >
              Plano
            </Button>
            <Button
              variant={tipo === "render" ? "default" : "outline"}
              size="sm"
              className={tipo === "render" ? "bg-[var(--gold)] text-black" : "border-[var(--gold)]/40"}
              onClick={() => setTipo("render")}
            >
              Render
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <div
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--gold)]/40 bg-black/30 py-12 transition-colors hover:border-[var(--gold)]/60 hover:bg-black/50",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            {uploading ? (
              <Loader2 className="size-12 animate-spin text-[var(--gold)]" />
            ) : (
              <Upload className="size-12 text-[var(--gold)]" />
            )}
            <span className="text-sm text-muted-foreground">
              {uploading ? "Subiendo..." : "Haz clic para seleccionar imagen"}
            </span>
          </div>
          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
