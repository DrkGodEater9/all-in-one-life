// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/calendar/events/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post } from "./_helpers";
import { signOut } from "../../mocks/session";

describe("GET /api/calendar/events", () => {
  it("lista los eventos del rango", async () => {
    prismaMock.calendarEvent.findMany.mockResolvedValue([
      { id: 1, title: "Cita", date: new Date("2026-01-01T00:00:00.000Z") },
    ]);

    const { status, body } = await get(GET, "/api/calendar/events?from=2026-01-01&to=2026-01-31");

    expect(status).toBe(200);
    expect(body).toHaveLength(1);
  });

  it("responde 400 con una categoría inválida", async () => {
    const { status } = await get(GET, "/api/calendar/events?category=deporte");
    expect(status).toBe(400);
  });

  it("responde 400 con una fecha mal formada", async () => {
    const { status } = await get(GET, "/api/calendar/events?from=2026/01/01");
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/calendar/events");
    expect(status).toBe(401);
  });
});

describe("POST /api/calendar/events (sin recurrencia)", () => {
  it("crea un solo evento y sus recordatorios", async () => {
    prismaMock.calendarEvent.create.mockResolvedValue({ id: 1 });
    prismaMock.calendarReminder.createMany.mockResolvedValue({ count: 1 });
    prismaMock.calendarEvent.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      title: "Cita",
      date: new Date("2026-01-01T00:00:00.000Z"),
    });

    const { status, body } = await post(POST, "/api/calendar/events", {
      title: "Cita con el cardiólogo",
      date: "2026-01-01",
      time: "09:00",
      category: "medical",
      reminders: [{ remindType: "day_before", remindTime: "09:00" }],
    });

    expect(status).toBe(201);
    expect(body.occurrences).toBe(1);
    expect(prismaMock.calendarEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Cita con el cardiólogo", category: "medical" }),
      })
    );
    // day_before resuelve daysBefore=1 sin que el cliente lo mande.
    expect(prismaMock.calendarReminder.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ eventId: 1, remindType: "day_before", daysBefore: 1 })],
    });
  });

  it("responde 400 con una categoría inválida", async () => {
    const { status } = await post(POST, "/api/calendar/events", {
      title: "X",
      date: "2026-01-01",
      time: "09:00",
      category: "deporte",
    });
    expect(status).toBe(400);
  });

  it("responde 400 con un link de reunión que no es una URL válida", async () => {
    const { status, body } = await post(POST, "/api/calendar/events", {
      title: "X",
      date: "2026-01-01",
      time: "09:00",
      category: "work",
      meetingLink: "no-es-una-url",
    });
    expect(status).toBe(400);
    expect(body.error).toBe("Datos inválidos");
  });

  it("acepta meetingLink vacío como ausencia de link", async () => {
    prismaMock.calendarEvent.create.mockResolvedValue({ id: 2 });
    prismaMock.calendarEvent.findUniqueOrThrow.mockResolvedValue({ id: 2 });

    const { status } = await post(POST, "/api/calendar/events", {
      title: "X",
      date: "2026-01-01",
      time: "09:00",
      category: "work",
      meetingLink: "",
    });
    expect(status).toBe(201);
  });

  it("responde 400 con una hora mal formada", async () => {
    const { status } = await post(POST, "/api/calendar/events", {
      title: "X",
      date: "2026-01-01",
      time: "9:00",
      category: "work",
    });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await post(POST, "/api/calendar/events", {
      title: "X",
      date: "2026-01-01",
      time: "09:00",
      category: "work",
    });
    expect(status).toBe(401);
  });
});

describe("POST /api/calendar/events (con recurrencia)", () => {
  it("materializa una fila por ocurrencia semanal respetando intervalN y endsOn", async () => {
    prismaMock.recurrenceRule.create.mockResolvedValue({ id: 55 });
    prismaMock.calendarEvent.createMany.mockResolvedValue({ count: 3 });
    prismaMock.calendarEvent.findMany.mockResolvedValue([
      { id: 1, date: new Date("2026-01-01T00:00:00.000Z") },
      { id: 2, date: new Date("2026-01-15T00:00:00.000Z") },
      { id: 3, date: new Date("2026-01-29T00:00:00.000Z") },
    ]);
    prismaMock.calendarEvent.findUniqueOrThrow.mockResolvedValue({ id: 1 });

    const { status, body } = await post(POST, "/api/calendar/events", {
      title: "Terapia",
      date: "2026-01-01",
      time: "09:00",
      category: "medical",
      recurrence: { frequency: "weekly", intervalN: 2, endsOn: "2026-02-01" },
    });

    expect(status).toBe(201);
    expect(body.occurrences).toBe(3);

    const createManyCall = prismaMock.calendarEvent.createMany.mock.calls[0][0];
    const dates = createManyCall.data.map((d: any) => d.date.toISOString().slice(0, 10));
    expect(dates).toEqual(["2026-01-01", "2026-01-15", "2026-01-29"]);
    expect(createManyCall.data.every((d: any) => d.recurrenceId === 55)).toBe(true);
  });

  it("clampa dayOfMonth al último día del mes destino en recurrencia mensual", async () => {
    prismaMock.recurrenceRule.create.mockResolvedValue({ id: 60 });
    prismaMock.calendarEvent.createMany.mockResolvedValue({ count: 4 });
    prismaMock.calendarEvent.findMany.mockResolvedValue([
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 },
    ]);
    prismaMock.calendarEvent.findUniqueOrThrow.mockResolvedValue({ id: 1 });

    await post(POST, "/api/calendar/events", {
      title: "Pago",
      date: "2026-01-31",
      time: "09:00",
      category: "personal",
      recurrence: { frequency: "monthly", intervalN: 1, dayOfMonth: 31, endsOn: "2026-04-30" },
    });

    const createManyCall = prismaMock.calendarEvent.createMany.mock.calls[0][0];
    const dates = createManyCall.data.map((d: any) => d.date.toISOString().slice(0, 10));
    // Ene 31 (fecha real de inicio) -> Feb 28 (clamp) -> Mar 31 -> Abr 30 (clamp)
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("topa la generación diaria sin fin en 400 ocurrencias (2 años)", async () => {
    prismaMock.recurrenceRule.create.mockResolvedValue({ id: 70 });
    prismaMock.calendarEvent.createMany.mockResolvedValue({ count: 400 });
    prismaMock.calendarEvent.findMany.mockResolvedValue(
      Array.from({ length: 400 }, (_, i) => ({ id: i + 1 }))
    );
    prismaMock.calendarEvent.findUniqueOrThrow.mockResolvedValue({ id: 1 });

    const { body } = await post(POST, "/api/calendar/events", {
      title: "Hábito diario",
      date: "2026-01-01",
      time: "07:00",
      category: "personal",
      recurrence: { frequency: "daily", intervalN: 1 },
    });

    expect(body.occurrences).toBe(400);
    const createManyCall = prismaMock.calendarEvent.createMany.mock.calls[0][0];
    expect(createManyCall.data).toHaveLength(400);
  });
});
