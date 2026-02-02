"use client";

import { ToastProvider } from "@/components/Toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { PWAInstall } from "@/components/PWAInstall";
import { GlobalSearch } from "@/components/GlobalSearch";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ServiceWorkerRegistration />
        <GlobalSearch />
        {children}
        <PWAInstall />
      </ToastProvider>
    </ThemeProvider>
  );
}
