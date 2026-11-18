import { z, call, qs, today, DATE, ID } from "../lib.mjs";

const EXERCISE = z.object({
  name: z.string(),
  type: z.enum(["weight", "bodyweight", "cardio"]).describe("weight = con peso, bodyweight = peso corporal, cardio"),
});

export function register(tool) {
  tool("list_routines", "Gym: lista las rutinas con sus ejercicios.", {}, () => call("GET", "/gym/routines"));

  tool(
    "add_routine",
    "Gym: crea una rutina con sus ejercicios (en orden).",
    { name: z.string(), exercises: z.array(EXERCISE).max(50).optional() },
    (args) => call("POST", "/gym/routines", { exercises: [], ...args })
  );

  tool(
    "update_routine",
    "Gym: reemplaza el nombre y los ejercicios de una rutina (envía la lista completa).",
    { id: ID, name: z.string(), exercises: z.array(EXERCISE).max(50) },
    ({ id, ...body }) => call("PUT", `/gym/routines/${id}`, body)
  );

  tool(
    "delete_routine",
    "Gym: elimina una rutina y TODO su historial de entrenos. Irreversible: confírmalo antes.",
    { id: ID },
    ({ id }) => call("DELETE", `/gym/routines/${id}`)
  );

  tool(
    "list_workouts",
    "Gym: lista entrenos (resumen), más recientes primero.",
    { routineId: ID.optional(), from: DATE.optional(), to: DATE.optional(), limit: z.number().int().min(1).max(200).optional() },
    (args) => call("GET", `/gym/workouts${qs(args)}`)
  );

  tool(
    "start_workout",
    "Gym: inicia un entreno de una rutina. Fecha por defecto: hoy.",
    { routineId: ID, date: DATE.optional(), notes: z.string().optional() },
    ({ date, ...rest }) => call("POST", "/gym/workouts", { ...rest, date: date ?? today() })
  );

  tool("get_workout", "Gym: detalle de un entreno con todas sus series.", { id: ID }, ({ id }) =>
    call("GET", `/gym/workouts/${id}`)
  );

  tool(
    "add_set",
    "Gym: registra una serie en un entreno. Con weight envía reps y weightKg; con bodyweight solo reps; con cardio durationSecs (y distanceKm opcional).",
    {
      workoutId: ID,
      exerciseName: z.string(),
      exerciseType: z.enum(["weight", "bodyweight", "cardio"]),
      reps: z.number().int().positive().optional(),
      weightKg: z.number().min(0).optional(),
      durationSecs: z.number().int().positive().optional(),
      distanceKm: z.number().min(0).optional(),
      notes: z.string().optional(),
    },
    ({ workoutId, ...body }) => call("POST", `/gym/workouts/${workoutId}/sets`, body)
  );

  tool(
    "delete_set",
    "Gym: elimina una serie de un entreno.",
    { workoutId: ID, setId: ID },
    ({ workoutId, setId }) => call("DELETE", `/gym/workouts/${workoutId}/sets/${setId}`)
  );

  tool("finish_workout", "Gym: marca un entreno como terminado.", { id: ID }, ({ id }) =>
    call("PUT", `/gym/workouts/${id}/finish`)
  );

  tool("list_exercises", "Gym: lista los ejercicios que has hecho.", {}, () => call("GET", "/gym/exercises"));

  tool(
    "exercise_history",
    "Gym: historial de sesiones de un ejercicio.",
    { name: z.string(), limit: z.number().int().min(1).max(200).optional() },
    ({ name, limit }) => call("GET", `/gym/exercise/${encodeURIComponent(name)}/history${qs({ limit })}`)
  );

  tool("exercise_record", "Gym: récord personal de un ejercicio.", { name: z.string() }, ({ name }) =>
    call("GET", `/gym/exercise/${encodeURIComponent(name)}/record`)
  );

  tool("gym_streak", "Gym: racha actual de entrenos.", {}, () => call("GET", "/gym/streak"));

  tool(
    "list_measurements",
    "Gym: lista medidas corporales (cm).",
    { from: DATE.optional(), to: DATE.optional(), limit: z.number().int().min(1).max(365).optional() },
    (args) => call("GET", `/gym/measurements${qs(args)}`)
  );

  tool(
    "add_measurement",
    "Gym: registra medidas corporales en cm (envía las que tengas). Fecha por defecto: hoy.",
    {
      date: DATE.optional(),
      chestCm: z.number().positive().optional(),
      waistCm: z.number().positive().optional(),
      hipsCm: z.number().positive().optional(),
      armsCm: z.number().positive().optional(),
      thighsCm: z.number().positive().optional(),
      notes: z.string().optional(),
    },
    ({ date, ...rest }) => call("POST", "/gym/measurements", { ...rest, date: date ?? today() })
  );
}
