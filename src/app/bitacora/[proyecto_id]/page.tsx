"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  FileDown,
  Calendar,
  Filter,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { BitacoraDayCard } from "@/components/bitacora/BitacoraDayCard";
import { exportBitacoraPDF } from "@/lib/exports";
import { addDays, subDays, format, startOfDay } from "date-fns";

interface BitacoraEntry {
  id: string;
  proyecto_id: string;
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

const NOVEDAD_TIPOS = [
  { value: "", label: "Todos" },
  { value: "clima", label: "Clima" },
  { value: "retrasos", label: "Retrasos" },
  { value: "imprevistos", label: "Imprevistos" },
];

export default function BitacoraPage() {
  const params = useParams();
  const proyectoId = params.proyecto_id as string;

  const [project, setProject] = useState<{
    id: string;
    cliente_nombre: string | null;
    fecha_inicio: string | null;
  } | null>(null);
  const [entries, setEntries] = useState<BitacoraEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>("");
  const [tipoFilter, setTipoFilter] = useState<string>("");

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = getSupabase();

        const [projectRes, entriesRes] = await Promise.all([
          supabase
            .from("hoja_vida_proyecto")
            .select("id, cliente_nombre, fecha_inicio")
            .eq("id", proyectoId)
            .single(),
          supabase
            .from("bitacora_diaria")
            .select("*")
            .eq("proyecto_id", proyectoId)
            .order("fecha", { ascending: false }),
        ]);

        if (projectRes.data) {
          setProject(projectRes.data as typeof project);
        }
        if (entriesRes.data) {
          setEntries(
            (entriesRes.data as Record<string, unknown>[]).map((r) => ({
              id: r.id as string,
              proyecto_id: r.proyecto_id as string,
              fecha: r.fecha as string,
              novedades: (r.novedades as string) ?? null,
              personal_count: Number(r.personal_count) ?? 0,
              oficiales_count: Number(r.oficiales_count) ?? 0,
              ayudantes_count: Number(r.ayudantes_count) ?? 0,
              fotos_url: Array.isArray(r.fotos_url) ? (r.fotos_url as string[]) : [],
              fotos_manana: Array.isArray(r.fotos_manana) ? (r.fotos_manana as string[]) : [],
              fotos_tarde: Array.isArray(r.fotos_tarde) ? (r.fotos_tarde as string[]) : [],
              novedad_tipo: (r.novedad_tipo as string) ?? null,
            })) as BitacoraEntry[]
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (proyectoId) fetchData();
  }, [proyectoId]);

  async function handleSaveEntry(
    fecha: string,
    data: Partial<BitacoraEntry>
  ) {
    const supabase = getSupabase();
    const existing = entries.find((e) => e.fecha === fecha);

    const payload = {
      novedades: data.novedades ?? null,
      personal_count: data.personal_count ?? 0,
      oficiales_count: data.oficiales_count ?? 0,
      ayudantes_count: data.ayudantes_count ?? 0,
      novedad_tipo: data.novedad_tipo || null,
      fotos_manana: data.fotos_manana ?? [],
      fotos_tarde: data.fotos_tarde ?? [],
    };

    if (existing) {
      const { data: updated } = await supabase
        .from("bitacora_diaria")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();

      if (updated) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === existing.id
              ? { ...e, ...payload }
              : e
          )
        );
      }
    } else {
      const { data: inserted } = await supabase
        .from("bitacora_diaria")
        .insert({
          proyecto_id: proyectoId,
          fecha,
          ...payload,
        })
        .select()
        .single();

      if (inserted) {
        setEntries((prev) =>
          [{ ...inserted, ...payload } as BitacoraEntry, ...prev].sort(
            (a, b) => (b.fecha > a.fecha ? 1 : -1)
          )
        );
      }
    }
  }

  function handleExportPDF() {
    if (!project) return;

    const filtered = getFilteredEntries();
    exportBitacoraPDF(
      project.cliente_nombre ?? "Proyecto",
      filtered.map((e) => ({
        fecha: e.fecha,
        novedades: e.novedades,
        oficiales_count: e.oficiales_count,
        ayudantes_count: e.ayudantes_count,
        personal_count: e.personal_count,
        novedad_tipo: e.novedad_tipo,
      }))
    );
  }

  function getFilteredEntries() {
    let result = [...entries];

    if (dateFilter) {
      const filterDate = startOfDay(new Date(dateFilter));
      result = result.filter((e) => {
        const d = startOfDay(new Date(e.fecha));
        return d.getTime() === filterDate.getTime();
      });
    }

    if (tipoFilter) {
      result = result.filter((e) => e.novedad_tipo === tipoFilter);
    }

    return result;
  }

  function getDaysToShow() {
    const start = project?.fecha_inicio
      ? new Date(project.fecha_inicio)
      : subDays(new Date(), 30);
    const end = addDays(new Date(), 7);
    const days: string[] = [];
    let d = startOfDay(start);
    const endD = startOfDay(end);

    while (d <= endD) {
      days.push(format(d, "yyyy-MM-dd"));
      d = addDays(d, 1);
    }

    return days.reverse();
  }

  const days = getDaysToShow();
  const filteredEntries = getFilteredEntries();
  const entriesByFecha = new Map(entries.map((e) => [e.fecha, e]));

  const daysToRender = dateFilter
    ? [dateFilter]
    : tipoFilter
      ? [...new Set(filteredEntries.map((e) => e.fecha))].sort().reverse()
      : days;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Proyecto no encontrado</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Volver al dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/proyecto/${proyectoId}`}>
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <h1 className="text-lg font-bold text-foreground">
              Bitácora · {project.cliente_nombre || "Proyecto"}
            </h1>
          </div>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            size="sm"
            onClick={handleExportPDF}
          >
            <FileDown className="size-4" />
            Exportar PDF
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 px-4 pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-blue-600" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-blue-600" />
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:border-blue-500 focus:outline-none"
            >
              {NOVEDAD_TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {(dateFilter || tipoFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFilter("");
                setTipoFilter("");
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </header>

      {/* Timeline */}
      <main className="px-4 py-6">
        <div className="mx-auto max-w-3xl">
          {daysToRender.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              No hay entradas para los filtros seleccionados.
            </p>
          ) : (
            <div className="space-y-0">
              {daysToRender.map((fecha) => (
                <BitacoraDayCard
                  key={fecha}
                  entry={entriesByFecha.get(fecha) ?? null}
                  fecha={fecha}
                  proyectoId={proyectoId}
                  proyectoNombre={project.cliente_nombre ?? "Proyecto"}
                  onSave={(data) => handleSaveEntry(fecha, data)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

