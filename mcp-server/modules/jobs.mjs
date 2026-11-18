import { z, call, clean, DATE, ID } from "../lib.mjs";

const APPLICATION_STATUS = z.enum([
  "postulado",
  "en_revision",
  "entrevista",
  "prueba",
  "oferta",
  "rechazado",
  "sin_respuesta",
]);
const PORTAL_STATUS = z.enum(["pendiente", "cuenta_creada", "perfil_completo"]);

export function register(tool) {
  tool(
    "list_applications",
    "Empleo: lista las postulaciones de trabajo (más recientes primero). Estados: postulado, en_revision, entrevista, prueba (columna En curso); oferta (Pasaste); rechazado, sin_respuesta (No pasaste).",
    { status: APPLICATION_STATUS.optional().describe("Filtra por estado") },
    async ({ status }) => {
      const all = await call("GET", "/jobs/applications");
      return status ? all.filter((a) => a.status === status) : all;
    }
  );

  tool(
    "add_application",
    "Empleo: agrega una postulación de trabajo.",
    {
      company: z.string().describe("Empresa"),
      position: z.string().describe("Cargo"),
      source: z.string().optional().describe("Dónde se postuló: LinkedIn, Computrabajo, referido…"),
      url: z.string().url().optional().describe("Enlace a la oferta"),
      status: APPLICATION_STATUS.optional().describe("Por defecto: postulado"),
      appliedAt: DATE.optional().describe("Fecha de postulación; por defecto hoy"),
      salary: z.string().optional(),
      notes: z.string().optional(),
    },
    (args) => call("POST", "/jobs/applications", args)
  );

  tool(
    "update_application",
    "Empleo: actualiza una postulación (cambiar estado, notas…). Solo se modifican los campos enviados.",
    {
      id: ID,
      company: z.string().optional(),
      position: z.string().optional(),
      source: z.string().optional(),
      url: z.string().optional().describe("Cadena vacía para quitar el enlace"),
      status: APPLICATION_STATUS.optional(),
      appliedAt: DATE.optional(),
      salary: z.string().optional(),
      notes: z.string().optional(),
    },
    ({ id, ...patch }) => call("PATCH", `/jobs/applications/${id}`, clean(patch))
  );

  tool(
    "delete_application",
    "Empleo: elimina una postulación por id. Irreversible: confírmalo con el usuario antes.",
    { id: ID },
    ({ id }) => call("DELETE", `/jobs/applications/${id}`)
  );

  tool("list_portals", "Empleo: lista los portales de trabajo donde el usuario tiene cuenta.", {}, () =>
    call("GET", "/jobs/portals")
  );

  tool(
    "add_portal",
    "Empleo: agrega un portal de trabajo. No guardes contraseñas: solo correo o usuario.",
    {
      name: z.string(),
      url: z.string().url().optional(),
      account: z.string().optional().describe("Correo o usuario de registro"),
      status: PORTAL_STATUS.optional().describe("Por defecto: pendiente"),
      notes: z.string().optional(),
    },
    (args) => call("POST", "/jobs/portals", args)
  );

  tool(
    "update_portal",
    "Empleo: actualiza un portal. Solo se modifican los campos enviados.",
    {
      id: ID,
      name: z.string().optional(),
      url: z.string().optional().describe("Cadena vacía para quitar el enlace"),
      account: z.string().optional(),
      status: PORTAL_STATUS.optional(),
      notes: z.string().optional(),
    },
    ({ id, ...patch }) => call("PATCH", `/jobs/portals/${id}`, clean(patch))
  );

  tool(
    "delete_portal",
    "Empleo: elimina un portal por id. Irreversible: confírmalo con el usuario antes.",
    { id: ID },
    ({ id }) => call("DELETE", `/jobs/portals/${id}`)
  );
}
