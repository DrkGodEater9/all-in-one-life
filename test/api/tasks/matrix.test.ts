// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/tasks/matrix/route";
import { prismaMock } from "../../mocks/prisma";
import { get } from "../../helpers/route";
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

describe("GET /api/tasks/matrix", () => {
  it("agrupa las tareas abiertas en los 4 cuadrantes según urgent/important", async () => {
    prismaMock.task.findMany.mockResolvedValue([
      makeTask({ id: 1, urgent: true, important: true }), // do
      makeTask({ id: 2, urgent: false, important: true }), // schedule
      makeTask({ id: 3, urgent: true, important: false }), // delegate
      makeTask({ id: 4, urgent: false, important: false }), // eliminate
    ]);

    const { status, body } = await get(GET, "/api/tasks/matrix");

    expect(status).toBe(200);
    expect(body.do.map((t: { id: number }) => t.id)).toEqual([1]);
    expect(body.schedule.map((t: { id: number }) => t.id)).toEqual([2]);
    expect(body.delegate.map((t: { id: number }) => t.id)).toEqual([3]);
    expect(body.eliminate.map((t: { id: number }) => t.id)).toEqual([4]);
  });

  it("solo pide tareas pending/in_progress a la base, nunca done", async () => {
    prismaMock.task.findMany.mockResolvedValue([]);

    await get(GET, "/api/tasks/matrix");

    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ["pending", "in_progress"] } },
      })
    );
  });

  it("una tarea done no aparece aunque el mock la incluya (la ruta no filtra en memoria)", async () => {
    // Documenta el contrato: la matriz confía en el `where` de Prisma para
    // excluir `done`. Si la base devolviera una por error, la ruta la mostraría.
    prismaMock.task.findMany.mockResolvedValue([
      makeTask({ id: 5, status: "done", urgent: true, important: true }),
    ]);

    const { body } = await get(GET, "/api/tasks/matrix");

    expect(body.do.map((t: { id: number }) => t.id)).toEqual([5]);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/tasks/matrix");
    expect(status).toBe(401);
  });
});
