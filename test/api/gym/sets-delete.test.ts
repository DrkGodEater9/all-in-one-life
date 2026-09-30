// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DELETE } from "@/app/api/gym/workouts/[id]/sets/[setId]/route";
import { prismaMock } from "../../mocks/prisma";
import { del } from "./_helpers";
import { signOut } from "../../mocks/session";

describe("DELETE /api/gym/workouts/[id]/sets/[setId]", () => {
  it("renumera las series restantes sin huecos al borrar una intermedia", async () => {
    prismaMock.gymWorkoutSet.findUnique.mockResolvedValue({
      id: 2,
      workoutId: 7,
      exerciseName: "Sentadilla",
      setNumber: 2,
    });
    // Tras borrar el set 2, quedan el 1 (setNumber 1, no cambia) y el que era 3
    // (ahora debe renumerarse a 2).
    prismaMock.gymWorkoutSet.findMany.mockResolvedValue([
      { id: 1, setNumber: 1 },
      { id: 3, setNumber: 3 },
    ]);
    prismaMock.gymWorkoutSet.update.mockResolvedValue({});
    prismaMock.gymWorkoutSet.delete.mockResolvedValue({});

    const { status, body } = await del(DELETE, "/api/gym/workouts/7/sets/2", {
      id: "7",
      setId: "2",
    });

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(prismaMock.gymWorkoutSet.delete).toHaveBeenCalledWith({ where: { id: 2 } });
    // Solo se actualiza el que cambió de número (id 3 -> setNumber 2).
    expect(prismaMock.gymWorkoutSet.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.gymWorkoutSet.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { setNumber: 2 },
    });
  });

  it("no llama a update si no quedan huecos (se borró la última serie)", async () => {
    prismaMock.gymWorkoutSet.findUnique.mockResolvedValue({
      id: 3,
      workoutId: 7,
      exerciseName: "Sentadilla",
      setNumber: 3,
    });
    prismaMock.gymWorkoutSet.findMany.mockResolvedValue([
      { id: 1, setNumber: 1 },
      { id: 2, setNumber: 2 },
    ]);
    prismaMock.gymWorkoutSet.delete.mockResolvedValue({});

    const { status } = await del(DELETE, "/api/gym/workouts/7/sets/3", {
      id: "7",
      setId: "3",
    });

    expect(status).toBe(200);
    expect(prismaMock.gymWorkoutSet.update).not.toHaveBeenCalled();
  });

  it("responde 404 si la serie no existe", async () => {
    prismaMock.gymWorkoutSet.findUnique.mockResolvedValue(null);

    const { status, body } = await del(DELETE, "/api/gym/workouts/7/sets/999", {
      id: "7",
      setId: "999",
    });

    expect(status).toBe(404);
    expect(body.error).toBe("La serie no existe");
  });

  it("responde 404 si la serie pertenece a otro entreno", async () => {
    prismaMock.gymWorkoutSet.findUnique.mockResolvedValue({
      id: 2,
      workoutId: 999,
      exerciseName: "Sentadilla",
      setNumber: 1,
    });

    const { status } = await del(DELETE, "/api/gym/workouts/7/sets/2", {
      id: "7",
      setId: "2",
    });

    expect(status).toBe(404);
  });

  it("responde 400 si algún id no es numérico", async () => {
    const { status } = await del(DELETE, "/api/gym/workouts/abc/sets/2", {
      id: "abc",
      setId: "2",
    });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await del(DELETE, "/api/gym/workouts/7/sets/2", {
      id: "7",
      setId: "2",
    });
    expect(status).toBe(401);
  });
});
