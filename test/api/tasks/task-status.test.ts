// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PATCH } from "@/app/api/tasks/[id]/status/route";
import { prismaMock } from "../../mocks/prisma";
import { patch } from "../../helpers/route";
import { signOut } from "../../mocks/session";

function makeTask(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    title: "Tarea",
    description: null,
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

describe("PATCH /api/tasks/[id]/status", () => {
  it("un status fuera del enum da 400", async () => {
    const { status } = await patch(PATCH, "/api/tasks/1/status", { status: "archivado" }, { id: "1" });
    expect(status).toBe(400);
  });

  it("un id no numérico da 400", async () => {
    const { status } = await patch(PATCH, "/api/tasks/x/status", { status: "done" }, { id: "x" });
    expect(status).toBe(400);
  });

  it("pasar a done sella doneAt", async () => {
    const current = makeTask({ status: "pending", doneAt: null });
    prismaMock.task.findUnique.mockResolvedValue(current);
    prismaMock.task.update.mockResolvedValue({ ...current, status: "done", doneAt: new Date("2026-05-01T00:00:00Z") });

    const { status, body } = await patch(PATCH, "/api/tasks/1/status", { status: "done" }, { id: "1" });

    expect(status).toBe(200);
    expect(body.status).toBe("done");
    expect(body.doneAt).toBe("2026-05-01T00:00:00.000Z");
  });

  it("volver a pending limpia doneAt", async () => {
    const current = makeTask({ status: "done", doneAt: new Date("2026-05-01T00:00:00Z") });
    prismaMock.task.findUnique.mockResolvedValue(current);
    prismaMock.task.update.mockResolvedValue({ ...current, status: "in_progress", doneAt: null });

    const { body } = await patch(PATCH, "/api/tasks/1/status", { status: "in_progress" }, { id: "1" });

    expect(body.status).toBe("in_progress");
    expect(body.doneAt).toBeNull();

    const updateCall = prismaMock.task.update.mock.calls[0][0];
    expect(updateCall.data.doneAt).toBeNull();
  });

  it("marcar done una segunda vez no reescribe doneAt (idempotente)", async () => {
    const firstDoneAt = new Date("2026-05-01T00:00:00Z");
    const current = makeTask({ status: "done", doneAt: firstDoneAt });
    prismaMock.task.findUnique.mockResolvedValue(current);
    prismaMock.task.update.mockResolvedValue(current);

    await patch(PATCH, "/api/tasks/1/status", { status: "done" }, { id: "1" });

    const updateCall = prismaMock.task.update.mock.calls[0][0];
    expect(updateCall.data.doneAt).toEqual(firstDoneAt);
  });

  describe("recurrencia al completar", () => {
    it("daily: crea la siguiente ocurrencia desplazada intervalN días desde la fecha de la tarea", async () => {
      const rule = { id: 5, frequency: "daily", intervalN: 2, dayOfMonth: null, endsOn: null };
      const current = makeTask({
        status: "pending",
        date: new Date("2026-03-10T00:00:00.000Z"),
        recurrenceId: 5,
        recurrence: rule,
        labels: [{ labelId: 9, label: { id: 9, name: "casa", color: null } }],
      });
      prismaMock.task.findUnique.mockResolvedValue(current);
      prismaMock.task.update.mockResolvedValue({ ...current, status: "done", doneAt: new Date() });
      prismaMock.task.create.mockResolvedValue({ id: 55 });

      await patch(PATCH, "/api/tasks/1/status", { status: "done" }, { id: "1" });

      expect(prismaMock.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: current.title,
          status: "pending",
          date: new Date("2026-03-12T00:00:00.000Z"),
          recurrenceId: 5,
        }),
      });
      // Las etiquetas de la tarea original se copian a la nueva ocurrencia.
      expect(prismaMock.taskLabelAssignment.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: [{ taskId: 55, labelId: 9 }] })
      );
    });

    it("weekly: crea la siguiente ocurrencia desplazada intervalN semanas", async () => {
      const rule = { id: 6, frequency: "weekly", intervalN: 1, dayOfMonth: null, endsOn: null };
      const current = makeTask({
        status: "pending",
        date: new Date("2026-03-10T00:00:00.000Z"),
        recurrenceId: 6,
        recurrence: rule,
      });
      prismaMock.task.findUnique.mockResolvedValue(current);
      prismaMock.task.update.mockResolvedValue({ ...current, status: "done", doneAt: new Date() });
      prismaMock.task.create.mockResolvedValue({ id: 56 });

      await patch(PATCH, "/api/tasks/1/status", { status: "done" }, { id: "1" });

      expect(prismaMock.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ date: new Date("2026-03-17T00:00:00.000Z") }),
        })
      );
    });

    it("monthly: 31 de enero + 1 mes cae en el último día de febrero", async () => {
      const rule = { id: 7, frequency: "monthly", intervalN: 1, dayOfMonth: null, endsOn: null };
      const current = makeTask({
        status: "pending",
        date: new Date("2027-01-31T00:00:00.000Z"),
        recurrenceId: 7,
        recurrence: rule,
      });
      prismaMock.task.findUnique.mockResolvedValue(current);
      prismaMock.task.update.mockResolvedValue({ ...current, status: "done", doneAt: new Date() });
      prismaMock.task.create.mockResolvedValue({ id: 57 });

      await patch(PATCH, "/api/tasks/1/status", { status: "done" }, { id: "1" });

      expect(prismaMock.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ date: new Date("2027-02-28T00:00:00.000Z") }),
        })
      );
    });

    it("respeta endsOn: si la siguiente fecha lo supera, no crea ocurrencia", async () => {
      const rule = {
        id: 8,
        frequency: "daily",
        intervalN: 1,
        dayOfMonth: null,
        endsOn: new Date("2026-03-10T00:00:00.000Z"),
      };
      const current = makeTask({
        status: "pending",
        date: new Date("2026-03-10T00:00:00.000Z"),
        recurrenceId: 8,
        recurrence: rule,
      });
      prismaMock.task.findUnique.mockResolvedValue(current);
      prismaMock.task.update.mockResolvedValue({ ...current, status: "done", doneAt: new Date() });

      await patch(PATCH, "/api/tasks/1/status", { status: "done" }, { id: "1" });

      expect(prismaMock.task.create).not.toHaveBeenCalled();
    });

    it("si endsOn todavía no se supera, sí crea la ocurrencia", async () => {
      const rule = {
        id: 9,
        frequency: "daily",
        intervalN: 1,
        dayOfMonth: null,
        endsOn: new Date("2026-03-12T00:00:00.000Z"),
      };
      const current = makeTask({
        status: "pending",
        date: new Date("2026-03-10T00:00:00.000Z"),
        recurrenceId: 9,
        recurrence: rule,
      });
      prismaMock.task.findUnique.mockResolvedValue(current);
      prismaMock.task.update.mockResolvedValue({ ...current, status: "done", doneAt: new Date() });
      prismaMock.task.create.mockResolvedValue({ id: 58 });

      await patch(PATCH, "/api/tasks/1/status", { status: "done" }, { id: "1" });

      expect(prismaMock.task.create).toHaveBeenCalled();
    });

    it("una tarea sin recurrenceId no genera ninguna ocurrencia", async () => {
      const current = makeTask({ status: "pending", recurrenceId: null, recurrence: null });
      prismaMock.task.findUnique.mockResolvedValue(current);
      prismaMock.task.update.mockResolvedValue({ ...current, status: "done", doneAt: new Date() });

      await patch(PATCH, "/api/tasks/1/status", { status: "done" }, { id: "1" });

      expect(prismaMock.task.create).not.toHaveBeenCalled();
    });

    it("la tarea completada no se reabre: sigue en done, no se toca de vuelta a pending", async () => {
      const rule = { id: 10, frequency: "daily", intervalN: 1, dayOfMonth: null, endsOn: null };
      const current = makeTask({
        status: "pending",
        date: new Date("2026-03-10T00:00:00.000Z"),
        recurrenceId: 10,
        recurrence: rule,
      });
      prismaMock.task.findUnique.mockResolvedValue(current);
      prismaMock.task.update.mockResolvedValue({ ...current, status: "done", doneAt: new Date() });
      prismaMock.task.create.mockResolvedValue({ id: 60 });

      const { body } = await patch(PATCH, "/api/tasks/1/status", { status: "done" }, { id: "1" });

      // El body es la tarea original marcada done, no la nueva ocurrencia.
      expect(body.id).toBe(1);
      expect(body.status).toBe("done");
    });
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await patch(PATCH, "/api/tasks/1/status", { status: "done" }, { id: "1" });
    expect(status).toBe(401);
  });
});
