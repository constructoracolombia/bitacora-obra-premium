"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Sun,
  Cloud,
  CloudRain,
  Users,
  Camera,
  X,
  Calendar,
  User,
  Tag,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageLightbox } from "@/components/proyecto/ImageLightbox";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

/* ─────────────── Tipos ─────────────── */

interface BitacoraEntry {
  id: string;
  proyecto_id: string;
  fecha: string;
  novedades: string | null;
  personal_count: number;
  fotos_url: string[];
  clima: string | null;
  actividades_realizadas: string[];
  reportado_por: string | null;
  created_at: string;
}

interface ProyectoInfo {
  id: string;
  cliente_nombre: string | null;
}

const CLIMA_OPTIONS = [
  { value: "Soleado", label: "Soleado", icon: Sun, color: "text-amber-500" },
  { value: "Nublado", label: "Nublado", icon: Cloud, color: "text-gray-500" },
  { value: "Lluvia", label: "Lluvia", icon: CloudRain, color: "text-blue-500" },
];

function formatFechaTitulo(fecha: string): string {
  try {
    return format(new Date(fecha + "T12:00:00"), "EEEE d 'de' MMMM, yyyy", {
      locale: es,
    });
  } catch {
    return fecha;
  }
}

function formatFechaCorta(fecha: string): string {
  try {
    return format(new Date(fecha + "T12:00:00"), "dd/MM/yyyy");
  } catch {
    return fecha;
  }
}

function getClimaIcon(clima: string | null) {
  const opt = CLIMA_OPTIONS.find((c) => c.value === clima);
  if (!opt) return null;
  const Icon = opt.icon;
  return <Icon className={cn("size-4", opt.color)} />;
}

/* ─────────────── Page ─────────────── */

