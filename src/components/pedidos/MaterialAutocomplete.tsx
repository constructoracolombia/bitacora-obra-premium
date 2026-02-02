"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MATERIALES_FRECUENTES = [
  "Cemento gris",
  "Arena",
  "Grava",
  "Varilla corrugada",
  "Bloque de concreto",
  "Ladrillo",
  "Tubo PVC",
  "Cable eléctrico",
  "Pintura",
  "Impermeabilizante",
  "Yeso",
  "Madera",
  "Pegamento cerámico",
  "Porcelanato",
  "Sanitario",
  "Lavamanos",
  "Llave de paso",
  "Bombillo LED",
  "Interruptor",
  "Tornillos",
  "Clavos",
  "Malla electrosoldada",
  "Concreto premezclado",
  "Cal",
  "Adhesivo",
];

interface MaterialAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MaterialAutocomplete({
  value,
  onChange,
  onBlur,
  placeholder = "Buscar o escribir material...",
  className,
  disabled,
}: MaterialAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value.trim()) {
      setFiltered(MATERIALES_FRECUENTES.slice(0, 8));
    } else {
      const q = value.toLowerCase();
      setFiltered(
        MATERIALES_FRECUENTES.filter((m) =>
          m.toLowerCase().includes(q)
        ).slice(0, 8)
      );
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
          onBlur?.();
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="h-12 text-base"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {filtered.map((m) => (
            <li key={m}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                }}
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
