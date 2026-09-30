// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PATCH, PUT, DELETE } from "@/app/api/tasks/[id]/route";
import { prismaMock } from "../../mocks/prisma";
import { patch, put, del } from "../../helpers/route";
import { signOut } from "../../mocks/session";

function makeTask(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    title: "Original",
    description: "Descripción original",
    urgent: false,
    important: false,
    status: "pending",
    date: null,
    time: null,
    recurrenceId: null,
    calendarEventId: null,
    doneAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    recurrence: null,
    labels: [],
    ...overrides,
  };
}

describe("PATCH /api/tasks/[id]", () => {
  it("un id no numérico da 400", async () => {
    const { status } = await patch(PATCH, "/api/tasks/abc", { urgent: true }, { id: "abc" });
    expect(status).toBe(400);
  });

  it("un parche vacío da 400 (refine de zod)", async () => {
    const { status } = await patch(PATCH, "/api/tasks/1", {}, { id: "1" });
    expect(status).toBe(400);
  });

  it("parchear solo urgent/important mueve de cuadrante sin tocar title/description/date", async () => {
    prismaMock.task.findUnique
      .mockResolvedValueOnce(makeTask({ id: 1, urgent: false, important: false })) // current
      .mockResolvedValueOnce(
        makeTask({ id: 1, urgent: true, important: true })
      ); // updated tras el patch

    const { status, body } = await patch(
      PATCH,
      "/api/tasks/1",
      { urgent: true, important: true },
      { id: "1" }
    );

    expect(status).toBe(200);
    expect(body.quadrant).toBe("do");
    expect(body.title).toBe("Original");
    expect(body.description).toBe("Descripción original");

    const updateCall = prismaMock.task.update.mock.calls[0][0];
    expect(updateCall.data).toEqual({ urgent: true, important: true });
    expect(updateCall.data.title).toBeUndefined();
    expect(updateCall.data.date).toBeUndefined();
  });

  it("el atajo quadrant fija urgent/important sin pedirlos sueltos", async () => {
    prismaMock.task.findUnique
      .mockResolvedValueOnce(makeTask({ id: 1, urgent: false, important: false }))
      .mockResolvedValueOnce(makeTask({ id: 1, urgent: true, important: false }));

    const { body } = await patch(PATCH, "/api/tasks/1", { quadrant: "delegate" }, { id: "1" });

    expect(body.quadrant).toBe("delegate");
    const updateCall = prismaMock.task.update.mock.calls[0][0];
    expect(updateCall.data).toEqual({ urgent: true, important: false });
  });

  it("un cuadrante inconsistente (valor fuera del enum) da 400", async () => {
    const { status } = await patch(
      PATCH,
      "/api/tasks/1",
      { quadrant: "no-existe" },
      { id: "1" }
    );
    expect(status).toBe(400);
  });

  it("patchear el título no toca urgent/important", async () => {
    prismaMock.task.findUnique
      .mockResolvedValueOnce(makeTask({ id: 1, urgent: true, important: false }))
      .mockResolvedValueOnce(makeTask({ id: 1, title: "Nuevo título", urgent: true, important: false }));

    const { body } = await patch(PATCH, "/api/tasks/1", { title: "Nuevo título" }, { id: "1" });

    expect(body.title).toBe("Nuevo título");
    const updateCall = prismaMock.task.update.mock.calls[0][0];
    expect(updateCall.data).toEqual({ title: "Nuevo título" });
    expect(updateCall.data.urgent).toBeUndefined();
  });

  it("pasar a done sella doneAt y genera la siguiente ocurrencia si la tarea es recurrente", async () => {
    const rule = { id: 5, frequency: "daily", intervalN: 1, dayOfMonth: null, endsOn: null };
    const current = makeTask({
      id: 1,
      status: "pending",
      date: new Date("2026-03-10T00:00:00.000Z"),
      recurrenceId: 5,
      recurrence: rule,
    });

    prismaMock.task.findUnique
      .mockResolvedValueOnce(current) // current, fuera de la transacción
      .mockResolvedValueOnce({ ...current, status: "done", doneAt: new Date("2026-03-10T12:00:00Z") }); // updated, dentro
    prismaMock.task.create.mockResolvedValue({ id: 999 });

    const { body } = await patch(PATCH, "/api/tasks/1", { status: "done" }, { id: "1" });

    expect(body.status).toBe("done");
    expect(body.doneAt).not.toBeNull();

    expect(prismaMock.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "pending",
          date: new Date("2026-03-11T00:00:00.000Z"),
          recurrenceId: 5,
        }),
      })
    );
  });

  it("volver de done a pending limpia doneAt", async () => {
    prismaMock.task.findUnique
      .mockResolvedValueOnce(makeTask({ id: 1, status: "done", doneAt: new Date("2026-01-01T00:00:00Z") }))
      .mockResolvedValueOnce(makeTask({ id: 1, status: "pending", doneAt: null }));

    const { body } = await patch(PATCH, "/api/tasks/1", { status: "pending" }, { id: "1" });

    expect(body.status).toBe("pending");
    expect(body.doneAt).toBeNull();
    const updateCall = prismaMock.task.update.mock.calls[0][0];
    expect(updateCall.data.doneAt).toBeNull();
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await patch(PATCH, "/api/tasks/1", { urgent: true }, { id: "1" });
    expect(status).toBe(401);
  });
});

