/**
 * Helpers compartidos por las rutas de `/api/tasks`.
 *
 * No es una route: Next solo trata como endpoint los archivos `route.ts`.
 */
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest, notFound } from "@/lib/http";
import { formatTime, parseDateKey, parseTime } from "@/lib/utils";
import {
  QUADRANTS,
  QUADRANT_FLAGS,
  RECURRENCE_FREQUENCIES,
  TASK_STATUSES,
  quadrantOf,
  type QuadrantKey,
  type RecurrenceFrequency,
  type TaskDTO,
  type TaskStatus,
} from "@/components/modules/tasks/constants";

// ─────────────────────────────────────────
// Utilidades de request
// ─────────────────────────────────────────

/** `params.id` numérico. Lanza 400 si no es un entero positivo. */
export function parseId(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("id inválido");
  return id;
}

/** Convierte un `URLSearchParams` en objeto plano, omitiendo valores vacíos. */
export function queryObject(searchParams: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (value !== "") out[key] = value;
  });
  return out;
}

// ─────────────────────────────────────────
// Esquemas base
// ─────────────────────────────────────────

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido, se espera YYYY-MM-DD");

export const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Formato de hora inválido, se espera HH:mm");

/**
 * Los booleanos de un querystring llegan como texto: `?urgent=true`.
 * Zod no los coerciona bien con `z.coerce.boolean()` (que convierte
 * `"false"` en `true`), así que se mapean a mano.
 */
export const booleanQuerySchema = z
  .enum(["true", "false", "1", "0"], {
    errorMap: () => ({ message: "Se espera true o false" }),
  })
  .transform((value) => value === "true" || value === "1");

export const labelInputSchema = {
  labelIds: z.array(z.number().int().positive()).max(20).optional(),
  labelNames: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
};

export const recurrenceInputSchema = z.object({
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  intervalN: z.number().int().min(1).max(365).default(1),
  dayOfMonth: z.number().int().min(1).max(31).nullish(),
  endsOn: dateKeySchema.nullish(),
});

export type RecurrenceInput = z.infer<typeof recurrenceInputSchema>;

// ─────────────────────────────────────────
// Esquemas de tarea
// ─────────────────────────────────────────

const titleSchema = z.string().trim().min(1, "El título es obligatorio").max(200);
const descriptionSchema = z.string().trim().max(2000).nullish();

export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  /** Atajo del selector visual: fija `urgent` e `important` de una. */
  quadrant: z.enum(QUADRANTS).optional(),
  urgent: z.boolean().optional(),
  important: z.boolean().optional(),
  status: z.enum(TASK_STATUSES).default("pending"),
  date: dateKeySchema.nullish(),
  time: timeSchema.nullish(),
  recurrence: recurrenceInputSchema.nullish(),
  ...labelInputSchema,
});

/** PUT reemplaza la tarea entera: lo que no venga se limpia. */
export const putTaskSchema = createTaskSchema;

/** PATCH aplica parches parciales; es lo que dispara el drag & drop. */
export const patchTaskSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema,
    quadrant: z.enum(QUADRANTS).optional(),
    urgent: z.boolean().optional(),
    important: z.boolean().optional(),
    status: z.enum(TASK_STATUSES).optional(),
    date: dateKeySchema.nullish(),
    time: timeSchema.nullish(),
    recurrence: recurrenceInputSchema.nullish(),
    ...labelInputSchema,
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "El parche no puede estar vacío",
  });

export const statusSchema = z.object({ status: z.enum(TASK_STATUSES) });

export const taskFiltersSchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  urgent: booleanQuerySchema.optional(),
  important: booleanQuerySchema.optional(),
  /** Nombre o id de etiqueta. */
  label: z.string().min(1).optional(),
  quadrant: z.enum(QUADRANTS).optional(),
  /** Búsqueda por texto en título y descripción. */
  q: z.string().min(1).optional(),
  from: dateKeySchema.optional(),
  to: dateKeySchema.optional(),
});

export type TaskFilters = z.infer<typeof taskFiltersSchema>;

export const createLabelSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(40),
  color: z.string().trim().min(1).max(32).nullish(),
});

// ─────────────────────────────────────────
// Consultas
// ─────────────────────────────────────────

export const taskInclude = {
  labels: { include: { label: true } },
  recurrence: true,
} satisfies Prisma.TaskInclude;

export type TaskWithRelations = Prisma.TaskGetPayload<{
  include: typeof taskInclude;
}>;

/** Cliente de Prisma o cliente de transacción: ambos sirven a los helpers. */
type Db = Prisma.TransactionClient | typeof prisma;

export const taskOrderBy: Prisma.TaskOrderByWithRelationInput[] = [
  { date: { sort: "asc", nulls: "last" } },
  { time: { sort: "asc", nulls: "last" } },
  { id: "desc" },
];

