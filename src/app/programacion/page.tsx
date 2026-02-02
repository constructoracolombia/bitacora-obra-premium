"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Calendar } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

interface ProyectoOption {
  id: string;
  cliente_nombre: string | null;
}

export default function ProgramacionIndexPage() {
  const [projects, setProjects] = useState<ProyectoOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from("hoja_vida_proyecto")
          .select("id, cliente_nombre")
          .order("cliente_nombre");
        if (data) setProjects(data as ProyectoOption[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-12 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold text-[var(--gold)]">
        Selecciona un proyecto
      </h1>
      <div className="grid w-full max-w-md gap-2">
        {projects.map((p) => (
          <Link key={p.id} href={`/programacion/${p.id}`}>
            <Button
              variant="outline"
              className="w-full justify-start border-[var(--gold)]/30 hover:bg-[var(--gold)]/10"
            >
              <Calendar className="size-4" />
              {p.cliente_nombre || "Sin nombre"}
            </Button>
          </Link>
        ))}
      </div>
      {projects.length === 0 && (
        <p className="text-muted-foreground">No hay proyectos.</p>
      )}
      <Button variant="ghost" asChild>
        <Link href="/dashboard">Volver al dashboard</Link>
      </Button>
    </div>
  );
}
