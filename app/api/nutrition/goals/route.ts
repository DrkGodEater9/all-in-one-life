import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { getGoal } from "../_shared";

const bodySchema = z.object({
  kcal: z.number().int().min(500).max(10000),
  proteinG: z.number().int().min(0).max(1000),
  carbsG: z.number().int().min(0).max(2000),
  fatG: z.number().int().min(0).max(500),
});

/** GET /api/nutrition/goals — la fila única, o la meta por defecto. */
export const GET = withAuth(async () => ok(await getGoal()));

/** PUT /api/nutrition/goals — actualiza la fila única (la crea si no existe). */
export const PUT = withAuth(async ({ req }) => {
  const data = bodySchema.parse(await req.json());

  const existing = await prisma.nutritionGoal.findFirst({ orderBy: { id: "asc" } });
  const goal = existing
    ? await prisma.nutritionGoal.update({
        where: { id: existing.id },
        data: { ...data, updatedAt: new Date() },
      })
    : await prisma.nutritionGoal.create({ data });

  return ok(goal);
});
