import { z } from "zod";
import type { Prisma } from "@prisma/client";

export { parseId, emptyToNull, queryObject } from "../projects/_lib";

export const termSchema = z.string().trim().min(1, "El concepto es obligatorio").max(200);
export const definitionSchema = z
  .string()
  .trim()
  .min(1, "La explicación es obligatoria")
  .max(10000);
export const topicSchema = z.string().trim().max(80);

export const conceptFiltersSchema = z.object({
  q: z.string().trim().min(1).optional(),
  topic: z.string().trim().min(1).optional(),
});

export function conceptWhere(
  filters: z.infer<typeof conceptFiltersSchema>
): Prisma.ConceptWhereInput {
  const where: Prisma.ConceptWhereInput = {};
  if (filters.topic) where.topic = { equals: filters.topic, mode: "insensitive" };
  if (filters.q) {
    where.OR = [
      { term: { contains: filters.q, mode: "insensitive" } },
      { definition: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return where;
}
