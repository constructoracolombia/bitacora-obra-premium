'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { LayoutGrid, Table2 } from 'lucide-react';
import { UploadZone } from '@/components/planimetro/UploadZone';
import { ResultadosAreas } from '@/components/planimetro/ResultadosAreas';
import type { ResultadoPlanimetro } from '@/components/planimetro/types';

// Three.js solo en cliente
const Modelo3D = dynamic(
  () => import('@/components/planimetro/Modelo3D').then((m) => m.Modelo3D),
  { ssr: false, loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#007AFF] border-t-transparent" />
    </div>
  )}
);

type Vista = '3d' | 'tabla';

export default function PlanimetroPage() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoPlanimetro | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>('3d');

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      const form = new FormData();
      form.append('file', file);

      const esDxf = file.name.toLowerCase().endsWith('.dxf');
      const endpoint = esDxf ? '/api/planimetro/analizar-dxf' : '/api/planimetro/analizar';

      const res = await fetch(endpoint, {
        method: 'POST',
        body: form,
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Error al analizar el plano');
      }

      setResultado(json.data as ResultadoPlanimetro);
      setVista('3d');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Planimetría IA</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sube un plano arquitectónico (foto, escaneo o PDF) y obtén áreas de piso y muros automáticamente
          </p>
        </div>

        {/* Upload */}
        <div className="mb-8">
          <UploadZone onFile={handleFile} loading={loading} />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">Error al analizar el plano</p>
            <p className="mt-1 text-xs text-red-500">{error}</p>
          </div>
        )}

        {/* Resultados */}
        {resultado && (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
              <button
                onClick={() => setVista('3d')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  vista === '3d'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Modelo 3D
              </button>
              <button
                onClick={() => setVista('tabla')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  vista === 'tabla'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Table2 className="h-4 w-4" />
                Tabla de Áreas
              </button>
            </div>

            {/* Contenido según vista */}
            {vista === '3d' && <Modelo3D data={resultado} />}
            {vista === 'tabla' && <ResultadosAreas data={resultado} />}
          </div>
        )}

        {/* Estado vacío inicial */}
        {!resultado && !loading && !error && (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
              <LayoutGrid className="h-7 w-7 text-gray-400" />
            </div>
            <p className="font-medium text-gray-700">El modelo 3D aparecerá aquí</p>
            <p className="mt-1 text-sm text-gray-400">Sube un plano para comenzar el análisis</p>
          </div>
        )}
      </div>
    </div>
  );
}
