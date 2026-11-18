#!/usr/bin/env node
/**
 * Servidor MCP de Personal OS para Claude Desktop.
 *
 * Habla con la API de la app usando un token personal (Configuración >
 * Conexión con Claude Desktop), así que ve y modifica exactamente los datos
 * de su dueño y nada más: usa las mismas rutas /api/* que la web.
 *
 * Variables de entorno:
 *   POS_URL       base de la app, p. ej. https://all-in-one-life.vercel.app
 *   POS_TOKEN     token que empieza por pos_
 *   POS_MODULES   (opcional) módulos a exponer separados por coma; por defecto todos:
 *                 jobs,tasks,calendar,finance,gym,nutrition,projects,notes
 *   POS_TIMEZONE  (opcional) zona horaria para "hoy"; por defecto America/Bogota
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { assertConfig, call, makeRegistrar, today, z } from "./lib.mjs";
import * as jobs from "./modules/jobs.mjs";
import * as tasks from "./modules/tasks.mjs";
import * as calendar from "./modules/calendar.mjs";
import * as finance from "./modules/finance.mjs";
import * as gym from "./modules/gym.mjs";
import * as nutrition from "./modules/nutrition.mjs";
import * as projects from "./modules/projects.mjs";
import * as notes from "./modules/notes.mjs";

assertConfig();

const MODULES = { jobs, tasks, calendar, finance, gym, nutrition, projects, notes };

const requested = (process.env.POS_MODULES ?? "")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const unknown = requested.filter((m) => !(m in MODULES));
if (unknown.length) {
  console.error(`POS_MODULES tiene módulos desconocidos: ${unknown.join(", ")}. Válidos: ${Object.keys(MODULES).join(", ")}`);
  process.exit(1);
}
const enabledNames = requested.length ? requested : Object.keys(MODULES);

const server = new McpServer(
  { name: "personal-os", version: "2.0.0" },
  {
    instructions: [
      "Personal OS: la vida del usuario en un solo lugar (finanzas, nutrición, gym, calendario, tareas, proyectos, blog, conceptos, rachas, empleo).",
      "Las fechas son YYYY-MM-DD y las horas HH:mm en 24 h. Si el usuario no da fecha, se usa hoy en su zona horaria.",
      "Los montos son en pesos colombianos (COP), sin separadores de miles.",
      "Antes de usar una herramienta delete_*, confirma con el usuario: borrar es irreversible.",
      "Para modificar algo por id, primero lístalo para conseguir el id correcto.",
    ].join("\n"),
  }
);

const counter = { count: 0 };
const tool = makeRegistrar(server, counter);

for (const name of enabledNames) MODULES[name].register(tool);

// Resumen transversal: una sola llamada para "¿cómo voy hoy?".
if (enabledNames.length === Object.keys(MODULES).length) {
  tool(
    "daily_overview",
    "Resumen del día: saldo, tareas pendientes, eventos de hoy en adelante, nutrición de hoy y rachas.",
    { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Por defecto hoy") },
    async ({ date }) => {
      const day = date ?? today();
      const settle = async (p) => {
        try {
          return await p;
        } catch (e) {
          return { error: e.message };
        }
      };
      const [balance, pending, events, nutrition, streaks] = await Promise.all([
        settle(call("GET", "/finance/balance")),
        settle(call("GET", "/tasks?status=pending")),
        settle(call("GET", `/calendar/events?from=${day}`)),
        settle(call("GET", `/nutrition/summary?date=${day}`)),
        settle(call("GET", `/streaks?today=${day}`)),
      ]);
      return {
        date: day,
        balance,
        pendingTasks: Array.isArray(pending) ? pending.slice(0, 15) : pending,
        upcomingEvents: Array.isArray(events) ? events.slice(0, 15) : events,
        nutrition,
        streaks,
      };
    }
  );
}

await server.connect(new StdioServerTransport());
console.error(`personal-os MCP listo: ${counter.count} herramientas (${enabledNames.join(", ")})`);
