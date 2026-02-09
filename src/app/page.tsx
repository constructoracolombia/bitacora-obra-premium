import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, Calendar, ClipboardList, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-5xl px-8 py-12">
        {/* Welcome */}
        <section className="mb-12">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1D1D1F]">
            Bienvenido
          </h1>
          <p className="mt-2 text-lg text-[#86868B]">
            Gestiona el progreso de tus proyectos de construcción.
          </p>
        </section>

        {/* Quick stats */}
        <section className="mb-12 grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6 transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#007AFF]/10">
                <Calendar className="size-5 text-[#007AFF]" />
              </div>
              <div>
                <p className="text-sm text-[#86868B]">Fecha</p>
                <p className="text-[15px] font-medium text-[#1D1D1F]">
                  {format(new Date(), "d MMM yyyy", { locale: es })}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6 transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#34C759]/10">
                <TrendingUp className="size-5 text-[#34C759]" />
              </div>
              <div>
                <p className="text-sm text-[#86868B]">Estado general</p>
                <p className="text-[15px] font-medium text-[#1D1D1F]">En progreso</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D2D2D7]/60 bg-white p-6 transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#FF9500]/10">
                <ClipboardList className="size-5 text-[#FF9500]" />
              </div>
              <div>
                <p className="text-sm text-[#86868B]">Proyectos</p>
                <p className="text-[15px] font-medium text-[#1D1D1F]">Sincronizados</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section>
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-xl bg-[#007AFF] px-6 py-3 text-[15px] font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#0051D5] hover:shadow-md"
          >
            Ir al Dashboard
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </section>
      </main>
    </div>
  );
}
