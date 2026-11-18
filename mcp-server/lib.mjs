/**
 * Núcleo compartido del servidor MCP: cliente HTTP contra la API de la app,
 * armado de query strings, fecha de "hoy" en tu zona horaria y el registro de
 * herramientas con manejo de errores uniforme.
 */
import { z } from "zod";

export { z };

const BASE = (process.env.POS_URL ?? "").replace(/\/+$/, "");
const TOKEN = process.env.POS_TOKEN ?? "";
const TIMEZONE = process.env.POS_TIMEZONE || "America/Bogota";

export function assertConfig() {
  if (!BASE || !TOKEN) {
    console.error("Faltan POS_URL y/o POS_TOKEN en la configuración del servidor MCP.");
    process.exit(1);
  }
}

/** Llama a /api{path} con el token; lanza Error con el mensaje de la API. */
export async function call(method, path, body) {
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

/** "?a=1&b=2" omitiendo undefined/null/"" (vacío si no queda nada). */
export function qs(params = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * Fecha de hoy "YYYY-MM-DD" en tu zona horaria (POS_TIMEZONE, por defecto
 * America/Bogota). El servidor de la app corre en UTC: pasarle siempre la fecha
 * explícita evita que "hoy" cambie de día a las 7 pm hora Colombia.
 */
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Mes actual "YYYY-MM" en tu zona horaria. */
export function thisMonth() {
  return today().slice(0, 7);
}

/** Quita las claves undefined de un objeto (para PATCH parciales). */
export function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD");
export const TIME = z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm (24 horas)");
export const ID = z.number().int().positive();

const asContent = (value) => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});

/** Herramienta MCP: errores de la API vuelven como resultado legible, no tumban el servidor. */
export function makeRegistrar(server, enabled) {
  return function defineTool(name, description, shape, fn) {
    server.tool(name, description, shape, async (args) => {
      try {
        const result = await fn(args ?? {});
        return asContent(result === undefined || result === null ? { ok: true } : result);
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    });
    enabled.count += 1;
  };
}
