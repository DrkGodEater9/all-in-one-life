import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectsClient } from "@/components/modules/projects/ProjectsClient";

export const metadata: Metadata = { title: "Proyectos" };

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        title="Proyectos"
        description="Ideas, experimentos y cosas en marcha."
      />
      <ProjectsClient />
    </>
  );
}
