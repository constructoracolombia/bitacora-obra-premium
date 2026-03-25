'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import {
  FolderKanban,
  PlusCircle,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Pendiente {
  id: string;
  descripcion: string;
  proyecto_id: string | null;
  completado: boolean;
  completado_at: string | null;
  created_at: string;
}

interface ProyectoOption {
  id: string;
  cliente_nombre: string | null;
}

export default function DashboardPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();

  const [stats, setStats] = useState({
    proyectos: { activos: 0, total: 0 },
    adicionales: { pendientes: 0, total: 0 },
    requisiciones: { pendientes: 0, total: 0 },
  });

  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoOption[]>([]);
  const [nuevaDesc, setNuevaDesc] = useState('');
  const [nuevoProyectoId, setNuevoProyectoId] = useState('');
  const [agregando, setAgregando] = useState(false);
  const [mostrarCompletados, setMostrarCompletados] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cargarEstadisticas();
    cargarPendientes();
    cargarProyectos();
  }, []);

  async function cargarEstadisticas() {
    try {
      const [proyectosRes, adicionalesRes, requisicionesRes] = await Promise.all([
        supabase.from('proyectos_maestro').select('estado'),
        supabase.from('adicionales').select('estado'),
        supabase.from('requisiciones').select('estado'),
      ]);
      const proyectosData = proyectosRes.data ?? [];
      const adicionalesData = adicionalesRes.data ?? [];
      const requisicionesData = requisicionesRes.data ?? [];
      setStats({
        proyectos: {
          activos: proyectosData.filter((p) => p.estado === 'ACTIVO').length,
          total: proyectosData.length,
        },
        adicionales: {
          pendientes: adicionalesData.filter((a) => a.estado !== 'FINALIZADO').length,
          total: adicionalesData.length,
        },
        requisiciones: {
          pendientes: requisicionesData.filter((r) => r.estado !== 'RECIBIDO').length,
          total: requisicionesData.length,
        },
      });
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  }

  async function cargarPendientes() {
    try {
      const { data } = await supabase
        .from('pendientes')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setPendientes(data as Pendiente[]);
    } catch (err) {
      console.error('Error cargando pendientes:', err);
    }
  }

  async function cargarProyectos() {
    try {
      const { data } = await supabase
        .from('proyectos_maestro')
        .select('id, cliente_nombre')
        .order('cliente_nombre');
      if (data) setProyectos(data as ProyectoOption[]);
    } catch (err) {
      console.error('Error cargando proyectos:', err);
    }
  }

  async function agregarPendiente() {
    if (!nuevaDesc.trim()) return;
    setAgregando(true);
    try {
      const { data, error } = await supabase
        .from('pendientes')
        .insert({
          descripcion: nuevaDesc.trim(),
          proyecto_id: nuevoProyectoId || null,
          completado: false,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) setPendientes((prev) => [data as Pendiente, ...prev]);
      setNuevaDesc('');
      setNuevoProyectoId('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Error agregando pendiente:', err);
    } finally {
      setAgregando(false);
    }
  }

  async function toggleCompletado(p: Pendiente) {
    const nuevoValor = !p.completado;
    setPendientes((prev) =>
      prev.map((x) =>
        x.id === p.id
          ? { ...x, completado: nuevoValor, completado_at: nuevoValor ? new Date().toISOString() : null }
          : x
      )
    );
    try {
      await supabase
        .from('pendientes')
        .update({
          completado: nuevoValor,
          completado_at: nuevoValor ? new Date().toISOString() : null,
        })
        .eq('id', p.id);
    } catch (err) {
      console.error('Error actualizando pendiente:', err);
      cargarPendientes();
    }
  }

  async function eliminarPendiente(id: string) {
    setPendientes((prev) => prev.filter((p) => p.id !== id));
    try {
      await supabase.from('pendientes').delete().eq('id', id);
    } catch (err) {
      console.error('Error eliminando pendiente:', err);
      cargarPendientes();
    }
  }

  function getNombreProyecto(proyecto_id: string | null) {
    if (!proyecto_id) return null;
    const p = proyectos.find((x) => x.id === proyecto_id);
    return p?.cliente_nombre ?? null;
  }

  const pendientesActivos = pendientes.filter((p) => !p.completado);
  const pendientesCompletados = pendientes.filter((p) => p.completado);

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
        <div className="mb-12">
          <h1 className="mb-2 text-3xl font-semibold text-gray-900">Centro de Operaciones</h1>
          <p className="text-gray-600">
            {new Date().toLocaleDateString('es-CO', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>

        <div className="mb-12 grid gap-6 md:grid-cols-3">
          {modulos.map((modulo) => {
            const Icono = modulo.icono;
            return (
              <button
                key={modulo.titulo}
                onClick={() => router.push(modulo.ruta)}
                className={`group relative overflow-hidden rounded-2xl border-2 ${modulo.borderColor} bg-white p-8 text-left transition-all hover:scale-[1.02] hover:shadow-lg`}
              >
                <div className={`mb-6 inline-flex rounded-xl p-4 ${modulo.color}`}>
                  <Icono className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">{modulo.titulo}</h3>
                <p className="mb-6 text-sm text-gray-600">{modulo.descripcion}</p>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900">{modulo.stats.principal}</p>
                  <p className="text-sm text-gray-500">{modulo.stats.secundario}</p>
                </div>
                <div className="absolute right-6 top-8 text-gray-400 transition-transform group-hover:translate-x-1">→</div>
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Accesos Rápidos</h3>
            <div className="flex flex-col gap-3">
              <Button onClick={() => router.push('/proyectos/nuevo')} variant="outline" className="justify-start">
                <FolderKanban className="mr-2 h-4 w-4" />Nuevo Proyecto
              </Button>
              <Button onClick={() => router.push('/adicionales/nuevo')} variant="outline" className="justify-start">
                <PlusCircle className="mr-2 h-4 w-4" />Nuevo Adicional
              </Button>
              <Button onClick={() => router.push('/requisiciones/nueva')} variant="outline" className="justify-start">
                <Package className="mr-2 h-4 w-4" />Nueva Requisición
              </Button>
            </div>
          </div>

          <div className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Pendientes</h3>
              {pendientesActivos.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#007AFF] text-[11px] font-bold text-white">
                  {pendientesActivos.length}
                </span>
              )}
            </div>

            <div className="mb-5 rounded-xl bg-[#F5F5F7] p-3 space-y-2">
              <input
                ref={inputRef}
                value={nuevaDesc}
                onChange={(e) => setNuevaDesc(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') agregarPendiente(); }}
                placeholder="Nueva tarea pendiente..."
                className="w-full rounded-lg border border-[#D2D2D7] bg-white px-3 py-2 text-[14px] text-[#1D1D1F] placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10"
              />
              <div className="flex gap-2">
                <select
                  value={nuevoProyectoId}
                  onChange={(e) => setNuevoProyectoId(e.target.value)}
                  className="flex-1 h-9 rounded-lg border border-[#D2D2D7] bg-white px-3 text-[13px] text-[#1D1D1F] focus:border-[#007AFF] focus:outline-none"
                >
                  <option value="">Sin proyecto</option>
                  {proyectos.map((p) => (
                    <option key={p.id} value={p.id}>{p.cliente_nombre || 'Sin nombre'}</option>
                  ))}
                </select>
                <button
                  onClick={agregarPendiente}
                  disabled={!nuevaDesc.trim() || agregando}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-[#007AFF] px-4 text-[13px] font-medium text-white hover:bg-[#0066DD] disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />Agregar
                </button>
              </div>
            </div>

            <div className="space-y-1">
              {pendientesActivos.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-[#86868B]">🎉 Sin pendientes. ¡Todo al día!</p>
              ) : (
                pendientesActivos.map((p) => (
                  <PendienteItem
                    key={p.id}
                    pendiente={p}
                    nombreProyecto={getNombreProyecto(p.proyecto_id)}
                    onToggle={() => toggleCompletado(p)}
                    onDelete={() => eliminarPendiente(p.id)}
                  />
                ))
              )}
            </div>

            {pendientesCompletados.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setMostrarCompletados(!mostrarCompletados)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-[13px] text-[#86868B] hover:bg-[#F5F5F7] transition-colors"
                >
                  <span>{pendientesCompletados.length} completados</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${mostrarCompletados ? 'rotate-180' : ''}`} />
                </button>
                {mostrarCompletados && (
                  <div className="mt-1 space-y-1 opacity-60">
                    {pendientesCompletados.map((p) => (
                      <PendienteItem
                        key={p.id}
                        pendiente={p}
                        nombreProyecto={getNombreProyecto(p.proyecto_id)}
                        onToggle={() => toggleCompletado(p)}
                        onDelete={() => eliminarPendiente(p.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PendienteItem({
  pendiente,
  nombreProyecto,
  onToggle,
  onDelete,
}: {
  pendiente: Pendiente;
  nombreProyecto: string | null;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-[#F5F5F7] transition-colors">
      <button onClick={onToggle} className="mt-0.5 shrink-0">
        {pendiente.completado ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Circle className="h-5 w-5 text-[#C7C7CC] hover:text-[#007AFF]" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] leading-snug ${pendiente.completado ? 'text-[#86868B] line-through' : 'text-[#1D1D1F] font-medium'}`}>
          {pendiente.descripcion}
        </p>
        {nombreProyecto && (
          <span className="mt-1 inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
            {nombreProyecto}
          </span>
        )}
      </div>
      <button
        onClick={onDelete}
        className="mt-0.5 shrink-0 p-1 rounded-lg text-[#FF3B30] opacity-0 group-hover:opacity-100 hover:bg-[#FF3B30]/10 transition-all"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
