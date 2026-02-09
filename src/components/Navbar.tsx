"use client";

import Link from "next/link";
import { ChevronRight, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface NavbarProps {
  breadcrumbs?: BreadcrumbItem[];
  notificationCount?: number;
  userAvatar?: string | null;
  userName?: string;
  className?: string;
}

export function Navbar({
  breadcrumbs = [],
  notificationCount = 0,
  userAvatar,
  userName,
  className,
}: NavbarProps) {
  return (
    <nav
      className={cn(
        "flex h-14 items-center justify-between border-b border-[#D2D2D7]/40 bg-white/80 px-4 backdrop-blur-xl sm:px-6",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-[15px] font-semibold text-[#1D1D1F] transition-colors hover:text-[#007AFF]"
        >
          Bitácora Obra
        </Link>

        {breadcrumbs.length > 0 && (
          <div className="hidden items-center gap-1 text-[13px] text-[#86868B] sm:flex">
            {breadcrumbs.map((item, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3.5 text-[#D2D2D7]" />}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-[#1D1D1F]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-[#1D1D1F]">{item.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/notificaciones"
          className="relative rounded-xl p-2 text-[#86868B] transition-colors hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
          aria-label={`Notificaciones${notificationCount > 0 ? ` (${notificationCount})` : ""}`}
        >
          <Bell className="size-[18px]" />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[#FF3B30] text-[9px] font-bold text-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </Link>

        <Link
          href="/perfil"
          className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-[#F5F5F7]"
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName ?? "Usuario"}
              className="size-7 rounded-full object-cover ring-2 ring-[#D2D2D7]"
            />
          ) : (
            <div className="flex size-7 items-center justify-center rounded-full bg-[#007AFF]/10 ring-2 ring-[#007AFF]/20">
              <User className="size-3.5 text-[#007AFF]" />
            </div>
          )}
          {userName && (
            <span className="hidden text-[13px] font-medium text-[#1D1D1F] sm:block">{userName}</span>
          )}
        </Link>
      </div>
    </nav>
  );
}