/** Traduce los filtros del querystring a un `where` de Prisma. */
export function taskWhere(filters: TaskFilters): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.urgent !== undefined) where.urgent = filters.urgent;
  if (filters.important !== undefined) where.important = filters.important;

  if (filters.quadrant) {
    const flags = QUADRANT_FLAGS[filters.quadrant];
    where.urgent = flags.urgent;
    where.important = flags.important;
  }

  if (filters.label) {
    // `?label=` acepta tanto el id numérico como el nombre exacto.
    const asId = Number(filters.label);
    where.labels = {
      some:
        Number.isInteger(asId) && asId > 0
          ? { labelId: asId }
          : { label: { name: filters.label } },
    };
  }

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.from || filters.to) {
    where.date = {
      ...(filters.from ? { gte: parseDateKey(filters.from) } : {}),
      ...(filters.to ? { lte: parseDateKey(filters.to) } : {}),
    };
  }

  return where;
}

export async function findTaskOrThrow(
  id: number,
  client: Db = prisma
): Promise<TaskWithRelations> {
  const task = await client.task.findUnique({ where: { id }, include: taskInclude });
  if (!task) throw notFound("Tarea no encontrada");
  return task;
}

// ─────────────────────────────────────────
// Serialización
// ─────────────────────────────────────────

/** Date de una columna @db.Date → 'YYYY-MM-DD'. */
export function toDateKeyUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Prisma → DTO del cliente. Las fechas viajan como 'YYYY-MM-DD' y las horas
 * como 'HH:mm', nunca como ISO completo (convención del proyecto).
 */
export function toTaskDTO(task: TaskWithRelations): TaskDTO {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    urgent: task.urgent,
    important: task.important,
    status: task.status as TaskStatus,
    date: task.date ? toDateKeyUTC(task.date) : null,
    time: task.time ? formatTime(task.time) : null,
    quadrant: quadrantOf(task.urgent, task.important),
    recurrence: task.recurrence
      ? {
          id: task.recurrence.id,
          frequency: task.recurrence.frequency as RecurrenceFrequency,
          intervalN: task.recurrence.intervalN,
          dayOfMonth: task.recurrence.dayOfMonth,
          endsOn: task.recurrence.endsOn
            ? toDateKeyUTC(task.recurrence.endsOn)
            : null,
        }
      : null,
    calendarEventId: task.calendarEventId,
    doneAt: task.doneAt ? task.doneAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    labels: task.labels.map((assignment) => ({
      id: assignment.label.id,
      name: assignment.label.name,
      color: assignment.label.color,
    })),
  };
}

// ─────────────────────────────────────────
// Etiquetas
// ─────────────────────────────────────────

/**
 * Resuelve la lista definitiva de ids de etiqueta a partir de ids existentes
 * y/o nombres nuevos. Los nombres que no existan se crean (`name` es @unique,
 * así que el upsert es idempotente y tolera carreras).
 */
export async function resolveLabelIds(
  client: Db,
  input: { labelIds?: number[]; labelNames?: string[] }
): Promise<number[]> {
  const ids = new Set<number>();

  if (input.labelIds?.length) {
    const wanted = Array.from(new Set(input.labelIds));
    const found = await client.taskLabel.findMany({
      where: { id: { in: wanted } },
      select: { id: true },
    });
    if (found.length !== wanted.length) {
      throw badRequest("Alguna de las etiquetas indicadas no existe");
    }
    for (const label of found) ids.add(label.id);
  }

  for (const raw of input.labelNames ?? []) {
    const name = raw.trim();
    if (!name) continue;
    const label = await client.taskLabel.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    ids.add(label.id);
  }

  return Array.from(ids);
}

/** Deja las asignaciones de la tarea exactamente en `labelIds`. */
export async function syncTaskLabels(
  client: Db,
  taskId: number,
  labelIds: number[]
): Promise<void> {
  await client.taskLabelAssignment.deleteMany({
    where: { taskId, labelId: { notIn: labelIds.length ? labelIds : [-1] } },
  });
  if (!labelIds.length) return;
  await client.taskLabelAssignment.createMany({
    data: labelIds.map((labelId) => ({ taskId, labelId })),
    skipDuplicates: true,
  });
}

// ─────────────────────────────────────────
// Recurrencia
// ─────────────────────────────────────────

/**
 * Siguiente fecha de una serie, en UTC medianoche (que es como se guardan las
 * columnas @db.Date):
 *
 * - `daily`   → +intervalN días
 * - `weekly`  → +intervalN semanas
 * - `monthly` → +intervalN meses, cayendo en `dayOfMonth` si la regla lo fija
 *   y, si no, en el mismo día del mes. El día se recorta al último día del mes
 *   destino, así que el 31 de enero +1 mes es el 28 (o 29) de febrero.
 */
export function nextOccurrence(
  from: Date,
  rule: { frequency: string; intervalN: number; dayOfMonth: number | null }
): Date {
  const step = Math.max(1, rule.intervalN || 1);
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const day = from.getUTCDate();

  if (rule.frequency === "daily") return new Date(Date.UTC(year, month, day + step));
  if (rule.frequency === "weekly") {
    return new Date(Date.UTC(year, month, day + step * 7));
  }

  const targetDay = rule.dayOfMonth ?? day;
  // Día 0 del mes siguiente al destino = último día del mes destino.
  const lastDayOfTarget = new Date(Date.UTC(year, month + step + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month + step, Math.min(targetDay, lastDayOfTarget)));
}

