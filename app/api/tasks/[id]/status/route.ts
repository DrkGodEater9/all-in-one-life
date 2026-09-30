import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { applyStatusChange, parseId, statusSchema, toTaskDTO } from "../../_lib";

/**
 * PATCH /api/tasks/[id]/status
 * Mueve la tarea entre `pending | in_progress | done`. Sella `doneAt` al
 * completarla y lo limpia al reabrirla; si la tarea es recurrente, al pasar a
 * `done` se genera la siguiente ocurrencia en la misma transacción.
 */
export const PATCH = withAuth<{ id: string }>(async ({ req, params }) => {
  const id = parseId(params.id);
  const { status } = statusSchema.parse(await req.json());
  return ok(toTaskDTO(await applyStatusChange(id, status)));
});
