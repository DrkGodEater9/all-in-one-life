// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { GET } from "@/app/api/gym/exercise/[name]/history/route";
import { prismaMock } from "../../mocks/prisma";
import { get } from "./_helpers";
import { signOut } from "../../mocks/session";

function set(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    exerciseName: "Press banca",
    reps: 8,
    weightKg: new Prisma.Decimal("50"),
    durationSecs: null,
    distanceKm: null,
    workout: {
      id: 1,
      date: new Date("2026-01-01T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
      routine: { name: "Empuje" },
    },
    ...overrides,
  };
}

describe("GET /api/gym/exercise/[name]/history", () => {
  it("agrupa por sesión: peso máximo y volumen total (Σ reps × kg)", async () => {
    prismaMock.gymWorkoutSet.findMany.mockResolvedValue([
      set({ id: 1, reps: 8, weightKg: new Prisma.Decimal("50") }),
      set({ id: 2, reps: 6, weightKg: new Prisma.Decimal("60") }),
    ]);

    const { status, body } = await get(GET, "/api/gym/exercise/Press%20banca/history", {
      name: "Press%20banca",
    });

    expect(status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      workoutId: 1,
      date: "2026-01-01",
      setCount: 2,
      maxWeightKg: 60,
      totalVolume: 8 * 50 + 6 * 60, // 760
    });
  });

  it("decodifica el nombre del ejercicio con espacios y acentos", async () => {
    prismaMock.gymWorkoutSet.findMany.mockResolvedValue([]);

    await get(GET, "/api/gym/exercise/x/history", {
      name: encodeURIComponent("Press francés"),
    });

    expect(prismaMock.gymWorkoutSet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { exerciseName: "Press francés" } })
    );
  });

  it("separa sesiones distintas por workoutId", async () => {
    prismaMock.gymWorkoutSet.findMany.mockResolvedValue([
      set({
        id: 1,
        workout: {
          id: 1,
          date: new Date("2026-01-01T00:00:00.000Z"),
          createdAt: new Date(),
          routine: { name: "Empuje" },
        },
      }),
      set({
        id: 2,
        workout: {
          id: 2,
          date: new Date("2026-01-08T00:00:00.000Z"),
          createdAt: new Date(),
          routine: { name: "Empuje" },
        },
      }),
    ]);

    const { body } = await get(GET, "/api/gym/exercise/x/history", { name: "x" });

    expect(body).toHaveLength(2);
    expect(body.map((s: any) => s.date)).toEqual(["2026-01-01", "2026-01-08"]);
  });

  it("respeta el límite tomando las últimas N sesiones (orden ascendente por fecha)", async () => {
    const rows = [1, 2, 3].map((n) =>
      set({
        id: n,
        workout: {
          id: n,
          date: new Date(`2026-01-0${n}T00:00:00.000Z`),
          createdAt: new Date(),
          routine: { name: "Empuje" },
        },
      })
    );
    prismaMock.gymWorkoutSet.findMany.mockResolvedValue(rows);

    const { body } = await get(GET, "/api/gym/exercise/x/history?limit=2", { name: "x" });

    expect(body).toHaveLength(2);
    expect(body.map((s: any) => s.date)).toEqual(["2026-01-02", "2026-01-03"]);
  });

  it("responde 400 si falta el nombre del ejercicio", async () => {
    const { status } = await get(GET, "/api/gym/exercise//history", { name: "" });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/gym/exercise/x/history", { name: "x" });
    expect(status).toBe(401);
  });
});
