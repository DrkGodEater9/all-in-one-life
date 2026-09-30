// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PUT, DELETE } from "@/app/api/calendar/events/[id]/route";
import { prismaMock } from "../../mocks/prisma";
import { put, del } from "./_helpers";
import { signOut } from "../../mocks/session";

describe("PUT /api/calendar/events/[id]", () => {
  it("edita una sola ocurrencia", async () => {
    prismaMock.calendarEvent.findUnique.mockResolvedValue({ id: 1, title: "Vieja" });
    prismaMock.calendarEvent.update.mockResolvedValue({ id: 1, title: "Nueva" });

    const { status, body } = await put(
      PUT,
      "/api/calendar/events/1",
      { title: "Nueva", date: "2026-01-01", time: "10:00", category: "work" },
      { id: "1" }
    );

    expect(status).toBe(200);
    expect(body.title).toBe("Nueva");
  });

  it("responde 404 si el evento no existe", async () => {
    prismaMock.calendarEvent.findUnique.mockResolvedValue(null);

    const { status } = await put(
      PUT,
      "/api/calendar/events/999",
      { title: "X", date: "2026-01-01", time: "10:00", category: "work" },
      { id: "999" }
    );

    expect(status).toBe(404);
  });

  it("responde 400 con una categoría inválida", async () => {
    prismaMock.calendarEvent.findUnique.mockResolvedValue({ id: 1 });

    const { status } = await put(
      PUT,
      "/api/calendar/events/1",
      { title: "X", date: "2026-01-01", time: "10:00", category: "invalida" },
      { id: "1" }
    );

    expect(status).toBe(400);
  });

  it("responde 400 si el id no es numérico", async () => {
    const { status } = await put(
      PUT,
      "/api/calendar/events/abc",
      { title: "X", date: "2026-01-01", time: "10:00", category: "work" },
      { id: "abc" }
    );
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await put(
      PUT,
      "/api/calendar/events/1",
      { title: "X", date: "2026-01-01", time: "10:00", category: "work" },
      { id: "1" }
    );
    expect(status).toBe(401);
  });
});

