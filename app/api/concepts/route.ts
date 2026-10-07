import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { created, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import {
  conceptFiltersSchema,
  conceptWhere,
  definitionSchema,
  emptyToNull,
  queryObject,
  termSchema,
  topicSchema,
} from "./_lib";

const createSchema = z.object({
  term: termSchema,
  definition: definitionSchema,
  topic: topicSchema.nullable().optional(),
});

/** GET /api/concepts?q=&topic= — orden alfabético. */
export const GET = withAuth(async ({ searchParams }) => {
  const filters = conceptFiltersSchema.parse(queryObject(searchParams));
  const concepts = await prisma.concept.findMany({
    where: conceptWhere(filters),
    orderBy: { term: "asc" },
  });
  return ok(concepts);
});

/** POST /api/concepts */
export const POST = withAuth(async ({ req }) => {
  const data = createSchema.parse(await req.json());
  const concept = await prisma.concept.create({
    data: { term: data.term, definition: data.definition, topic: emptyToNull(data.topic) },
  });
  return created(concept);
});