describe("PUT /api/tasks/[id]", () => {
  it("reemplaza la tarea entera: lo que no venga en el body se limpia", async () => {
    prismaMock.task.findUnique
      .mockResolvedValueOnce(makeTask({ id: 1, description: "Vieja descripción", date: new Date("2026-01-01T00:00:00Z") }))
      .mockResolvedValueOnce(makeTask({ id: 1, description: null, date: null }));

    const { status, body } = await put(PUT, "/api/tasks/1", { title: "Solo título" }, { id: "1" });

    expect(status).toBe(200);
    const updateCall = prismaMock.task.update.mock.calls[0][0];
    expect(updateCall.data.description).toBeNull();
    expect(updateCall.data.date).toBeNull();
    expect(body.description).toBeNull();
  });

  it("un id no numérico da 400", async () => {
    const { status } = await put(PUT, "/api/tasks/x", { title: "x" }, { id: "x" });
    expect(status).toBe(400);
  });
});

describe("DELETE /api/tasks/[id]", () => {
  it("borra las asignaciones de etiquetas y la tarea dentro de una transacción", async () => {
    prismaMock.task.findUnique.mockResolvedValue(makeTask({ id: 1, recurrenceId: null }));

    const { status, body } = await del(DELETE, "/api/tasks/1", { id: "1" });

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(prismaMock.taskLabelAssignment.deleteMany).toHaveBeenCalledWith({
      where: { taskId: 1 },
    });
    expect(prismaMock.task.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("borra la regla de recurrencia huérfana tras borrar la tarea", async () => {
    prismaMock.task.findUnique.mockResolvedValue(makeTask({ id: 1, recurrenceId: 5 }));
    prismaMock.task.count.mockResolvedValue(0);
    prismaMock.calendarEvent.count.mockResolvedValue(0);

    await del(DELETE, "/api/tasks/1", { id: "1" });

    expect(prismaMock.recurrenceRule.delete).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it("no borra la regla si otra tarea o evento la sigue usando", async () => {
    prismaMock.task.findUnique.mockResolvedValue(makeTask({ id: 1, recurrenceId: 5 }));
    prismaMock.task.count.mockResolvedValue(1);
    prismaMock.calendarEvent.count.mockResolvedValue(0);

    await del(DELETE, "/api/tasks/1", { id: "1" });

    expect(prismaMock.recurrenceRule.delete).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await del(DELETE, "/api/tasks/1", { id: "1" });
    expect(status).toBe(401);
  });
});
