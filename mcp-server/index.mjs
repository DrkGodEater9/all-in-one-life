#!/usr/bin/env node
/**
 * Servidor MCP de Personal OS para Claude Desktop.
 *
 * Habla con la API de la app usando un token personal (Configuración >
 * Conexión con Claude Desktop), así que ve y modifica exactamente los datos
 * de su dueño y nada más: usa las mismas rutas /api/jobs/* que la web.
 *
 * Variables de entorno:
 *   POS_URL    base de la app, p. ej. https://all-in-one-life.vercel.app
 *   POS_TOKEN  token que empieza por pos_
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = (process.env.POS_URL ?? "").replace(/\/+$/, "");
const TOKEN = process.env.POS_TOKEN ?? "";

if (!BASE || !TOKEN) {
  console.error("Faltan POS_URL y/o POS_TOKEN en la configuración del servidor MCP.");
  process.exit(1);
}

async function call(method, path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = data?.details ? ` ${JSON.stringify(data.details)}` : "";
    throw new Error(`${res.status} ${data?.error ?? res.statusText}${detail}`);
  }
  return data;
}

const text = (value) => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});

/** Envuelve un handler para devolver los errores como resultado, no como caída. */
const tool = (fn) => async (args) => {
  try {
    return text(await fn(args));
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
  }
};

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
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD");

const server = new McpServer({ name: "personal-os", version: "1.0.0" });

// ── Postulaciones ──────────────────────────────────────────────────────────
server.tool(
  "list_applications",
  "Lista las postulaciones de trabajo (más recientes primero). Estados: postulado, en_revision, entrevista, prueba (columna En curso); oferta (Pasaste); rechazado, sin_respuesta (No pasaste).",
  { status: APPLICATION_STATUS.optional().describe("Filtra por estado") },
  tool(async ({ status }) => {
    const all = await call("GET", "/jobs/applications");
    return status ? all.filter((a) => a.status === status) : all;
  })
);

server.tool(
  "add_application",
  "Agrega una postulación de trabajo.",
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
  tool((args) => call("POST", "/jobs/applications", args))
);

server.tool(
  "update_application",
  "Actualiza una postulación (cambiar estado, notas, etc.). Solo se modifican los campos enviados.",
  {
    id: z.number().int().positive(),
    company: z.string().optional(),
    position: z.string().optional(),
    source: z.string().optional(),
    url: z.string().optional().describe("Cadena vacía para quitar el enlace"),
    status: APPLICATION_STATUS.optional(),
    appliedAt: DATE.optional(),
    salary: z.string().optional(),
    notes: z.string().optional(),
  },
  tool(({ id, ...patch }) => call("PATCH", `/jobs/applications/${id}`, patch))
);

server.tool(
  "delete_application",
  "Elimina una postulación por id. Acción irreversible: confírmala con el usuario antes.",
  { id: z.number().int().positive() },
  tool(({ id }) => call("DELETE", `/jobs/applications/${id}`))
);

// ── Portales ───────────────────────────────────────────────────────────────
server.tool("list_portals", "Lista los portales de trabajo donde el usuario tiene cuenta.", {}, tool(() =>
  call("GET", "/jobs/portals")
));

server.tool(
  "add_portal",
  "Agrega un portal de trabajo. No guardes contraseñas: solo correo o usuario.",
  {
    name: z.string(),
    url: z.string().url().optional(),
    account: z.string().optional().describe("Correo o usuario de registro"),
    status: PORTAL_STATUS.optional().describe("Por defecto: pendiente"),
    notes: z.string().optional(),
  },
  tool((args) => call("POST", "/jobs/portals", args))
);

server.tool(
  "update_portal",
  "Actualiza un portal. Solo se modifican los campos enviados.",
  {
    id: z.number().int().positive(),
    name: z.string().optional(),
    url: z.string().optional().describe("Cadena vacía para quitar el enlace"),
    account: z.string().optional(),
    status: PORTAL_STATUS.optional(),
    notes: z.string().optional(),
  },
  tool(({ id, ...patch }) => call("PATCH", `/jobs/portals/${id}`, patch))
);

server.tool(
  "delete_portal",
  "Elimina un portal por id. Acción irreversible: confírmala con el usuario antes.",
  { id: z.number().int().positive() },
  tool(({ id }) => call("DELETE", `/jobs/portals/${id}`))
);

await server.connect(new StdioServerTransport());
