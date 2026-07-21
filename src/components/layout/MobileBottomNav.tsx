"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ClipboardList, PlusCircle, ShoppingCart, Calendar } from "lucide-react";

const navItems = [
  { href: "/proyectos", icon: ClipboardList, label: "Proyectos" },
  { href: "/adicionales", icon: PlusCircle, label: "Adicionales" },
  { href: "/compras", icon: ShoppingCart, label: "Compras" },
  { href: "/calendario", icon: Calendar, label: "Calendario" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 flex border-t border-[#D2D2D7]/60 bg-white/95 backdrop-blur-xl md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5"
          >
            <Icon
              className={cn("size-[22px]", isActive ? "text-[#007AFF]" : "text-[#86868B]")}
            />
            <span
              className={cn(
                "text-[11px] font-medium",
                isActive ? "text-[#007AFF]" : "text-[#86868B]"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
