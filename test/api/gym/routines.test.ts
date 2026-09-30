// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PUT, DELETE } from "@/app/api/gym/routines/[id]/route";
import { prismaMock } from "../../mocks/prisma";
import { put, del } from "./_helpers";
import { signOut } from "../../mocks/session";

describe("PUT /api/gym/routines/[id]", () => {
  it("renombra y reemplaza la lista completa de ejercicios respetando el orden", async () => {
    prismaMock.gymRoutine.findUnique.mockResolvedValue({ id: 1, name: "Vieja" });
    prismaMock.gymRoutine.update.mockResolvedValue({});
    prismaMock.gymRoutineExercise.deleteMany.mockResolvedValue({ count: 2 });
    prismaMock.gymRoutineExercise.createMany.mockResolvedValue({ count: 2 });
    prismaMock.gymRoutine.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      name: "Empuje",
      exercises: [
        { id: 10, name: "Press banca", type: "weight", orderIndex: 0 },
        { id: 11, name: "Fondos", type: "bodyweight", orderIndex: 1 },
      ],
      _count: { workouts: 3 },
    });

    const { status, body } = await put(
      PUT,
      "/api/gym/routines/1",
      {
        name: "Empuje",
        exercises: [
          { name: "Press banca", type: "weight" },
          { name: "Fondos", type: "bodyweight" },
        ],
      },
      { id: "1" }
    );

    expect(status).toBe(200);
    expect(body.name).toBe("Empuje");
    expect(body.exercises.map((e: any) => e.orderIndex)).toEqual([0, 1]);

    // Reemplazo completo: borra todos y recrea en el orden recibido.
    expect(prismaMock.gymRoutineExercise.deleteMany).toHaveBeenCalledWith({
      where: { routineId: 1 },
    });
    expect(prismaMock.gymRoutineExercise.createMany).toHaveBeenCalledWith({
      data: [
        { routineId: 1, name: "Press banca", type: "weight", orderIndex: 0 },
        { routineId: 1, name: "Fondos", type: "bodyweight", orderIndex: 1 },
      ],
    });
    expect(prismaMock.gymRoutine.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "Empuje" },
    });
  });

  it("permite dejar la rutina sin ejercicios (no llama createMany)", async () => {
    prismaMock.gymRoutine.findUnique.mockResolvedValue({ id: 1, name: "Vieja" });
    prismaMock.gymRoutine.update.mockResolvedValue({});
    prismaMock.gymRoutineExercise.deleteMany.mockResolvedValue({ count: 2 });
    prismaMock.gymRoutine.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      name: "Vacía",
      exercises: [],
      _count: { workouts: 0 },
    });

    const { status } = await put(PUT, "/api/gym/routines/1", { name: "Vacía", exercises: [] }, { id: "1" });

    expect(status).toBe(200);
    expect(prismaMock.gymRoutineExercise.createMany).not.toHaveBeenCalled();
  });

  it("responde 404 si la rutina no existe", async () => {
    prismaMock.gymRoutine.findUnique.mockResolvedValue(null);

    const { status } = await put(
      PUT,
      "/api/gym/routines/999",
      { name: "X", exercises: [] },
      { id: "999" }
    );

    expect(status).toBe(404);
  });

  it("responde 400 con un nombre vacío", async () => {
    prismaMock.gymRoutine.findUnique.mockResolvedValue({ id: 1, name: "Vieja" });

    const { status } = await put(PUT, "/api/gym/routines/1", { name: "", exercises: [] }, { id: "1" });

    expect(status).toBe(400);
  });

  it("responde 400 si el id no es numérico", async () => {
    const { status } = await put(PUT, "/api/gym/routines/abc", { name: "X", exercises: [] }, { id: "abc" });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await put(PUT, "/api/gym/routines/1", { name: "X", exercises: [] }, { id: "1" });
    expect(status).toBe(401);
  });
});

describe("DELETE /api/gym/routines/[id]", () => {
  it("borra en cascada: sets -> entrenos -> ejercicios -> rutina", async () => {
    prismaMock.gymRoutine.findUnique.mockResolvedValue({ id: 1, name: "Empuje" });
    prismaMock.gymWorkout.findMany.mockResolvedValue([{ id: 100 }, { id: 101 }]);
    prismaMock.gymWorkoutSet.deleteMany.mockResolvedValue({ count: 5 });
    prismaMock.gymWorkout.deleteMany.mockResolvedValue({ count: 2 });
    prismaMock.gymRoutineExercise.deleteMany.mockResolvedValue({ count: 3 });
    prismaMock.gymRoutine.delete.mockResolvedValue({});

    const { status, body } = await del(DELETE, "/api/gym/routines/1", { id: "1" });

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });

    expect(prismaMock.gymWorkoutSet.deleteMany).toHaveBeenCalledWith({
      where: { workoutId: { in: [100, 101] } },
    });
    expect(prismaMock.gymWorkout.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [100, 101] } },
    });
    expect(prismaMock.gymRoutineExercise.deleteMany).toHaveBeenCalledWith({
      where: { routineId: 1 },
    });
    expect(prismaMock.gymRoutine.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("no intenta borrar sets/entrenos si la rutina no tiene entrenos", async () => {
    prismaMock.gymRoutine.findUnique.mockResolvedValue({ id: 1, name: "Sin uso" });
    prismaMock.gymWorkout.findMany.mockResolvedValue([]);
    prismaMock.gymRoutineExercise.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.gymRoutine.delete.mockResolvedValue({});

    const { status } = await del(DELETE, "/api/gym/routines/1", { id: "1" });

    expect(status).toBe(200);
    expect(prismaMock.gymWorkoutSet.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.gymWorkout.deleteMany).not.toHaveBeenCalled();
  });

  it("responde 404 si la rutina no existe", async () => {
    prismaMock.gymRoutine.findUnique.mockResolvedValue(null);
    const { status } = await del(DELETE, "/api/gym/routines/999", { id: "999" });
    expect(status).toBe(404);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await del(DELETE, "/api/gym/routines/1", { id: "1" });
    expect(status).toBe(401);
  });
});
