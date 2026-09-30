import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { TasksClient } from "@/components/modules/tasks/TasksClient";

export const metadata: Metadata = {
  title: "Tareas",
};

export default function TasksPage() {
  return (
    <>
      <PageHeader
        title="Tareas"
        description="Matriz de Eisenhower y lista completa. Arrastra una tarea para cambiarla de cuadrante."
      />
      <TasksClient />
    </>
  );
}
