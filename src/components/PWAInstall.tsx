"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("pwa-install-dismissed");
    if (stored === "true") setDismissed(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!dismissed) setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  async function handleInstall() {
    if (!deferredPrompt) return;
    const ev = deferredPrompt as { prompt: () => void; userChoice: Promise<{ outcome: string }> };
    ev.prompt();
    const { outcome } = await ev.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
  }

  if (!showBanner || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:left-auto sm:right-4">
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
          <Download className="size-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-[#2D3748]">Instalar Bitácora Obra</p>
          <p className="text-sm text-gray-600">
            Instala la app para acceso rápido desde tu pantalla de inicio.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleInstall}
            >
              Instalar
            </Button>
            <Button size="sm" variant="outline" onClick={handleDismiss}>
              Ahora no
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={handleDismiss}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
