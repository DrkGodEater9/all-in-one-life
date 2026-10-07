import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConceptsClient } from "@/components/modules/concepts/ConceptsClient";

export const metadata: Metadata = { title: "Conceptos" };

export default function ConceptsPage() {
  return (
    <>
      <PageHeader
        title="Conceptos"
        description="Tu glosario personal: concepto, explicación y a buscar."
      />
      <ConceptsClient />
    </>
  );
}
