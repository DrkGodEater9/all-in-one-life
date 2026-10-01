import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseDateKey } from "@/lib/utils";
import { dateKeySchema, queryObject } from "../_lib";
import { z } from "zod";

const querySchema = z.object({
  from: dateKeySchema.optional(),
  to: dateKeySchema.optional(),
});

/**
 * GET /api/calendar/task-days ?from=&to=
 * Tareas con fecha en el rango (sin las ya hechas), reducidas a lo que
 * necesita el calendario para pintar un punto de su color por día.
 * `labelColor` es el color de su primera etiqueta (null si no tiene).
 */
export const GET = withAuth(async ({ searchParams }) => {
  const { from, to } = querySchema.parse(queryObject(searchParams));

  const tasks = await prisma.task.findMany({
    where: {
      status: { not: "done" },
      date: {
        not: null,
        ...(from ? { gte: parseDateKey(from) } : {}),
        ...(to ? { lte: parseDateKey(to) } : {}),
      },
    },
    select: {
      id: true,
      date: true,
      urgent: true,
      important: true,
      labels: {
        orderBy: { labelId: "asc" },
        take: 1,
        select: { label: { select: { color: true } } },
      },
    },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });

  return ok(
    tasks.map((t) => ({
      id: t.id,
      date: t.date!.toISOString().slice(0, 10),
      urgent: t.urgent,
      important: t.important,
      labelColor: t.labels[0]?.label.color ?? null,
    }))
  );
});
