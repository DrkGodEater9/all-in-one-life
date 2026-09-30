// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { GET } from "@/app/api/gym/exercise/[name]/record/route";
import { prismaMock } from "../../mocks/prisma";
import { get } from "./_helpers";
import { signOut } from "../../mocks/session";

function set(id: number, workoutId: number, date: string, reps: number, kg: number) {
  return {
    id,
    reps,
    weightKg: new Prisma.Decimal(String(kg)),
    workout: { id: workoutId, date: new Date(date) },
  };
}

describe("GET /api/gym/exercise/[name]/record", () => {
  it("calcula el mejor peso y el mejor volumen total de una sesión", async () => {
    prismaMock.gymWorkoutSet.findMany.mockResolvedValue([
      // sesión 1: 8x50 + 6x60 = 760 de volumen, mejor peso 60
      set(1, 1, "2026-01-01T00:00:00.000Z", 8, 50),
      set(2, 1, "2026-01-01T00:00:00.000Z", 6, 60),
      // sesión 2: 5x70 = 350 de volumen, mejor peso 70 (récord de peso)
      set(3, 2, "2026-01-08T00:00:00.000Z", 5, 70),
    ]);

    const { status, body } = await get(GET, "/api/gym/exercise/x/record", { name: "x" });

    expect(status).toBe(200);
    expect(body.setCount).toBe(3);
    expect(body.sessionCount).toBe(2);
    expect(body.bestWeight).toMatchObject({ value: 70, workoutId: 2 });
    expect(body.bestVolume).toMatchObject({ value: 760, workoutId: 1 });
    expect(body.bestReps).toMatchObject({ value: 8, workoutId: 1 });
  });

  it("devuelve records nulos cuando no hay series registradas", async () => {
    prismaMock.gymWorkoutSet.findMany.mockResolvedValue([]);

    const { body } = await get(GET, "/api/gym/exercise/x/record", { name: "x" });

    expect(body).toMatchObject({
      setCount: 0,
      sessionCount: 0,
      bestWeight: null,
      bestVolume: null,
      bestReps: null,
    });
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/gym/exercise/x/record", { name: "x" });
    expect(status).toBe(401);
  });
});
