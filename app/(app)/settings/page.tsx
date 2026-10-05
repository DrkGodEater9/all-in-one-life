import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsClient } from "@/components/modules/settings/settings-client";

export const metadata: Metadata = {
  title: "Configuración — Personal OS",
  description: "Metas nutricionales, zona horaria, agua y tema.",
};

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Configuración"
        description="Metas nutricionales, zona horaria, objetivo de agua y tema."
      />
      <SettingsClient />
    </>
  );
}
