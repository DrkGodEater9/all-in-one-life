// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PUT } from "@/app/api/gym/workouts/[id]/finish/route";
import { prismaMock } from "../../mocks/prisma";
import { put } from "./_helpers";
import { signOut } from "../../mocks/session";

const detail = {
  id: 7,
  routineId: 1,
  date: new Date("2026-01-01T00:00:00.000Z"),
  notes: null,
  createdAt: new Date("2026-01-01T10:00:00.000Z"),
  routine: { id: 1, name: "Empuje", exercises: [] },
  sets: [],
};

describe("PUT /api/gym/workouts/[id]/finish", () => {
  it("marca finishedAt la primera vez", async () => {
    prismaMock.gymWorkout.findUnique.mockResolvedValue({ ...detail, finishedAt: null });
    prismaMock.gymWorkout.update.mockResolvedValue({
      ...detail,
      finishedAt: new Date("2026-01-01T11:00:00.000Z"),
    });

    const { status, body } = await put(PUT, "/api/gym/workouts/7/finish", {}, { id: "7" });

    expect(status).toBe(200);
    expect(body.finishedAt).toBe("2026-01-01T11:00:00.000Z");
    expect(prismaMock.gymWorkout.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: { finishedAt: expect.any(Date) },
      })
    );
  });

  it("es idempotente: si ya estaba terminado no lo vuelve a actualizar", async () => {
    const finishedAt = new Date("2026-01-01T11:00:00.000Z");
    prismaMock.gymWorkout.findUnique.mockResolvedValue({ ...detail, finishedAt });
    prismaMock.gymWorkout.findUniqueOrThrow.mockResolvedValue({ ...detail, finishedAt });

    const { status, body } = await put(PUT, "/api/gym/workouts/7/finish", {}, { id: "7" });

    expect(status).toBe(200);
    expect(body.finishedAt).toBe(finishedAt.toISOString());
    expect(prismaMock.gymWorkout.update).not.toHaveBeenCalled();
  });

  it("responde 404 si el entreno no existe", async () => {
    prismaMock.gymWorkout.findUnique.mockResolvedValue(null);
    const { status } = await put(PUT, "/api/gym/workouts/999/finish", {}, { id: "999" });
    expect(status).toBe(404);
  });

  it("responde 400 si el id no es numérico", async () => {
    const { status } = await put(PUT, "/api/gym/workouts/abc/finish", {}, { id: "abc" });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await put(PUT, "/api/gym/workouts/7/finish", {}, { id: "7" });
    expect(status).toBe(401);
  });
});
