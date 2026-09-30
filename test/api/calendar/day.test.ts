// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/calendar/day/[date]/route";
import { prismaMock } from "../../mocks/prisma";
import { get } from "./_helpers";
import { signOut } from "../../mocks/session";

describe("GET /api/calendar/day/[date]", () => {
  it("devuelve eventos y tareas del día con su discriminador 'kind'", async () => {
    prismaMock.calendarEvent.findMany.mockResolvedValue([
      {
        id: 1,
        title: "Cita médica",
        time: new Date("1970-01-01T09:00:00.000Z"),
        category: "medical",
        location: null,
        meetingLink: null,
        notes: null,
        recurrenceId: null,
        reminders: [],
      },
    ]);
    prismaMock.task.findMany.mockResolvedValue([
      {
        id: 1,
        title: "Comprar leche",
        time: new Date("1970-01-01T08:00:00.000Z"),
        description: null,
        status: "pending",
        urgent: false,
        important: false,
      },
    ]);

    const { status, body } = await get(GET, "/api/calendar/day/2026-01-01", {
      date: "2026-01-01",
    });

    expect(status).toBe(200);
    expect(body.date).toBe("2026-01-01");
    expect(body.items).toHaveLength(2);
    expect(body.items.map((i: any) => i.kind)).toEqual(["task", "event"]); // 08:00 antes que 09:00
    expect(body.items[0]).toMatchObject({ kind: "task", title: "Comprar leche" });
    expect(body.items[1]).toMatchObject({ kind: "event", title: "Cita médica" });
  });

  it("a igual hora, el evento va antes que la tarea", async () => {
    prismaMock.calendarEvent.findMany.mockResolvedValue([
      {
        id: 1,
        title: "Evento",
        time: new Date("1970-01-01T09:00:00.000Z"),
        category: "work",
        location: null,
        meetingLink: null,
        notes: null,
        recurrenceId: null,
        reminders: [],
      },
    ]);
    prismaMock.task.findMany.mockResolvedValue([
      {
        id: 1,
        title: "Tarea",
        time: new Date("1970-01-01T09:00:00.000Z"),
        description: null,
        status: "pending",
        urgent: false,
        important: false,
      },
    ]);

    const { body } = await get(GET, "/api/calendar/day/2026-01-01", { date: "2026-01-01" });

    expect(body.items.map((i: any) => i.kind)).toEqual(["event", "task"]);
  });

  it("las tareas sin hora van al final", async () => {
    prismaMock.calendarEvent.findMany.mockResolvedValue([]);
    prismaMock.task.findMany.mockResolvedValue([
      {
        id: 1,
        title: "Sin hora",
        time: null,
        description: null,
        status: "pending",
        urgent: false,
        important: false,
      },
      {
        id: 2,
        title: "Con hora",
        time: new Date("1970-01-01T07:00:00.000Z"),
        description: null,
        status: "pending",
        urgent: false,
        important: false,
      },
    ]);

    const { body } = await get(GET, "/api/calendar/day/2026-01-01", { date: "2026-01-01" });

    expect(body.items.map((i: any) => i.title)).toEqual(["Con hora", "Sin hora"]);
  });

  it("responde 400 con una fecha mal formada", async () => {
    const { status } = await get(GET, "/api/calendar/day/2026-1-1", { date: "2026-1-1" });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/calendar/day/2026-01-01", { date: "2026-01-01" });
    expect(status).toBe(401);
  });
});
