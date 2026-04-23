"use client";

import { useState, useEffect } from "react";

const ACCESS_KEY = "cc2026";
const STORAGE_KEY = "bitacora_access";

export function KeyGuard({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setUnlocked(localStorage.getItem(STORAGE_KEY) === ACCESS_KEY);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === ACCESS_KEY) {
      localStorage.setItem(STORAGE_KEY, ACCESS_KEY);
      setUnlocked(true);
    } else {
      setError(true);
      setInput("");
    }
  }

  if (unlocked === null) return null;

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-sm flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9-6V9a7 7 0 10-14 0v2M5 21h14a2 2 0 002-2v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Bitácora Obra</h1>
          <p className="text-sm text-gray-500 text-center">Ingresa la clave para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            placeholder="Clave de acceso"
            autoFocus
            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
              error
                ? "border-red-400 bg-red-50 placeholder-red-400 text-red-600"
                : "border-gray-200 bg-gray-50 text-gray-800 focus:border-blue-400 focus:bg-white"
            }`}
          />
          {error && (
            <p className="text-xs text-red-500 text-center">Clave incorrecta. Intenta de nuevo.</p>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
