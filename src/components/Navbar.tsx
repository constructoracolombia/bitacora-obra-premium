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
        "flex h-16 items-center justify-between border-b border-white/10 bg-background/80 px-4 backdrop-blur-xl sm:px-6",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-lg font-bold text-[var(--gold)] transition-colors hover:text-[var(--gold)]/90"
        >
          Bitácora Obra
        </Link>

        {breadcrumbs.length > 0 && (
          <div className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
            {breadcrumbs.map((item, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-4 text-muted-foreground/60" />}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{item.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          href="/notificaciones"
          className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          aria-label={`Notificaciones${notificationCount > 0 ? ` (${notificationCount})` : ""}`}
        >
          <Bell className="size-5" />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </Link>

        <Link
          href="/perfil"
          className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-white/5"
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName ?? "Usuario"}
              className="size-8 rounded-full object-cover ring-2 ring-[var(--gold)]/30"
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-[var(--gold)]/20 ring-2 ring-[var(--gold)]/30">
              <User className="size-4 text-[var(--gold)]" />
            </div>
          )}
          {userName && (
            <span className="hidden text-sm font-medium sm:block">{userName}</span>
          )}
        </Link>
      </div>
    </nav>
  );
}
