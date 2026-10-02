// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/calendar/task-days/route";
import { prismaMock } from "../../mocks/prisma";
import { get } from "./_helpers";
import { signOut } from "../../mocks/session";

describe("GET /api/calendar/task-days", () => {
  it("devuelve las tareas con fecha (título, hora, estado), con el color de su primera etiqueta", async () => {
    prismaMock.task.findMany.mockResolvedValue([
      {
        id: 1,
        title: "A",
        status: "pending",
        time: null,
        date: new Date("2026-10-05T00:00:00.000Z"),
        urgent: true,
        important: false,
        labels: [{ label: { color: "green" } }],
      },
      {
        id: 2,
        title: "B",
        status: "done",
        time: new Date("1970-01-01T09:30:00.000Z"),
        date: new Date("2026-10-06T00:00:00.000Z"),
        urgent: false,
        important: true,
        labels: [],
      },
    ]);

    const { status, body } = await get(GET, "/api/calendar/task-days?from=2026-10-01&to=2026-10-31");

    expect(status).toBe(200);
    expect(body).toEqual([
      { id: 1, title: "A", status: "pending", time: null, date: "2026-10-05", urgent: true, important: false, labelColor: "green" },
      { id: 2, title: "B", status: "done", time: "09:30", date: "2026-10-06", urgent: false, important: true, labelColor: null },
    ]);
  });

  it("excluye tareas sin fecha y filtra por rango", async () => {
    prismaMock.task.findMany.mockResolvedValue([]);
    await get(GET, "/api/calendar/task-days?from=2026-10-01&to=2026-10-31");
    const where = prismaMock.task.findMany.mock.calls.at(-1)![0].where;
    expect(where.date.not).toBeNull();
    expect(where.date.gte).toEqual(new Date("2026-10-01T00:00:00.000Z"));
    expect(where.date.lte).toEqual(new Date("2026-10-31T00:00:00.000Z"));
  });

  it("400 con fecha inválida y 401 sin sesión", async () => {
    expect((await get(GET, "/api/calendar/task-days?from=hoy")).status).toBe(400);
    signOut();
    expect((await get(GET, "/api/calendar/task-days")).status).toBe(401);
  });
});
