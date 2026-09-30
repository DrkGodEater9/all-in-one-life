// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/calendar/events/[id]/reminders/route";
import { DELETE } from "@/app/api/calendar/reminders/[id]/route";
import { prismaMock } from "../../mocks/prisma";
import { post, del } from "./_helpers";
import { signOut } from "../../mocks/session";

describe("POST /api/calendar/events/[id]/reminders", () => {
  it("crea un recordatorio para el evento", async () => {
    prismaMock.calendarEvent.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.calendarReminder.create.mockResolvedValue({
      id: 1,
      eventId: 1,
      remindType: "same_day",
      daysBefore: 0,
    });

    const { status, body } = await post(
      POST,
      "/api/calendar/events/1/reminders",
      { remindType: "same_day", remindTime: "07:00" },
      { id: "1" }
    );

    expect(status).toBe(201);
    expect(body).toMatchObject({ eventId: 1, remindType: "same_day", daysBefore: 0 });
  });

  it("resuelve daysBefore=1 para 'day_before' sin que lo mande el cliente", async () => {
    prismaMock.calendarEvent.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.calendarReminder.create.mockResolvedValue({ id: 2 });

    await post(
      POST,
      "/api/calendar/events/1/reminders",
      { remindType: "day_before", remindTime: "09:00" },
      { id: "1" }
    );

    expect(prismaMock.calendarReminder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ daysBefore: 1 }),
    });
  });

  it("respeta el daysBefore del cliente cuando remindType es 'custom'", async () => {
    prismaMock.calendarEvent.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.calendarReminder.create.mockResolvedValue({ id: 3 });

    await post(
      POST,
      "/api/calendar/events/1/reminders",
      { remindType: "custom", remindTime: "09:00", daysBefore: 5 },
      { id: "1" }
    );

    expect(prismaMock.calendarReminder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ daysBefore: 5 }),
    });
  });

  it("responde 404 si el evento no existe", async () => {
    prismaMock.calendarEvent.findUnique.mockResolvedValue(null);

    const { status } = await post(
      POST,
      "/api/calendar/events/999/reminders",
      { remindType: "same_day", remindTime: "07:00" },
      { id: "999" }
    );

    expect(status).toBe(404);
  });

  it("responde 400 con un remindType inválido", async () => {
    prismaMock.calendarEvent.findUnique.mockResolvedValue({ id: 1 });

    const { status } = await post(
      POST,
      "/api/calendar/events/1/reminders",
      { remindType: "next_week", remindTime: "07:00" },
      { id: "1" }
    );

    expect(status).toBe(400);
  });

  it("responde 400 con una hora mal formada", async () => {
    prismaMock.calendarEvent.findUnique.mockResolvedValue({ id: 1 });

    const { status } = await post(
      POST,
      "/api/calendar/events/1/reminders",
      { remindType: "same_day", remindTime: "25:00" },
      { id: "1" }
    );

    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await post(
      POST,
      "/api/calendar/events/1/reminders",
      { remindType: "same_day", remindTime: "07:00" },
      { id: "1" }
    );
    expect(status).toBe(401);
  });
});

describe("DELETE /api/calendar/reminders/[id]", () => {
  it("borra el recordatorio", async () => {
    prismaMock.calendarReminder.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.calendarReminder.delete.mockResolvedValue({});

    const { status, body } = await del(DELETE, "/api/calendar/reminders/1", { id: "1" });

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
  });

  it("responde 404 si el recordatorio no existe", async () => {
    prismaMock.calendarReminder.findUnique.mockResolvedValue(null);
    const { status } = await del(DELETE, "/api/calendar/reminders/999", { id: "999" });
    expect(status).toBe(404);
  });

  it("responde 400 si el id no es numérico", async () => {
    const { status } = await del(DELETE, "/api/calendar/reminders/abc", { id: "abc" });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await del(DELETE, "/api/calendar/reminders/1", { id: "1" });
    expect(status).toBe(401);
  });
});