/** Hoy a medianoche UTC, comparable con una columna @db.Date. */
function todayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  );
}

/**
 * Regla de recurrencia al completar una tarea:
 *
 * la tarea completada NO se reabre — se queda en `done` como registro
 * histórico — y en su lugar se crea la **siguiente ocurrencia**: una copia con
 * el mismo título, descripción, cuadrante, hora, etiquetas y regla, en estado
 * `pending` y con la fecha desplazada según `frequency`/`intervalN` a partir
 * de la fecha de la tarea completada (o de hoy si no tenía fecha).
 *
 * Si la regla define `endsOn` y la fecha calculada lo supera, la serie termina
 * y no se crea nada. Todo corre dentro de la transacción que marca el `done`,
 * de modo que nunca queda una serie a medias.
 */
export async function spawnNextOccurrence(
  tx: Prisma.TransactionClient,
  task: TaskWithRelations
): Promise<void> {
  const rule = task.recurrence;
  if (!rule) return;

  const base = task.date ?? todayUTC();
  const next = nextOccurrence(base, rule);

  if (rule.endsOn && next.getTime() > rule.endsOn.getTime()) return;

  const created = await tx.task.create({
    data: {
      title: task.title,
      description: task.description,
      urgent: task.urgent,
      important: task.important,
      status: "pending",
      date: next,
      time: task.time,
      recurrenceId: rule.id,
    },
  });

  if (task.labels.length) {
    await tx.taskLabelAssignment.createMany({
      data: task.labels.map((assignment) => ({
        taskId: created.id,
        labelId: assignment.labelId,
      })),
      skipDuplicates: true,
    });
  }
}

/**
 * Cambia el estado de una tarea y mantiene `doneAt` coherente:
 * se sella al pasar a `done` y se limpia al volver a `pending`/`in_progress`.
 * Si la tarea pasa a `done` y es recurrente, genera la siguiente ocurrencia
 * en la misma transacción.
 */
export async function applyStatusChange(
  id: number,
  status: TaskStatus
): Promise<TaskWithRelations> {
  const current = await findTaskOrThrow(id);
  const becomesDone = status === "done" && current.status !== "done";

  return prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id },
      data: {
        status,
        doneAt: status === "done" ? (current.doneAt ?? new Date()) : null,
      },
      include: taskInclude,
    });
    if (becomesDone) await spawnNextOccurrence(tx, updated);
    return updated;
  });
}

/**
 * Crea, actualiza o borra la `RecurrenceRule` de una tarea según el body.
 * Devuelve el `recurrenceId` que debe quedar guardado.
 */
export async function applyRecurrence(
  tx: Prisma.TransactionClient,
  currentRecurrenceId: number | null,
  input: RecurrenceInput | null
): Promise<number | null> {
  if (input === null) {
    if (currentRecurrenceId) await deleteRuleIfOrphan(tx, currentRecurrenceId, null);
    return null;
  }

  const data = {
    frequency: input.frequency,
    intervalN: input.intervalN,
    dayOfMonth: input.dayOfMonth ?? null,
    endsOn: input.endsOn ? parseDateKey(input.endsOn) : null,
  };

  if (currentRecurrenceId) {
    const rule = await tx.recurrenceRule.update({
      where: { id: currentRecurrenceId },
      data,
    });
    return rule.id;
  }

  const rule = await tx.recurrenceRule.create({ data });
  return rule.id;
}

/**
 * Borra una regla si ya no la referencia nada. `exceptTaskId` permite ignorar
 * la tarea que se está borrando/desvinculando en la misma transacción.
 */
export async function deleteRuleIfOrphan(
  tx: Prisma.TransactionClient,
  ruleId: number,
  exceptTaskId: number | null
): Promise<void> {
  const [tasks, events] = await Promise.all([
    tx.task.count({
      where: {
        recurrenceId: ruleId,
        ...(exceptTaskId ? { id: { not: exceptTaskId } } : {}),
      },
    }),
    tx.calendarEvent.count({ where: { recurrenceId: ruleId } }),
  ]);
  if (tasks === 0 && events === 0) {
    await tx.recurrenceRule.delete({ where: { id: ruleId } });
  }
}

// ─────────────────────────────────────────
// Cuadrantes
// ─────────────────────────────────────────

/**
 * Resuelve `urgent`/`important` finales: el atajo `quadrant` manda sobre los
 * booleanos sueltos, que es lo que hace explícito el selector visual del modal.
 */
export function resolveFlags(
  input: { quadrant?: QuadrantKey; urgent?: boolean; important?: boolean },
  fallback: { urgent: boolean; important: boolean }
): { urgent: boolean; important: boolean } {
  if (input.quadrant) return { ...QUADRANT_FLAGS[input.quadrant] };
  return {
    urgent: input.urgent ?? fallback.urgent,
    important: input.important ?? fallback.important,
  };
}
