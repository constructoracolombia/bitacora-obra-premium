"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ClipboardList,
  Package,
  Calendar,
  DollarSign,
  Sun,
  Moon,
  Search,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/proyectos", icon: ClipboardList, label: "Proyectos" },
  { href: "/pedidos/nuevo", icon: Package, label: "Pedidos" },
  { href: "/programacion", icon: Calendar, label: "Programación" },
  { href: "https://finanzas.bitacora-obra.com", icon: DollarSign, label: "Finanzas", external: true },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-white/10 bg-card transition-all duration-200 ease-in-out",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Header - Logo constructora */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-white/10",
          collapsed ? "justify-center px-0" : "justify-between px-4"
        )}
      >
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 transition-smooth">
            <span className="text-lg font-bold text-[var(--gold)]">
              Bitácora Obra
            </span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="size-5" />
          ) : (
            <ChevronLeft className="size-5" />
          )}
        </Button>
      </div>

      {/* Búsqueda y tema */}
      {!collapsed && (
        <div className="flex items-center gap-1 border-b border-white/10 p-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-[var(--gold)]"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-global-search"));
              }
            }}
            title="Buscar (Cmd+K)"
          >
            <Search className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-[var(--gold)]"
            onClick={toggleTheme}
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-card">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = !item.external && pathname === item.href;
          const linkContent = (
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 transition-smooth hover:bg-white/5 hover:text-[var(--gold)]",
                collapsed ? "justify-center px-0" : "px-3",
                isActive && "bg-white/5 text-[var(--gold)]"
              )}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Button>
          );
          return item.external ? (
            <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">
              {linkContent}
            </a>
          ) : (
            <Link key={item.href} href={item.href}>
              {linkContent}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
