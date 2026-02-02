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
  FileBarChart,
  Search,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard", icon: ClipboardList, label: "Proyectos" },
  { href: "/pedidos/nuevo", icon: Package, label: "Pedidos" },
  { href: "/programacion", icon: Calendar, label: "Programación" },
  { href: "/dashboard", icon: FileBarChart, label: "Reportes" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-slate-700/50 bg-[#1A1D29] transition-all duration-200 ease-in-out",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Header - Logo */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-slate-700/50",
          collapsed ? "justify-center px-0" : "justify-between px-4"
        )}
      >
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 transition-smooth">
            <span className="text-lg font-bold text-white">
              Bitácora Obra
            </span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="shrink-0 text-slate-400 hover:bg-slate-700/50 hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="size-5" />
          ) : (
            <ChevronLeft className="size-5" />
          )}
        </Button>
      </div>

      {/* Búsqueda */}
      {!collapsed && (
        <div className="flex items-center gap-1 border-b border-slate-700/50 p-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:bg-blue-500/10 hover:text-blue-400"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-global-search"));
              }
            }}
            title="Buscar (Cmd+K)"
          >
            <Search className="size-4" />
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-card">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href === "/dashboard" && pathname?.startsWith("/proyecto"));
          const linkContent = (
            <div
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-smooth",
                collapsed ? "justify-center px-0" : "",
                isActive
                  ? "border-l-4 border-blue-500 bg-blue-500/10 text-white"
                  : "border-l-4 border-transparent text-slate-400 hover:bg-slate-700/50 hover:text-white"
              )}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </div>
          );
          return (
            <Link key={item.href + item.label} href={item.href}>
              {linkContent}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
