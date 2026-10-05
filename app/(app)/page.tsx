import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { BalanceWidget } from "@/components/modules/dashboard/balance-widget";
import { CaloriesWidget } from "@/components/modules/dashboard/calories-widget";
import { UpcomingEventsWidget } from "@/components/modules/dashboard/upcoming-events-widget";
import { UrgentTasksWidget } from "@/components/modules/dashboard/urgent-tasks-widget";
import { StreaksSection } from "@/components/modules/dashboard/streaks-section";
import { ProjectsWidget } from "@/components/modules/dashboard/projects-widget";
import { ServiceWorkerRegister } from "@/components/modules/dashboard/service-worker-register";

export const metadata: Metadata = {
  title: "Personal OS",
  description: "Resumen del día: saldo, calorías, agenda, tareas, proyectos y rachas.",
};

/**
 * Dashboard home ("/"). Cada widget carga su propio dato de forma
 * independiente (ver `components/modules/dashboard/*-widget.tsx`): si la API
 * de un módulo falla, solo ese widget muestra un error discreto y el resto
 * del dashboard sigue funcionando.
 */
export default function HomePage() {
  return (
    <>
      <ServiceWorkerRegister />
      <PageHeader title="Home" description="Resumen del día en un vistazo." />
      <div className="grid gap-4 md:grid-cols-2">
        <BalanceWidget />
        <CaloriesWidget />
        <UpcomingEventsWidget />
        <UrgentTasksWidget />
        <ProjectsWidget />
      </div>
      <StreaksSection />
    </>
  );
}
