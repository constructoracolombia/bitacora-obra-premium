"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  PlusCircle,
  Package,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/proyectos", icon: ClipboardList, label: "Proyectos" },
  { href: "/adicionales", icon: PlusCircle, label: "Adicionales" },
  { href: "/requisiciones", icon: Package, label: "Requisiciones" },
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
          <Link href="/proyectos" className="flex items-center gap-2">
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

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
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

      {/* Logout */}
      <div className="border-t border-white/[0.06] p-2">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-white/40 transition-all duration-150 hover:bg-white/[0.06] hover:text-white/60",
            collapsed && "justify-center px-0"
          )}
          onClick={() => {
            // TODO: implement logout
          }}
        >
          <LogOut className="size-[18px] shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