export default function BitacoraProyectoPage() {
  const params = useParams();
  const proyectoId = params.id as string;

  const [project, setProject] = useState<ProyectoInfo | null>(null);
  const [entries, setEntries] = useState<BitacoraEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ open: boolean; src: string }>({
    open: false,
    src: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const [projectRes, entriesRes] = await Promise.all([
        supabase
          .from("proyectos_maestro")
          .select("id, cliente_nombre")
          .eq("id", proyectoId)
          .single(),
        supabase
          .from("bitacora_diaria")
          .select("*")
          .eq("proyecto_id", proyectoId)
          .order("fecha", { ascending: false }),
      ]);

      if (projectRes.data) {
        setProject(projectRes.data as ProyectoInfo);
      }

      if (entriesRes.data) {
        setEntries(
          (entriesRes.data as Record<string, unknown>[]).map((r) => ({
            id: r.id as string,
            proyecto_id: r.proyecto_id as string,
            fecha: r.fecha as string,
            novedades: (r.novedades as string) ?? null,
            personal_count: Number(r.personal_count) || 0,
            fotos_url: Array.isArray(r.fotos_url) ? (r.fotos_url as string[]) : [],
            clima: (r.clima as string) ?? null,
            actividades_realizadas: Array.isArray(r.actividades_realizadas)
              ? (r.actividades_realizadas as string[])
              : [],
            reportado_por: (r.reportado_por as string) ?? null,
            created_at: (r.created_at as string) ?? "",
          }))
        );
      }
    } catch (err) {
      console.error("Error fetching bitacora:", err);
    } finally {
      setLoading(false);
    }
  }, [proyectoId]);

  useEffect(() => {
    if (proyectoId) fetchData();
  }, [proyectoId, fetchData]);

  function handleEntryCreated() {
    setModalOpen(false);
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="size-12 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-6">
        <p className="text-gray-500">Proyecto no encontrado</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Volver al dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/proyecto/${proyectoId}`}>
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-[#1D1D1F]">Bitácora Diaria</h1>
              <p className="text-sm text-gray-500">
                {project.cliente_nombre || "Proyecto"}
              </p>
            </div>
          </div>
          <Button
            className="bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="size-4" />
            Nueva Entrada
          </Button>
        </div>
      </header>

      {/* Timeline */}
      <main className="mx-auto max-w-3xl px-6 py-8">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
            <Calendar className="size-12 text-gray-400" />
            <p className="text-gray-600">No hay entradas en la bitácora</p>
            <p className="text-sm text-gray-500">
              Registra la primera entrada del día para comenzar
            </p>
            <Button
              className="bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="size-4" />
              Nueva Entrada
            </Button>
          </div>
        ) : (
          <div className="relative">
            {/* Línea azul vertical */}
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-[#007AFF]/20" />

            <div className="space-y-6">
              {entries.map((entry) => (
                <div key={entry.id} className="relative flex gap-5">
                  {/* Punto del timeline */}
                  <div className="relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#007AFF] bg-white">
                    <div className="h-3 w-3 rounded-full bg-[#007AFF]" />
                  </div>

                  {/* Card */}
                  <div className="min-w-0 flex-1 rounded-xl border border-[#D2D2D7] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                    {/* Fecha + clima */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold capitalize text-[#1D1D1F]">
                          {formatFechaTitulo(entry.fecha)}
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {formatFechaCorta(entry.fecha)}
                        </p>
                      </div>
                      {entry.clima && (
                        <span className="flex items-center gap-1.5 rounded-full border border-[#D2D2D7] bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                          {getClimaIcon(entry.clima)}
                          {entry.clima}
                        </span>
                      )}
                    </div>

                    {/* Novedades */}
                    {entry.novedades && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                        {entry.novedades}
                      </p>
                    )}

                    {/* Actividades realizadas (tags) */}
                    {entry.actividades_realizadas.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {entry.actividades_realizadas.map((act, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-[#007AFF]/10 px-2.5 py-0.5 text-xs font-medium text-[#007AFF]"
                          >
                            {act}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta: personal + reportado por */}
                    <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-3">
                      {entry.personal_count > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Users className="size-3.5" />
                          <span>{entry.personal_count} personas</span>
                        </div>
                      )}
                      {entry.reportado_por && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <User className="size-3.5" />
                          <span>{entry.reportado_por}</span>
                        </div>
                      )}
                      {entry.fotos_url.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Camera className="size-3.5" />
                          <span>{entry.fotos_url.length} foto{entry.fotos_url.length !== 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </div>

                    {/* Galería de fotos */}
                    {entry.fotos_url.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {entry.fotos_url.map((url, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setLightbox({ open: true, src: url })}
                            className="group relative aspect-square overflow-hidden rounded-lg border border-[#D2D2D7] bg-gray-100"
                          >
                            <img
                              src={url}
                              alt={`Foto ${i + 1}`}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal nueva entrada */}
      <NuevaEntradaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        proyectoId={proyectoId}
        onSuccess={handleEntryCreated}
      />

      {/* Lightbox */}
      <ImageLightbox
        open={lightbox.open}
        onOpenChange={(open) => setLightbox((prev) => ({ ...prev, open }))}
        src={lightbox.src}
      />
    </div>
  );
}

/* ─────────────── Modal: Nueva Entrada ─────────────── */

interface NuevaEntradaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proyectoId: string;
  onSuccess: () => void;
}

function NuevaEntradaModal({
  open,
  onOpenChange,
  proyectoId,
  onSuccess,
}: NuevaEntradaModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fecha: format(new Date(), "yyyy-MM-dd"),
    novedades: "",
    personal_count: 0,
    clima: "Soleado",
    actividades: [] as string[],
    actividadInput: "",
    reportado_por: "",
  });

  const [fotos, setFotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form on open
  useEffect(() => {
    if (open) {
      setForm({
        fecha: format(new Date(), "yyyy-MM-dd"),
        novedades: "",
        personal_count: 0,
        clima: "Soleado",
        actividades: [],
        actividadInput: "",
        reportado_por: "",
      });
      setFotos([]);
      setError(null);
    }
  }, [open]);

  function addActividad() {
    const val = form.actividadInput.trim();
    if (!val) return;
    if (form.actividades.includes(val)) return;
    setForm((f) => ({
      ...f,
      actividades: [...f.actividades, val],
      actividadInput: "",
    }));
  }

  function removeActividad(idx: number) {
    setForm((f) => ({
      ...f,
      actividades: f.actividades.filter((_, i) => i !== idx),
    }));
  }

  function handleActividadKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addActividad();
    }
  }

  async function handleFileUpload(files: FileList | File[]) {
    if (!files.length) return;
    setUploading(true);

    try {
      const { getSupabase } = await import("@/lib/supabase");
      const supabase = getSupabase();

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${proyectoId}/bitacora/${form.fecha}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("proyecto-evidencias")
          .upload(path, file, { upsert: false });

        if (uploadErr) {
          console.error("Upload error:", uploadErr);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("proyecto-evidencias")
          .getPublicUrl(path);

        setFotos((prev) => [...prev, urlData.publicUrl]);
      }
    } catch (err) {
      console.error("Error uploading:", err);
    } finally {
      setUploading(false);
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileUpload(files);
  }

  function removeFoto(idx: number) {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fecha) {
      setError("La fecha es requerida");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = getSupabase();

      const { error: insertError } = await supabase
        .from("bitacora_diaria")
        .upsert(
          {
            proyecto_id: proyectoId,
            fecha: form.fecha,
            novedades: form.novedades.trim() || null,
            personal_count: form.personal_count,
            clima: form.clima || null,
            actividades_realizadas: form.actividades,
            reportado_por: form.reportado_por.trim() || null,
            fotos_url: fotos,
          },
          { onConflict: "proyecto_id,fecha" }
        );

      if (insertError) throw insertError;
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar la entrada"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#D2D2D7] bg-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1D1D1F]">Nueva Entrada de Bitácora</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Fecha */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-[#1D1D1F]">
              <Calendar className="size-4 text-[#007AFF]" />
              Fecha
            </Label>
            <Input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              className="border-[#D2D2D7] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
            />
          </div>

          {/* Novedades */}
          <div className="space-y-2">
            <Label className="text-[#1D1D1F]">Novedades del día</Label>
            <textarea
              value={form.novedades}
              onChange={(e) =>
                setForm((f) => ({ ...f, novedades: e.target.value }))
              }
              placeholder="Describe las novedades, avances o situaciones del día..."
              rows={4}
              className="w-full rounded-lg border border-[#D2D2D7] px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
            />
          </div>

          {/* Personal + Clima (side by side) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[#1D1D1F]">
                <Users className="size-4 text-[#007AFF]" />
                Personal en obra
              </Label>
              <Input
                type="number"
                min={0}
                value={form.personal_count}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    personal_count: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
                placeholder="0"
                className="border-[#D2D2D7] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
              />
              <p className="text-xs text-gray-400">Oficiales + Ayudantes</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[#1D1D1F]">Clima</Label>
              <div className="flex gap-2">
                {CLIMA_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = form.clima === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, clima: opt.value }))
                      }
                      className={cn(
                        "flex flex-1 flex-col items-center gap-1 rounded-lg border-2 px-2 py-2.5 text-xs font-medium transition-all",
                        isSelected
                          ? "border-[#007AFF] bg-[#007AFF]/5 text-[#007AFF]"
                          : "border-[#D2D2D7] bg-white text-gray-500 hover:border-gray-300"
                      )}
                    >
                      <Icon className={cn("size-5", isSelected ? opt.color : "text-gray-400")} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actividades realizadas (tags) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-[#1D1D1F]">
              <Tag className="size-4 text-[#007AFF]" />
              Actividades realizadas
            </Label>
            <div className="flex gap-2">
              <Input
                value={form.actividadInput}
                onChange={(e) =>
                  setForm((f) => ({ ...f, actividadInput: e.target.value }))
                }
                onKeyDown={handleActividadKeyDown}
                placeholder="Escribir y presionar Enter..."
                className="border-[#D2D2D7] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addActividad}
                className="shrink-0 border-[#D2D2D7]"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {form.actividades.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.actividades.map((act, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded-full bg-[#007AFF]/5 px-2.5 py-1 text-xs font-medium text-blue-700"
                  >
                    {act}
                    <button
                      type="button"
                      onClick={() => removeActividad(i)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-[#007AFF]/20"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Fotos (drag & drop) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-[#1D1D1F]">
              <Camera className="size-4 text-[#007AFF]" />
              Fotos del día
            </Label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 transition-colors",
                dragActive
                  ? "border-blue-500 bg-[#007AFF]/5"
                  : "border-gray-300 bg-gray-50 hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFileUpload(e.target.files);
                  e.target.value = "";
                }}
              />
              {uploading ? (
                <Loader2 className="size-8 animate-spin text-[#007AFF]" />
              ) : (
                <Camera className="size-8 text-gray-400" />
              )}
              <span className="text-sm text-gray-500">
                {uploading
                  ? "Subiendo..."
                  : "Arrastra fotos aquí o haz clic para seleccionar"}
              </span>
            </div>

            {/* Preview de fotos subidas */}
            {fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-2 sm:grid-cols-4">
                {fotos.map((url, i) => (
                  <div
                    key={i}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-[#D2D2D7]"
                  >
                    <img
                      src={url}
                      alt={`Foto ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFoto(i)}
                      className="absolute right-1 top-1 rounded-full bg-[#FF3B30] p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reportado por */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-[#1D1D1F]">
              <User className="size-4 text-[#007AFF]" />
              Reportado por
            </Label>
            <Input
              value={form.reportado_por}
              onChange={(e) =>
                setForm((f) => ({ ...f, reportado_por: e.target.value }))
              }
              placeholder="Nombre del residente o encargado"
              className="border-[#D2D2D7] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-[#FF3B30]/5 px-3 py-2 text-sm text-[#FF3B30]">
              {error}
            </p>
          )}

          {/* Footer */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#D2D2D7]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving || uploading}
              className="bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Guardar Entrada"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
