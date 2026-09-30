// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/gym/workouts/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post } from "./_helpers";
import { signOut } from "../../mocks/session";

describe("GET /api/gym/workouts", () => {
  it("lista los entrenos con el resumen calculado", async () => {
    prismaMock.gymWorkout.findMany.mockResolvedValue([
      {
        id: 1,
        routineId: 5,
        date: new Date("2026-01-01T00:00:00.000Z"),
        notes: null,
        finishedAt: null,
        createdAt: new Date("2026-01-01T10:00:00.000Z"),
        routine: { name: "Empuje" },
        sets: [],
      },
    ]);

    const { status, body } = await get(GET, "/api/gym/workouts");

    expect(status).toBe(200);
    expect(body[0]).toMatchObject({ id: 1, routineName: "Empuje", date: "2026-01-01" });
  });

  it("responde 400 con una fecha 'from' mal formada", async () => {
    const { status } = await get(GET, "/api/gym/workouts?from=01-01-2026");
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/gym/workouts");
    expect(status).toBe(401);
  });
});

describe("POST /api/gym/workouts", () => {
  it("crea un entreno para la rutina indicada", async () => {
    prismaMock.gymRoutine.findUnique.mockResolvedValue({ id: 5, name: "Empuje" });
    prismaMock.gymWorkout.create.mockResolvedValue({
      id: 9,
      routineId: 5,
      date: new Date("2026-03-01T00:00:00.000Z"),
      notes: null,
      finishedAt: null,
      createdAt: new Date("2026-03-01T10:00:00.000Z"),
      routine: { id: 5, name: "Empuje", exercises: [] },
      sets: [],
    });

    const { status, body } = await post(POST, "/api/gym/workouts", {
      routineId: 5,
      date: "2026-03-01",
    });

    expect(status).toBe(201);
    expect(body.routineId).toBe(5);
  });

  it("responde 404 si la rutina no existe", async () => {
    prismaMock.gymRoutine.findUnique.mockResolvedValue(null);

    const { status } = await post(POST, "/api/gym/workouts", { routineId: 999 });

    expect(status).toBe(404);
  });

  it("responde 400 con un routineId inválido", async () => {
    const { status } = await post(POST, "/api/gym/workouts", { routineId: -1 });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await post(POST, "/api/gym/workouts", { routineId: 5 });
    expect(status).toBe(401);
  });
});
