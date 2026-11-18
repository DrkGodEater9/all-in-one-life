import { z, call, qs, clean, DATE, TIME, ID } from "../lib.mjs";

const STATUS = z.enum(["pending", "in_progress", "done"]);
const QUADRANT = z
  .enum(["do", "schedule", "delegate", "eliminate"])
  .describe("Matriz de Eisenhower: do=urgente e importante, schedule=importante, delegate=urgente, eliminate=ninguna");
const RECURRENCE = z
  .object({
    frequency: z.enum(["daily", "weekly", "monthly"]),
    intervalN: z.number().int().min(1).max(365).optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    endsOn: DATE.optional(),
  })
  .describe("Repetición de la tarea");

export function register(tool) {
  tool(
    "list_tasks",
    "Tareas: lista las tareas con filtros opcionales. Estados: pending, in_progress, done.",
    {
      status: STATUS.optional(),
      quadrant: QUADRANT.optional(),
      urgent: z.boolean().optional(),
      important: z.boolean().optional(),
      label: z.string().optional().describe("Nombre o id de etiqueta"),
      q: z.string().optional().describe("Texto a buscar en título y descripción"),
      from: DATE.optional(),
      to: DATE.optional(),
    },
    (args) => call("GET", `/tasks${qs(args)}`)
  );

  tool(
    "add_task",
    "Tareas: crea una tarea. Usa quadrant o bien urgent/important. Las etiquetas que no existan se crean.",
    {
      title: z.string(),
      description: z.string().optional(),
      quadrant: QUADRANT.optional(),
      urgent: z.boolean().optional(),
      important: z.boolean().optional(),
      status: STATUS.optional(),
      date: DATE.optional().describe("Fecha límite o programada"),
      time: TIME.optional(),
      labelNames: z.array(z.string()).optional(),
      recurrence: RECURRENCE.optional(),
    },
    (args) => call("POST", "/tasks", args)
  );

  tool(
    "update_task",
    "Tareas: modifica una tarea; solo se cambian los campos enviados. Para quitar la fecha o la hora envía null.",
    {
      id: ID,
      title: z.string().optional(),
      description: z.string().nullable().optional(),
      quadrant: QUADRANT.optional(),
      urgent: z.boolean().optional(),
      important: z.boolean().optional(),
      status: STATUS.optional(),
      date: DATE.nullable().optional(),
      time: TIME.nullable().optional(),
      labelNames: z.array(z.string()).optional().describe("Reemplaza las etiquetas de la tarea"),
      recurrence: RECURRENCE.nullable().optional(),
    },
    ({ id, ...patch }) => call("PATCH", `/tasks/${id}`, clean(patch))
  );

  tool(
    "set_task_status",
    "Tareas: cambia el estado (pending, in_progress, done). Al completar una tarea recurrente se genera la siguiente.",
    { id: ID, status: STATUS },
    ({ id, status }) => call("PATCH", `/tasks/${id}/status`, { status })
  );

  tool(
    "delete_task",
    "Tareas: elimina una tarea por id. Irreversible: confírmalo antes.",
    { id: ID },
    ({ id }) => call("DELETE", `/tasks/${id}`)
  );

  tool("list_task_labels", "Tareas: lista las etiquetas con cuántas tareas usan cada una.", {}, () =>
    call("GET", "/tasks/labels")
  );

  tool(
    "add_task_label",
    "Tareas: crea una etiqueta.",
    { name: z.string(), color: z.string().optional().describe("Color, p. ej. #8b5cf6") },
    (args) => call("POST", "/tasks/labels", args)
  );

  tool(
    "delete_task_label",
    "Tareas: elimina una etiqueta por id.",
    { id: ID },
    ({ id }) => call("DELETE", `/tasks/labels/${id}`)
  );
}
