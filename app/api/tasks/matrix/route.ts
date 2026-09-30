import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import {
  OPEN_STATUSES,
  quadrantOf,
  type MatrixDTO,
} from "@/components/modules/tasks/constants";
import { taskInclude, taskOrderBy, toTaskDTO } from "../_lib";

/**
 * GET /api/tasks/matrix
 * Matriz de Eisenhower: las tareas abiertas (`pending` e `in_progress`)
 * agrupadas por los booleanos `urgent`/`important`.
 *
 *   do        → urgente ✓ importante ✓   ("Hacer ya")
 *   schedule  → urgente ✗ importante ✓   ("Agendar")
 *   delegate  → urgente ✓ importante ✗   ("Delegar")
 *   eliminate → urgente ✗ importante ✗   ("Eliminar")
 */
export const GET = withAuth(async () => {
  const tasks = await prisma.task.findMany({
    where: { status: { in: [...OPEN_STATUSES] } },
    include: taskInclude,
    orderBy: taskOrderBy,
  });

  const matrix: MatrixDTO = { do: [], schedule: [], delegate: [], eliminate: [] };
  for (const task of tasks) {
    matrix[quadrantOf(task.urgent, task.important)].push(toTaskDTO(task));
  }

  return ok(matrix);
});
