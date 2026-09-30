import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/modules/projects/ProjectDetailClient";

export const metadata: Metadata = { title: "Proyecto" };

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  return <ProjectDetailClient projectId={id} />;
}
