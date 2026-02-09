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
          .from("proyectos_maestro")
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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">
        Selecciona un proyecto
      </h1>
      <div className="grid w-full max-w-md gap-2">
        {projects.map((p) => (
          <Link key={p.id} href={`/programacion/${p.id}`}>
            <Button
              variant="outline"
              className="w-full justify-start rounded-xl border-[#D2D2D7] text-[#1D1D1F] hover:bg-[#F5F5F7]"
            >
              <Calendar className="size-4 text-[#007AFF]" />
              {p.cliente_nombre || "Sin nombre"}
            </Button>
          </Link>
        ))}
      </div>
      {projects.length === 0 && (
        <p className="text-[#86868B]">No hay proyectos.</p>
      )}
      <Button variant="ghost" className="text-[#86868B] hover:text-[#1D1D1F]" asChild>
        <Link href="/dashboard">Volver al dashboard</Link>
      </Button>
    </div>
  );
}
