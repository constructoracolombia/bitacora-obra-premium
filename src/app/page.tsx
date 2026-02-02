import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProgressChart } from "@/components/charts/ProgressChart";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, ClipboardList, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-6 py-8">
        {/* Bienvenida */}
        <section className="mb-12">
          <h2 className="mb-2 text-3xl font-bold text-foreground">
            Bienvenido a tu bitácora de obra
          </h2>
          <p className="text-muted-foreground">
            Gestiona el progreso de tus proyectos de construcción con herramientas profesionales.
          </p>
        </section>

        {/* Cards con tema personalizado */}
        <section className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center gap-2">
              <Calendar className="size-5 text-primary" />
              <CardTitle>Fecha actual</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center gap-2">
              <ClipboardList className="size-5 text-primary" />
              <CardTitle>Progreso general</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={72} className="h-2" />
              <p className="mt-2 text-sm text-muted-foreground">72% completado</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              <CardTitle>Avance semanal</CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressChart />
            </CardContent>
          </Card>
        </section>

        {/* Botones de ejemplo */}
        <section className="flex flex-wrap gap-4">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            Acción principal
          </Button>
          <Button variant="outline" className="border-white/20 hover:bg-white/5">
            Secundaria
          </Button>
          <Button variant="ghost">Ghost</Button>
        </section>
      </main>
    </div>
  );
}