describe("DELETE /api/calendar/events/[id]", () => {
  it("modo 'this' (por defecto) borra solo esa ocurrencia y sus recordatorios", async () => {
    prismaMock.calendarEvent.findUnique.mockResolvedValue({
      id: 5,
      recurrenceId: 9,
      date: new Date("2026-01-15T00:00:00.000Z"),
    });
    prismaMock.calendarReminder.deleteMany.mockResolvedValue({ count: 2 });
    prismaMock.calendarEvent.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.calendarEvent.count.mockResolvedValue(3);
    prismaMock.task.count.mockResolvedValue(0);

    const { status, body } = await del(DELETE, "/api/calendar/events/5", { id: "5" });

    expect(status).toBe(200);
    expect(body).toMatchObject({ success: true, deleted: 1, mode: "this" });
    expect(prismaMock.calendarReminder.deleteMany).toHaveBeenCalledWith({
      where: { eventId: { in: [5] } },
    });
    expect(prismaMock.calendarEvent.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [5] } },
    });
    // Quedan otros eventos de la serie: no se borra la RecurrenceRule.
    expect(prismaMock.recurrenceRule.delete).not.toHaveBeenCalled();
  });

  it("modo 'future' borra esta ocurrencia y las posteriores (por fecha)", async () => {
    prismaMock.calendarEvent.findUnique.mockResolvedValue({
      id: 5,
      recurrenceId: 9,
      date: new Date("2026-01-15T00:00:00.000Z"),
    });
    prismaMock.calendarEvent.findMany.mockResolvedValue([{ id: 5 }, { id: 6 }, { id: 7 }]);
    prismaMock.calendarReminder.deleteMany.mockResolvedValue({ count: 6 });
    prismaMock.calendarEvent.deleteMany.mockResolvedValue({ count: 3 });
    prismaMock.calendarEvent.count.mockResolvedValue(0);
    prismaMock.task.count.mockResolvedValue(0);
    prismaMock.recurrenceRule.delete.mockResolvedValue({});

    const { status, body } = await del(
      DELETE,
      "/api/calendar/events/5?deleteRecurrence=future",
      { id: "5" }
    );

    expect(status).toBe(200);
    expect(body).toMatchObject({ deleted: 3, mode: "future" });
    expect(prismaMock.calendarEvent.findMany).toHaveBeenCalledWith({
      where: { recurrenceId: 9, date: { gte: expect.any(Date) } },
      select: { id: true },
    });
    expect(prismaMock.calendarEvent.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [5, 6, 7] } },
    });
    // La serie quedó vacía y ninguna tarea la usa: se limpia la RecurrenceRule.
    expect(prismaMock.recurrenceRule.delete).toHaveBeenCalledWith({ where: { id: 9 } });
  });

  it("modo 'all' borra toda la serie sin filtrar por fecha", async () => {
    prismaMock.calendarEvent.findUnique.mockResolvedValue({
      id: 6,
      recurrenceId: 9,
      date: new Date("2026-01-15T00:00:00.000Z"),
    });
    prismaMock.calendarEvent.findMany.mockResolvedValue([{ id: 5 }, { id: 6 }, { id: 7 }]);
    prismaMock.calendarReminder.deleteMany.mockResolvedValue({ count: 6 });
    prismaMock.calendarEvent.deleteMany.mockResolvedValue({ count: 3 });
    prismaMock.calendarEvent.count.mockResolvedValue(0);
    prismaMock.task.count.mockResolvedValue(0);

    const { body } = await del(DELETE, "/api/calendar/events/6?deleteRecurrence=all", {
      id: "6",
    });

    expect(body).toMatchObject({ deleted: 3, mode: "all" });
    expect(prismaMock.calendarEvent.findMany).toHaveBeenCalledWith({
      where: { recurrenceId: 9 },
      select: { id: true },
    });
  });

  it("ignora deleteRecurrence si el evento no pertenece a una serie", async () => {
    prismaMock.calendarEvent.findUnique.mockResolvedValue({
      id: 10,
      recurrenceId: null,
      date: new Date("2026-01-15T00:00:00.000Z"),
    });
    prismaMock.calendarReminder.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.calendarEvent.deleteMany.mockResolvedValue({ count: 1 });

    const { body } = await del(DELETE, "/api/calendar/events/10?deleteRecurrence=all", {
      id: "10",
    });

    expect(body).toMatchObject({ mode: "this", deleted: 1 });
    expect(prismaMock.calendarEvent.findMany).not.toHaveBeenCalled();
  });

  it("no borra la RecurrenceRule si aún la usa una tarea", async () => {
    prismaMock.calendarEvent.findUnique.mockResolvedValue({
      id: 5,
      recurrenceId: 9,
      date: new Date("2026-01-15T00:00:00.000Z"),
    });
    prismaMock.calendarReminder.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.calendarEvent.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.calendarEvent.count.mockResolvedValue(0);
    prismaMock.task.count.mockResolvedValue(1);

    await del(DELETE, "/api/calendar/events/5", { id: "5" });

    expect(prismaMock.recurrenceRule.delete).not.toHaveBeenCalled();
  });

  it("responde 404 si el evento no existe", async () => {
    prismaMock.calendarEvent.findUnique.mockResolvedValue(null);
    const { status } = await del(DELETE, "/api/calendar/events/999", { id: "999" });
    expect(status).toBe(404);
  });

  it("responde 400 con un deleteRecurrence inválido", async () => {
    prismaMock.calendarEvent.findUnique.mockResolvedValue({
      id: 5,
      recurrenceId: 9,
      date: new Date(),
    });
    const { status } = await del(DELETE, "/api/calendar/events/5?deleteRecurrence=todo", {
      id: "5",
    });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await del(DELETE, "/api/calendar/events/5", { id: "5" });
    expect(status).toBe(401);
  });
});
