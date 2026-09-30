// @vitest-environment node
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/cron/reminders/route";
import { prismaMock } from "../../mocks/prisma";
import { makeRequest, callRoute } from "./_helpers";
import { signOut } from "../../mocks/session";

const ORIGINAL_SECRET = process.env.CRON_SECRET;

function reminder(
  id: number,
  eventDate: string,
  remindTimeHHmm: string,
  daysBefore: number,
  isSent = false
) {
  return {
    id,
    eventId: id,
    remindType: "custom",
    remindTime: new Date(`1970-01-01T${remindTimeHHmm}:00.000Z`),
    daysBefore,
    isSent,
    event: {
      id,
      title: `Evento ${id}`,
      date: new Date(`${eventDate}T00:00:00.000Z`),
      time: new Date("1970-01-01T09:00:00.000Z"),
      location: null,
      meetingLink: null,
    },
  };
}

describe("GET /api/cron/reminders", () => {
  afterAll(() => {
    process.env.CRON_SECRET = ORIGINAL_SECRET;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("responde 401 sin el header de autorización correcto (no usa sesión de usuario)", async () => {
    process.env.CRON_SECRET = "s3cr3t";
    signOut(); // el cron no depende en absoluto de la sesión de usuario

    const req = makeRequest("/api/cron/reminders", {
      headers: { authorization: "Bearer equivocado" },
    });
    const { status } = await callRoute(GET, req);

    expect(status).toBe(401);
  });

  it("responde 401 si falta el header de autorización", async () => {
    process.env.CRON_SECRET = "s3cr3t";
    const { status } = await callRoute(GET, makeRequest("/api/cron/reminders"));
    expect(status).toBe(401);
  });

  it("procesa solo los recordatorios cuyo momento de disparo ya pasó", async () => {
    process.env.CRON_SECRET = "s3cr3t";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));

    prismaMock.calendarReminder.findMany.mockResolvedValue([
      // Dispara: evento el 15/06 a las 09:00, sin días de antelación -> ya pasó (mediodía).
      reminder(1, "2026-06-15", "09:00", 0),
      // No dispara: mismo día, pero a las 18:00 (aún no llega).
      reminder(2, "2026-06-15", "18:00", 0),
      // No dispara: evento en el futuro, con 1 día de antelación -> dispara mañana a las 09:00.
      reminder(3, "2026-06-20", "09:00", 1),
      // Dispara: evento el 20/06, con 5 días de antelación -> dispara el 15/06 a las 09:00.
      reminder(4, "2026-06-20", "09:00", 5),
    ]);
    prismaMock.calendarReminder.updateMany.mockResolvedValue({ count: 2 });

    const req = makeRequest("/api/cron/reminders", {
      headers: { authorization: "Bearer s3cr3t" },
    });

    const { status, body } = await callRoute(GET, req);

    expect(status).toBe(200);
    expect(body.checked).toBe(4);
    expect(body.processed).toBe(2);
    expect(body.notifications.map((n: any) => n.reminderId).sort()).toEqual([1, 4]);

    expect(prismaMock.calendarReminder.updateMany).toHaveBeenCalledTimes(1);
    const updateArgs = prismaMock.calendarReminder.updateMany.mock.calls[0][0];
    expect([...updateArgs.where.id.in].sort()).toEqual([1, 4]);
    expect(updateArgs.data).toEqual({ isSent: true });
  });

  it("no llama a updateMany si ningún recordatorio está listo para disparar", async () => {
    process.env.CRON_SECRET = "s3cr3t";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00.000Z"));

    prismaMock.calendarReminder.findMany.mockResolvedValue([
      reminder(1, "2026-06-20", "09:00", 0),
    ]);

    const req = makeRequest("/api/cron/reminders", {
      headers: { authorization: "Bearer s3cr3t" },
    });

    const { body } = await callRoute(GET, req);

    expect(body.processed).toBe(0);
    expect(prismaMock.calendarReminder.updateMany).not.toHaveBeenCalled();
  });

  it("falla con 500 si CRON_SECRET no está configurado en el entorno", async () => {
    delete process.env.CRON_SECRET;
    const req = makeRequest("/api/cron/reminders", {
      headers: { authorization: "Bearer lo-que-sea" },
    });
    const { status } = await callRoute(GET, req);
    expect(status).toBe(500);
  });
});
