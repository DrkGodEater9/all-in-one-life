// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/streaks/route";
import { DELETE } from "@/app/api/streaks/[id]/route";
import { PUT } from "@/app/api/streaks/[id]/checkin/route";
import { prismaMock } from "../../mocks/prisma";
import { callRoute, get, post } from "../../helpers/route";
import { signOut } from "../../mocks/session";

const row = (over: Record<string, unknown> = {}) => ({
  id: 1,
  name: "Gym",
  color: "#8b5cf6",
  mode: "daily",
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  checkins: [
    { date: new Date("2026-09-30T00:00:00.000Z") },
    { date: new Date("2026-10-01T00:00:00.000Z") },
  ],
  ...over,
});

describe("GET /api/streaks", () => {
  it("devuelve cada racha con sus estadísticas calculadas para 'today'", async () => {
    prismaMock.streak.findMany.mockResolvedValue([row()]);
    const { status, body } = await get(GET, "/api/streaks?today=2026-10-01");
    expect(status).toBe(200);
    expect(body[0]).toMatchObject({ name: "Gym", current: 2, best: 2, doneToday: true, status: "done" });
    expect(body[0].checkins).toBeUndefined();
  });

  it("rechaza un 'today' con formato inválido", async () => {
    const { status } = await get(GET, "/api/streaks?today=ayer");
    expect(status).toBe(400);
  });

  it("401 sin sesión", async () => {
    signOut();
    expect((await get(GET, "/api/streaks")).status).toBe(401);
  });
});

describe("POST /api/streaks", () => {
  it("crea una racha con nombre, color y modo", async () => {
    prismaMock.streak.create.mockResolvedValue(row({ mode: "alternate", checkins: [] }));
    const { status } = await post(POST, "/api/streaks", {
      name: "Gym",
      color: "#22c55e",
      mode: "alternate",
    });
    expect(status).toBe(201);
    expect(prismaMock.streak.create.mock.calls[0][0].data).toEqual({
      name: "Gym",
      color: "#22c55e",
      mode: "alternate",
    });
  });

  it("rechaza modo inválido, nombre vacío y color inválido", async () => {
    expect((await post(POST, "/api/streaks", { name: "X", mode: "weekly" })).status).toBe(400);
    expect((await post(POST, "/api/streaks", { name: " ", mode: "daily" })).status).toBe(400);
    expect((await post(POST, "/api/streaks", { name: "X", mode: "daily", color: "rojo" })).status).toBe(400);
  });
});

describe("PUT /api/streaks/[id]/checkin", () => {
  it("marca el día con upsert y devuelve la racha recalculada", async () => {
    prismaMock.streak.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.streakCheckin.upsert.mockResolvedValue({});
    prismaMock.streak.findUniqueOrThrow.mockResolvedValue(row());
    const req = new Request("http://localhost/api/streaks/1/checkin", {
      method: "PUT",
      body: JSON.stringify({ date: "2026-10-01", done: true }),
      headers: { "content-type": "application/json" },
    });
    const { status, body } = await callRoute(PUT, req as never, { id: "1" });
    expect(status).toBe(200);
    expect(prismaMock.streakCheckin.upsert).toHaveBeenCalled();
    expect(body.current).toBe(2);
  });

  it("desmarca con deleteMany y 404 si la racha no existe", async () => {
    prismaMock.streak.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.streakCheckin.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.streak.findUniqueOrThrow.mockResolvedValue(row({ checkins: [] }));
    const mk = () =>
      new Request("http://localhost/api/streaks/1/checkin", {
        method: "PUT",
        body: JSON.stringify({ date: "2026-10-01", done: false }),
        headers: { "content-type": "application/json" },
      }) as never;
    expect((await callRoute(PUT, mk(), { id: "1" })).status).toBe(200);
    expect(prismaMock.streakCheckin.deleteMany).toHaveBeenCalled();

    prismaMock.streak.findUnique.mockResolvedValue(null);
    expect((await callRoute(PUT, mk(), { id: "1" })).status).toBe(404);
  });
});

describe("DELETE /api/streaks/[id]", () => {
  it("borra la racha; 404 si no existe", async () => {
    prismaMock.streak.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.streak.delete.mockResolvedValue({});
    const req = new Request("http://localhost/api/streaks/1", { method: "DELETE" }) as never;
    expect((await callRoute(DELETE, req, { id: "1" })).status).toBe(200);

    prismaMock.streak.findUnique.mockResolvedValue(null);
    expect((await callRoute(DELETE, req, { id: "1" })).status).toBe(404);
  });
});
