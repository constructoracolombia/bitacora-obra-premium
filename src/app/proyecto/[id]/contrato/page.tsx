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
        .from("hoja_vida_proyecto")
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
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4 px-4 py-4 sm:px-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/proyecto/${proyectoId}`}>
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-[#2D3748]">Analizar Contrato</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        {/* Drag & Drop */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors",
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50"
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
            className="flex cursor-pointer flex-col items-center gap-2"
          >
            <FileText className="size-12 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">
              Arrastra PDF o DOCX aquí, o haz clic para seleccionar
            </span>
          </label>
          {file && (
            <p className="mt-2 text-sm text-blue-600">{file.name}</p>
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <Button
            onClick={handleAnalizar}
            disabled={!file || analyzing}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {analyzing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Analizar con IA
          </Button>
        </div>

        {/* Resultados editables */}
        {editForm && (
          <div className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold text-[#2D3748]">
              Resultados (editable)
            </h2>
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Input
                    value={editForm.cliente_nombre ?? ""}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, cliente_nombre: e.target.value } : f
                      )
                    }
                    className="border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Proyecto</Label>
                  <Input
                    value={editForm.proyecto_nombre ?? ""}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, proyecto_nombre: e.target.value } : f
                      )
                    }
                    className="border-gray-200"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Presupuesto Total (COP)</Label>
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
                  className="border-gray-200"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Fecha Firma</Label>
                  <Input
                    type="date"
                    value={editForm.fecha_firma ?? ""}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, fecha_firma: e.target.value } : f
                      )
                    }
                    className="border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={editForm.fecha_inicio ?? ""}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, fecha_inicio: e.target.value } : f
                      )
                    }
                    className="border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Entrega</Label>
                  <Input
                    type="date"
                    value={editForm.fecha_entrega ?? ""}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, fecha_entrega: e.target.value } : f
                      )
                    }
                    className="border-gray-200"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Conjunto</Label>
                <Input
                  value={editForm.conjunto ?? ""}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, conjunto: e.target.value } : f
                    )
                  }
                  className="border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label>Alcance</Label>
                <textarea
                  value={editForm.alcance ?? ""}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, alcance: e.target.value } : f
                    )
                  }
                  rows={4}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <Button
              onClick={handleConfirmar}
              disabled={saving}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
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
