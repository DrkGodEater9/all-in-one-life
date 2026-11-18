import { z, call, qs, DATE, TIME, ID } from "../lib.mjs";

const CATEGORY = z.enum(["medical", "work", "personal", "study"]);
const REMINDER = z.object({
  remindType: z.enum(["same_day", "day_before", "custom"]),
  remindTime: TIME.describe("Hora del aviso"),
  daysBefore: z.number().int().min(0).max(365).optional().describe("Solo con custom"),
});

export function register(tool) {
  tool(
    "list_events",
    "Calendario: lista eventos, opcionalmente por rango de fechas y categoría (medical, work, personal, study).",
    { from: DATE.optional(), to: DATE.optional(), category: CATEGORY.optional() },
    (args) => call("GET", `/calendar/events${qs(args)}`)
  );

  tool(
    "get_calendar_day",
    "Calendario: eventos y tareas de un día.",
    { date: DATE },
    ({ date }) => call("GET", `/calendar/day/${date}`)
  );

  tool(
    "list_task_days",
    "Calendario: tareas con fecha en un rango (las que aparecen en el calendario), incluidas las hechas.",
    { from: DATE.optional(), to: DATE.optional() },
    (args) => call("GET", `/calendar/task-days${qs(args)}`)
  );

  tool(
    "add_event",
    "Calendario: crea un evento. Con recurrence genera la serie completa.",
    {
      title: z.string(),
      date: DATE,
      time: TIME,
      category: CATEGORY,
      location: z.string().optional(),
      meetingLink: z.string().url().optional(),
      notes: z.string().optional(),
      recurrence: z
        .object({
          frequency: z.enum(["daily", "weekly", "monthly"]),
          intervalN: z.number().int().min(1).max(52).optional(),
          dayOfMonth: z.number().int().min(1).max(31).optional(),
          endsOn: DATE.optional(),
        })
        .optional(),
      reminders: z.array(REMINDER).max(10).optional(),
    },
    (args) => call("POST", "/calendar/events", args)
  );

  tool(
    "update_event",
    "Calendario: modifica un evento; solo se cambian los campos enviados (el resto se conserva).",
    {
      id: ID,
      title: z.string().optional(),
      date: DATE.optional(),
      time: TIME.optional(),
      category: CATEGORY.optional(),
      location: z.string().nullable().optional(),
      meetingLink: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    },
    async ({ id, ...patch }) => {
      // La API reemplaza el evento entero (PUT): se lee el actual y se mezcla.
      const events = await call("GET", "/calendar/events");
      const current = events.find((e) => e.id === id);
      if (!current) throw new Error("404 Evento no encontrado");
      const hhmm = (v) => String(v).slice(11, 16);
      const merged = {
        title: current.title,
        date: String(current.date).slice(0, 10),
        time: hhmm(current.time),
        category: current.category,
        location: current.location,
        meetingLink: current.meetingLink,
        notes: current.notes,
      };
      for (const [k, v] of Object.entries(patch)) if (v !== undefined) merged[k] = v;
      return call("PUT", `/calendar/events/${id}`, merged);
    }
  );

  tool(
    "delete_event",
    "Calendario: elimina un evento. En eventos recurrentes, deleteRecurrence=this (solo este), future (este y los siguientes) o all (toda la serie). Irreversible: confírmalo antes.",
    { id: ID, deleteRecurrence: z.enum(["this", "future", "all"]).optional() },
    ({ id, deleteRecurrence }) => call("DELETE", `/calendar/events/${id}${qs({ deleteRecurrence })}`)
  );

  tool(
    "add_event_reminder",
    "Calendario: agrega un recordatorio a un evento.",
    { eventId: ID, ...REMINDER.shape },
    ({ eventId, ...body }) => call("POST", `/calendar/events/${eventId}/reminders`, body)
  );

  tool(
    "delete_event_reminder",
    "Calendario: elimina un recordatorio por id.",
    { id: ID },
    ({ id }) => call("DELETE", `/calendar/reminders/${id}`)
  );
}
