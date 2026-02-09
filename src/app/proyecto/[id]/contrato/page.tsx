"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Upload,
  Sparkles,
  Check,
  FileText,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/Toast";

interface AnalisisContrato {
  cliente_nombre: string | null;
  proyecto_nombre: string | null;
  presupuesto_total: number | null;
  fecha_firma: string | null;
  fecha_inicio: string | null;
  fecha_entrega: string | null;
  conjunto: string | null;
  alcance: string | null;
}

function formatCOP(value: string): string {
  const num = value.replace(/\D/g, "");
  if (!num) return "";
  return Number(num).toLocaleString("es-CO");
}

function parseCOP(value: string): number {
  return Number(value.replace(/\D/g, "")) || 0;
}

export default function ContratoPage() {
  const params = useParams();
  const proyectoId = params.id as string;
  const { addToast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AnalisisContrato | null>(null);
  const [editForm, setEditForm] = useState<AnalisisContrato | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f && (f.name.endsWith(".pdf") || f.name.endsWith(".docx") || f.name.endsWith(".doc"))) {
      setFile(f);
      setResult(null);
      setEditForm(null);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && (f.name.endsWith(".pdf") || f.name.endsWith(".docx") || f.name.endsWith(".doc"))) {
      setFile(f);
      setResult(null);
      setEditForm(null);
    }
  };

  async function handleAnalizar() {
    if (!file) return;
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/analizar-contrato", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al analizar");
      }
      const data = (await res.json()) as AnalisisContrato;
      setResult(data);
      setEditForm({
        cliente_nombre: data.cliente_nombre ?? "",
        proyecto_nombre: data.proyecto_nombre ?? "",
        presupuesto_total: data.presupuesto_total ?? null,
        fecha_firma: data.fecha_firma ?? "",
        fecha_inicio: data.fecha_inicio ?? "",
        fecha_entrega: data.fecha_entrega ?? "",
        conjunto: data.conjunto ?? "",
        alcance: data.alcance ?? "",
      });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al analizar", "error");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleConfirmar() {
    if (!editForm || !proyectoId) return;
    setSaving(true);
    try {
      const supabase = getSupabase();

      let contratoUrl: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "pdf";
        const path = `contratos/${proyectoId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("proyecto-evidencias")
          .upload(path, file, { upsert: false });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("proyecto-evidencias")
            .getPublicUrl(path);
          contratoUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase
        .from("proyectos_maestro")
        .update({
          cliente_nombre: editForm.cliente_nombre?.trim() || null,
          proyecto_nombre: editForm.proyecto_nombre?.trim() || null,
          presupuesto_total:
            editForm.presupuesto_total != null ? editForm.presupuesto_total : undefined,
          fecha_inicio: editForm.fecha_inicio || null,
          fecha_entrega_estimada: editForm.fecha_entrega || null,
          conjunto: editForm.conjunto?.trim() || null,
          alcance_text: editForm.alcance?.trim() || null,
          alcance_definido: true,
          contrato_url: contratoUrl,
        })
        .eq("id", proyectoId);

      if (error) throw error;
      addToast("Proyecto actualizado correctamente", "success");
      setResult(null);
      setEditForm(null);
      setFile(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-[#D2D2D7]/40 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-8 py-4">
          <Button variant="ghost" size="icon" className="size-8 text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]" asChild>
            <Link href={`/proyecto/${proyectoId}`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold tracking-tight text-[#1D1D1F]">Analizar Contrato</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-8 py-8">
        {/* Drag & Drop */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-all",
            dragActive
              ? "border-[#007AFF] bg-[#007AFF]/5"
              : "border-[#D2D2D7] bg-[#F5F5F7]/50 hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5"
          )}
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            id="contrato-file"
            onChange={handleFileChange}
          />
          <label
            htmlFor="contrato-file"
            className="flex cursor-pointer flex-col items-center gap-3"
          >
            <FileText className="size-10 text-[#86868B]" />
            <span className="text-[13px] font-medium text-[#86868B]">
              Arrastra PDF o DOCX aquí, o haz clic para seleccionar
            </span>
          </label>
          {file && (
            <p className="mt-3 text-[13px] font-medium text-[#007AFF]">{file.name}</p>
          )}
        </div>

        <div className="mt-5 flex justify-center">
          <Button
            onClick={handleAnalizar}
            disabled={!file || analyzing}
            className="rounded-xl bg-[#007AFF] px-6 text-white shadow-sm hover:bg-[#0051D5]"
          >
            {analyzing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Analizar con IA
          </Button>
        </div>

        {/* Editable results */}
        {editForm && (
          <div className="mt-8 space-y-5">
            <h2 className="text-[15px] font-semibold text-[#1D1D1F]">
              Resultados (editable)
            </h2>
            <div className="space-y-4 rounded-2xl border border-[#D2D2D7]/60 bg-white p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Cliente</Label>
                  <Input
                    value={editForm.cliente_nombre ?? ""}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, cliente_nombre: e.target.value } : f
                      )
                    }
                    className="rounded-xl border-[#D2D2D7] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Proyecto</Label>
                  <Input
                    value={editForm.proyecto_nombre ?? ""}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, proyecto_nombre: e.target.value } : f
                      )
                    }
                    className="rounded-xl border-[#D2D2D7] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Presupuesto Total (COP)</Label>
                <Input
                  value={
                    editForm.presupuesto_total != null
                      ? formatCOP(String(editForm.presupuesto_total))
                      : ""
                  }
                  onChange={(e) => {
                    const v = parseCOP(e.target.value);
                    setEditForm((f) =>
                      f ? { ...f, presupuesto_total: v || null } : f
                    );
                  }}
                  placeholder="0"
                  className="rounded-xl border-[#D2D2D7] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Fecha Firma</Label>
                  <Input
                    type="date"
                    value={editForm.fecha_firma ?? ""}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, fecha_firma: e.target.value } : f
                      )
                    }
                    className="rounded-xl border-[#D2D2D7] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={editForm.fecha_inicio ?? ""}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, fecha_inicio: e.target.value } : f
                      )
                    }
                    className="rounded-xl border-[#D2D2D7] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] text-[#86868B]">Fecha Entrega</Label>
                  <Input
                    type="date"
                    value={editForm.fecha_entrega ?? ""}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, fecha_entrega: e.target.value } : f
                      )
                    }
                    className="rounded-xl border-[#D2D2D7] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Conjunto</Label>
                <Input
                  value={editForm.conjunto ?? ""}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, conjunto: e.target.value } : f
                    )
                  }
                  className="rounded-xl border-[#D2D2D7] focus:border-[#007AFF] focus:ring-[#007AFF]/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] text-[#86868B]">Alcance</Label>
                <textarea
                  value={editForm.alcance ?? ""}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, alcance: e.target.value } : f
                    )
                  }
                  rows={4}
                  className="w-full rounded-xl border border-[#D2D2D7] px-4 py-2.5 text-[13px] text-[#1D1D1F] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
                />
              </div>
            </div>

            <Button
              onClick={handleConfirmar}
              disabled={saving}
              className="w-full rounded-xl bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Confirmar y Actualizar
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
