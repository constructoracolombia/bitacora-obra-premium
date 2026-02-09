"use client";

import { ToastProvider } from "@/components/Toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GlobalSearch } from "@/components/GlobalSearch";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <GlobalSearch />
        {children}
      </ToastProvider>
    </ThemeProvider>
  );
}
