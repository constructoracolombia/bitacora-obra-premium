'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  FolderKanban,
  PlusCircle,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    proyectos: { activos: 0, total: 0 },
    adicionales: { pendientes: 0, total: 0 },
    requisiciones: { pendientes: 0, total: 0 },
  });

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  async function cargarEstadisticas() {
    try {
      const supabase = createClient();

      const [proyectosRes, adicionalesRes, requisicionesRes] = await Promise.all([
        supabase.from('proyectos_maestro').select('estado'),
        supabase.from('adicionales').select('estado'),
        supabase.from('requisiciones').select('estado'),
      ]);

      const proyectos = proyectosRes.data ?? [];
      const adicionales = adicionalesRes.data ?? [];
      const requisiciones = requisicionesRes.data ?? [];

      setStats({
        proyectos: {
          activos: proyectos.filter((p) => p.estado === 'ACTIVO').length,
          total: proyectos.length,
        },
        adicionales: {
          pendientes: adicionales.filter((a) => a.estado !== 'FINALIZADO').length,
          total: adicionales.length,
        },
        requisiciones: {
          pendientes: requisiciones.filter((r) => r.estado !== 'RECIBIDO').length,
          total: requisiciones.length,
        },
      });
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  }

  const modulos = [
    {
      titulo: 'Proyectos',
      descripcion: 'Gestiona tus obras y clientes',
      icono: FolderKanban,
      color: 'bg-blue-50 text-blue-600',
      borderColor: 'border-blue-200',
      ruta: '/proyectos',
      stats: {
        principal: `${stats.proyectos.activos} activos`,
        secundario: `${stats.proyectos.total} total`,
      },
    },
    {
      titulo: 'Adicionales',
      descripcion: 'Control de trabajos adicionales',
      icono: PlusCircle,
      color: 'bg-green-50 text-green-600',
      borderColor: 'border-green-200',
      ruta: '/adicionales',
      stats: {
        principal: `${stats.adicionales.pendientes} pendientes`,
        secundario: `${stats.adicionales.total} total`,
      },
    },
    {
      titulo: 'Requisiciones',
      descripcion: 'Solicitudes de material',
      icono: Package,
      color: 'bg-orange-50 text-orange-600',
      borderColor: 'border-orange-200',
      ruta: '/requisiciones',
      stats: {
        principal: `${stats.requisiciones.pendientes} por recibir`,
        secundario: `${stats.requisiciones.total} total`,
      },
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl p-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="mb-2 text-3xl font-semibold text-gray-900">
            Centro de Operaciones
          </h1>
          <p className="text-gray-600">
            {new Date().toLocaleDateString('es-CO', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Módulos Grid */}
        <div className="mb-12 grid gap-6 md:grid-cols-3">
          {modulos.map((modulo) => {
            const Icono = modulo.icono;
            return (
              <button
                key={modulo.titulo}
                onClick={() => router.push(modulo.ruta)}
                className={`group relative overflow-hidden rounded-2xl border-2 ${modulo.borderColor} bg-white p-8 text-left transition-all hover:scale-[1.02] hover:shadow-lg`}
              >
                {/* Icono */}
                <div className={`mb-6 inline-flex rounded-xl p-4 ${modulo.color}`}>
                  <Icono className="h-8 w-8" />
                </div>

                {/* Contenido */}
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  {modulo.titulo}
                </h3>
                <p className="mb-6 text-sm text-gray-600">
                  {modulo.descripcion}
                </p>

                {/* Stats */}
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900">
                    {modulo.stats.principal}
                  </p>
                  <p className="text-sm text-gray-500">
                    {modulo.stats.secundario}
                  </p>
                </div>

                {/* Arrow indicator */}
                <div className="absolute right-6 top-8 text-gray-400 transition-transform group-hover:translate-x-1">
                  →
                </div>
              </button>
            );
          })}
        </div>

        {/* Accesos Rápidos */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Accesos Rápidos
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            <Button
              onClick={() => router.push('/proyectos/nuevo')}
              variant="outline"
              className="justify-start"
            >
              <FolderKanban className="mr-2 h-4 w-4" />
              Nuevo Proyecto
            </Button>
            <Button
              onClick={() => router.push('/adicionales/nuevo')}
              variant="outline"
              className="justify-start"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Adicional
            </Button>
            <Button
              onClick={() => router.push('/requisiciones/nueva')}
              variant="outline"
              className="justify-start"
            >
              <Package className="mr-2 h-4 w-4" />
              Nueva Requisición
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
