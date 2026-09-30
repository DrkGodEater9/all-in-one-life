// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/gym/streak/route";
import { prismaMock } from "../../mocks/prisma";
import { get } from "./_helpers";
import { signOut } from "../../mocks/session";

describe("GET /api/gym/streak", () => {
  it("calcula días entrenados / días del mes para el mes indicado", async () => {
    prismaMock.gymWorkout.findMany.mockResolvedValue([
      { date: new Date("2026-02-01T00:00:00.000Z") },
      { date: new Date("2026-02-05T00:00:00.000Z") },
      { date: new Date("2026-02-05T00:00:00.000Z") }, // mismo día, dos entrenos
    ]);

    const { status, body } = await get(GET, "/api/gym/streak?month=2026-02");

    expect(status).toBe(200);
    expect(body).toMatchObject({
      month: "2026-02",
      daysInMonth: 28,
      daysTrained: 2, // días únicos, no entrenos
      workoutCount: 3,
      days: [1, 5],
    });
  });

  it("usa el mes actual si no se especifica", async () => {
    prismaMock.gymWorkout.findMany.mockResolvedValue([]);

    const { status, body } = await get(GET, "/api/gym/streak");

    expect(status).toBe(200);
    expect(body.daysTrained).toBe(0);
    expect(typeof body.month).toBe("string");
  });

  it("responde 400 con un mes mal formado", async () => {
    const { status } = await get(GET, "/api/gym/streak?month=2026-2");
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/gym/streak");
    expect(status).toBe(401);
  });
});
