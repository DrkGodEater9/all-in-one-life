import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { NutritionClient } from "@/components/modules/nutrition/NutritionClient";

export const metadata: Metadata = {
  title: "Nutrición",
};

export default function NutritionPage() {
  return (
    <>
      <PageHeader
        title="Nutrición"
        description="Calorías, macros, peso e hidratación del día."
      />
      <NutritionClient />
    </>
  );
}
