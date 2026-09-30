import { notFound } from "next/navigation";
import { ActiveWorkout } from "@/components/modules/gym/ActiveWorkout";

export const metadata = { title: "Entreno" };

export default function WorkoutPage({ params }: { params: { id: string } }) {
  const workoutId = Number(params.id);
  if (!Number.isInteger(workoutId) || workoutId <= 0) notFound();

  return <ActiveWorkout workoutId={workoutId} />;
}
