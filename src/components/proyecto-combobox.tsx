"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Proyecto {
  id: string;
  cliente_nombre: string | null;
}

export function ProyectoCombobox({
  value,
  onChange,
  proyectos,
  placeholder = "Selecciona un proyecto",
  incluirTodos = false,
  className = "",
}: {
  value: string;
  onChange: (id: string) => void;
  proyectos: Proyecto[];
  placeholder?: string;
  incluirTodos?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const opciones = useMemo(() => {
    const base: Proyecto[] = incluirTodos
      ? [{ id: "TODOS", cliente_nombre: "Todos los proyectos" }, ...proyectos]
      : proyectos;
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter((p) => (p.cliente_nombre ?? "").toLowerCase().includes(q));
  }, [proyectos, query, incluirTodos]);

  const labelActual = useMemo(() => {
    if (incluirTodos && value === "TODOS") return "Todos los proyectos";
    if (!value) return "";
    const p = proyectos.find((p) => p.id === value);
    return p ? (p.cliente_nombre ?? "Sin nombre") : "";
  }, [value, proyectos, incluirTodos]);

  useEffect(() => { setHighlighted(0); }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        setQuery("");
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      setHighlighted((h) => Math.min(h + 1, opciones.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setHighlighted((h) => Math.max(h - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter") {
      const op = opciones[highlighted];
      if (op) {
        onChange(op.id);
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={open ? query : labelActual}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(""); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 py-1.5 pl-3 pr-8 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
      </div>

      {open && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg text-sm">
          {opciones.length === 0 ? (
            <li className="px-3 py-2 text-gray-400">Sin resultados</li>
          ) : (
            opciones.map((p, i) => (
              <li
                key={p.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(p.id);
                  setOpen(false);
                  setQuery("");
                }}
                onMouseEnter={() => setHighlighted(i)}
                className={cn(
                  "cursor-pointer truncate px-3 py-2",
                  i === highlighted ? "bg-blue-50 text-blue-700" : "text-gray-800 hover:bg-gray-50"
                )}
              >
                {p.cliente_nombre ?? "Sin nombre"}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
