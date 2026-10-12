import { z } from "zod";
import { prisma } from "@/lib/db";
import { dbDateKey, formatTime } from "@/lib/utils";
import type { AgentTool } from "./types";

/**
 * Registro de herramientas del agente. Acceden a la base directo con Prisma
 * (el webhook de Telegram no tiene sesión de Supabase; su autenticación es el
 * secreto + chat permitido, ver `app/api/telegram/webhook`).
 *
 * Para añadir un módulo: crear la herramienta aquí y listarla en `TOOLS`.
 * Empezar por las de lectura; las que escriben llevan `mutates: true`.
 */

const listPendingTasks: AgentTool = {
  name: "list_pending_tasks",
  description: "Lista las tareas pendientes o en progreso, las urgentes primero.",
  schema: z.object({ limit: z.number().int().min(1).max(50).default(20) }),
  mutates: false,
  async run({ limit }) {
    const tasks = await prisma.task.findMany({
      where: { status: { not: "done" } },
      orderBy: [{ urgent: "desc" }, { important: "desc" }, { id: "asc" }],
      take: limit,
    });
    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      urgent: t.urgent,
      important: t.important,
      date: t.date ? dbDateKey(t.date) : null,
    }));
  },
};

const listUpcomingEvents: AgentTool = {
  name: "list_upcoming_events",
  description: "Lista los eventos del calendario desde hoy en adelante.",
  schema: z.object({ limit: z.number().int().min(1).max(30).default(10) }),
  mutates: false,
  async run({ limit }) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const events = await prisma.calendarEvent.findMany({
      where: { date: { gte: today } },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      take: limit,
    });
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      date: dbDateKey(e.date),
      time: formatTime(e.time),
      location: e.location,
    }));
  },
};

export const TOOLS: AgentTool[] = [listPendingTasks, listUpcomingEvents];

export function findTool(name: string): AgentTool | undefined {
  return TOOLS.find((t) => t.name === name);
}
