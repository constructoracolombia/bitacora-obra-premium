'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SUPABASE_CLIENT = createClient(
  'https://ngawmyhrfgdckjyynhbr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nYXdteWhyZmdkY2tqeXluaGJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTM3MzQsImV4cCI6MjA4NTE4OTczNH0.Drp40nu7XyRz6dWmlbgGBiqdSxlwPzubj-lX48N6JSs'
);

interface Proyecto {
  id: string;
  cliente_nombre: string;
  direccion: string;
  presupuesto_total: number;
  fecha_inicio: string;
  fecha_entrega_estimada: string;
  estado: string;
  margen_objetivo: number;
  app_origen: string;
}

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'TODOS' | 'ACTIVO' | 'PAUSADO' | 'FINALIZADO'>('ACTIVO');
  const router = useRouter();

  useEffect(() => {
    cargarProyectos();
  }, [filtro]);

  async function cargarProyectos() {
    setLoading(true);
    console.log('🔍 Cargando proyectos con filtro:', filtro);

    try {
      let query = SUPABASE_CLIENT
        .from('proyectos_maestro')
        .select('*')
        .order('created_at', { ascending: false });

      if (filtro !== 'TODOS') {
        query = query.eq('estado', filtro);
      }

      const { data, error } = await query;

      console.log('✅ Datos:', data);
      console.log('❌ Error:', error);

      if (error) {
        console.error('Error detallado:', error);
        return;
      }

      setProyectos(data || []);
    } catch (err) {
      console.error('Exception:', err);
    } finally {
      setLoading(false);
    }
  }

  const formatoCOP = (valor: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(valor);
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Proyectos</h1>
          <Button
            onClick={() => router.push('/proyectos/nuevo')}
            className="bg-[#007AFF] text-white shadow-sm hover:bg-[#0051D5]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proyecto
          </Button>
        </div>

        <div className="mb-6 flex gap-2">
          {(['TODOS', 'ACTIVO', 'PAUSADO', 'FINALIZADO'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filtro === f
                  ? 'bg-[#007AFF] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'TODOS' ? 'Todos' : f.charAt(0) + f.slice(1).toLowerCase() + 's'}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#007AFF] border-r-transparent"></div>
          </div>
        )}

        {!loading && proyectos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Building2 className="mb-4 h-16 w-16 text-gray-300" />
            <p className="text-gray-600">
              No hay proyectos{filtro !== 'TODOS' ? ` ${filtro.toLowerCase()}s` : ''}
            </p>
          </div>
        )}

        {!loading && proyectos.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {proyectos.map((proyecto) => (
              <div
                key={proyecto.id}
                onClick={() => router.push(`/proyectos/${proyecto.id}`)}
                className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {proyecto.cliente_nombre}
                    </h3>
                    {proyecto.direccion && (
                      <p className="mt-1 text-sm text-gray-600">{proyecto.direccion}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      proyecto.estado === 'ACTIVO'
                        ? 'bg-green-50 text-green-700'
                        : proyecto.estado === 'PAUSADO'
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    {proyecto.estado}
                  </span>
                </div>

                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Presupuesto</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatoCOP(proyecto.presupuesto_total)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Inicio</span>
                    <span className="text-sm text-gray-900">
                      {new Date(proyecto.fecha_inicio).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                </div>

                {proyecto.app_origen === 'FINANZAS' && (
                  <div className="mt-4 rounded-lg bg-blue-50 px-3 py-2">
                    <p className="text-xs text-blue-700">Sincronizado desde Finanzas</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
