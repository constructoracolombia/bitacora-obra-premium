"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  ClipboardList,
  Package,
  Loader2,
  Command,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: "proyecto" | "pedido";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabase();
      const term = `%${q.trim()}%`;

      const [proyectosRes, pedidosRes] = await Promise.all([
        supabase
          .from("proyectos_maestro")
          .select("id, cliente_nombre")
          .ilike("cliente_nombre", term)
          .limit(5),
        supabase
          .from("pedidos_material")
          .select("id, item")
          .ilike("item", term)
          .limit(5),
      ]);

      const items: SearchResult[] = [];

      if (proyectosRes.data) {
        for (const p of proyectosRes.data as { id: string; cliente_nombre: string | null }[]) {
          items.push({
            type: "proyecto",
            id: p.id,
            title: p.cliente_nombre || "Sin nombre",
            subtitle: "Proyecto",
            href: `/proyecto/${p.id}`,
          });
        }
      }

      if (pedidosRes.data) {
        for (const ped of pedidosRes.data as { id: string; item: string }[]) {
          items.push({
            type: "pedido",
            id: ped.id,
            title: ped.item,
            subtitle: "Pedido",
            href: `/pedidos/nuevo`,
          });
        }
      }

      setResults(items);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function handleOpenSearch() {
      setOpen(true);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-global-search", handleOpenSearch);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-global-search", handleOpenSearch);
    };
  }, []);

  function handleSelect(href: string) {
    router.push(href);
    setOpen(false);
    setQuery("");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#1D1D1F]/40 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="mx-auto mt-[15vh] max-w-xl rounded-xl border border-gray-200 bg-white p-2 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <Search className="size-5 text-[#007AFF]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar proyectos, pedidos..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <kbd className="hidden rounded border border-white/20 px-2 py-0.5 text-xs text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>
        <div className="mt-2 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-8 animate-spin text-[#007AFF]" />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1 py-2">
              {results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  type="button"
                  onClick={() => handleSelect(r.href)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-100"
                >
                  {r.type === "proyecto" ? (
                    <ClipboardList className="size-5 shrink-0 text-[#007AFF]" />
                  ) : (
                    <Package className="size-5 shrink-0 text-[#007AFF]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.title}</p>
                    {r.subtitle && (
                      <p className="text-xs text-muted-foreground">{r.subtitle}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim() ? (
            <p className="py-8 text-center text-muted-foreground">
              No se encontraron resultados
            </p>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              Escribe para buscar (Cmd+K o Ctrl+K)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
