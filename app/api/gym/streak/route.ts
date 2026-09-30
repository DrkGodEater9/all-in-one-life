import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { monthKeySchema } from "@/app/api/gym/_lib";

const querySchema = z.object({ month: monthKeySchema.optional() });

/** Racha del mes: días entrenados / días del mes. */
export const GET = withAuth(async ({ searchParams }) => {
  const { month } = querySchema.parse(Object.fromEntries(searchParams));

  // getUTC*, no los locales: sin `month` explícito, el default debe caer en
  // el mismo día UTC que usan las columnas @db.Date de la consulta de abajo
  // (mismo bug ya corregido en nutrition/streak). El cliente igual manda su
  // mes local explícito (ver ProgressTab.tsx) — esto es solo el fallback.
  const now = new Date();
  const [year, monthNumber] = month
    ? month.split("-").map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];

  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  const workouts = await prisma.gymWorkout.findMany({
    where: { date: { gte: start, lt: end } },
    select: { date: true },
  });

  const days = Array.from(new Set(workouts.map((w) => w.date.getUTCDate()))).sort((a, b) => a - b);

  return ok({
    month: `${year}-${String(monthNumber).padStart(2, "0")}`,
    daysInMonth,
    daysTrained: days.length,
    workoutCount: workouts.length,
    days,
  });
});
