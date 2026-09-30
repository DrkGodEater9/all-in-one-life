import { PageHeader } from "@/components/layout/PageHeader";
import { GymClient } from "@/components/modules/gym/GymClient";

export const metadata = { title: "Gym" };

export default function GymPage() {
  return (
    <>
      <PageHeader
        title="Gym"
        description="Rutinas, entrenos, progreso y medidas."
      />
      <GymClient />
    </>
  );
}
