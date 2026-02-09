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
        "flex flex-col bg-[#1A1D29] transition-all duration-200 ease-in-out",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-white/[0.06]",
          collapsed ? "justify-center px-0" : "justify-between px-4"
        )}
      >
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight text-white">
              Bitácora Obra
            </span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="size-8 shrink-0 text-white/40 hover:bg-white/[0.06] hover:text-white/80"
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="border-b border-white/[0.06] p-2">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/40 transition-all hover:bg-white/[0.06] hover:text-white/60"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-global-search"));
              }
            }}
          >
            <Search className="size-4" />
            <span>Buscar...</span>
            <kbd className="ml-auto rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/30">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 scrollbar-card">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href === "/dashboard" && pathname?.startsWith("/proyecto"));
          return (
            <Link key={item.href + item.label} href={item.href}>
              <div
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                  collapsed ? "justify-center px-0" : "",
                  isActive
                    ? "bg-[#007AFF]/10 text-white"
                    : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
                )}
              >
                <Icon className={cn("size-[18px] shrink-0", isActive && "text-[#007AFF]")} />
                {!collapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
