import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { JobsClient } from "@/components/modules/jobs/JobsClient";

export const metadata: Metadata = { title: "Empleo" };

export default function JobsPage() {
  return (
    <>
      <PageHeader
        title="Empleo"
        description="Tus postulaciones con su estado y los portales donde tienes cuenta."
      />
      <JobsClient />
    </>
  );
}
