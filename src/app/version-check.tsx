'use client';

import { useEffect } from 'react';

const CURRENT_VERSION = '2.0.0';

export function VersionCheck() {
  useEffect(() => {
    const storedVersion = localStorage.getItem('app-version');

    if (storedVersion !== CURRENT_VERSION) {
      localStorage.setItem('app-version', CURRENT_VERSION);

      // Registrar service worker para limpiar caché
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {
          // SW registration failed, continue anyway
        });
      }

      // Limpiar caché del navegador
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }

      // Recargar para obtener la versión más reciente
      window.location.reload();
    }
  }, []);

  return null;
}
