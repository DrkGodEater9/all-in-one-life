// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/gym/workouts/[id]/sets/route";
import { prismaMock } from "../../mocks/prisma";
import { post } from "./_helpers";
import { signOut } from "../../mocks/session";

const baseWorkout = { id: 7, routineId: 1, date: new Date("2026-01-01T00:00:00.000Z") };

describe("POST /api/gym/workouts/[id]/sets", () => {
  it("acepta un set de tipo weight (reps + weightKg)", async () => {
    prismaMock.gymWorkout.findUnique.mockResolvedValue(baseWorkout);
    prismaMock.gymWorkoutSet.findFirst.mockResolvedValue(null);
    prismaMock.gymWorkoutSet.create.mockImplementation(async ({ data }: any) => ({
      id: 100,
      ...data,
    }));

    const { status, body } = await post(
      POST,
      "/api/gym/workouts/7/sets",
      { exerciseName: "Sentadilla", exerciseType: "weight", reps: 8, weightKg: 80 },
      { id: "7" }
    );

    expect(status).toBe(201);
    expect(body).toMatchObject({ exerciseType: "weight", reps: 8, weightKg: 80, setNumber: 1 });
  });

  it("acepta un set bodyweight (solo reps)", async () => {
    prismaMock.gymWorkout.findUnique.mockResolvedValue(baseWorkout);
    prismaMock.gymWorkoutSet.findFirst.mockResolvedValue(null);
    prismaMock.gymWorkoutSet.create.mockImplementation(async ({ data }: any) => ({
      id: 101,
      ...data,
    }));

    const { status, body } = await post(
      POST,
      "/api/gym/workouts/7/sets",
      { exerciseName: "Dominadas", exerciseType: "bodyweight", reps: 12 },
      { id: "7" }
    );

    expect(status).toBe(201);
    expect(body).toMatchObject({ exerciseType: "bodyweight", reps: 12, weightKg: null });
  });

  it("acepta un set de cardio (duración + distancia opcional)", async () => {
    prismaMock.gymWorkout.findUnique.mockResolvedValue(baseWorkout);
    prismaMock.gymWorkoutSet.findFirst.mockResolvedValue(null);
    prismaMock.gymWorkoutSet.create.mockImplementation(async ({ data }: any) => ({
      id: 102,
      ...data,
    }));

    const { status, body } = await post(
      POST,
      "/api/gym/workouts/7/sets",
      { exerciseName: "Trote", exerciseType: "cardio", durationSecs: 600, distanceKm: 2.5 },
      { id: "7" }
    );

    expect(status).toBe(201);
    expect(body).toMatchObject({ exerciseType: "cardio", durationSecs: 600, distanceKm: 2.5 });
  });

  it("acepta cardio sin distancia (opcional)", async () => {
    prismaMock.gymWorkout.findUnique.mockResolvedValue(baseWorkout);
    prismaMock.gymWorkoutSet.findFirst.mockResolvedValue(null);
    prismaMock.gymWorkoutSet.create.mockImplementation(async ({ data }: any) => ({
      id: 103,
      ...data,
    }));

    const { status, body } = await post(
      POST,
      "/api/gym/workouts/7/sets",
      { exerciseName: "Trote", exerciseType: "cardio", durationSecs: 300 },
      { id: "7" }
    );

    expect(status).toBe(201);
    expect(body.distanceKm).toBeNull();
  });

  it("rechaza weightKg en un set de cardio (400)", async () => {
    prismaMock.gymWorkout.findUnique.mockResolvedValue(baseWorkout);

    const { status, body } = await post(
      POST,
      "/api/gym/workouts/7/sets",
      { exerciseName: "Trote", exerciseType: "cardio", durationSecs: 300, weightKg: 10 },
      { id: "7" }
    );

    expect(status).toBe(400);
    expect(body.error).toBe("Datos inválidos");
  });

  it("rechaza durationSecs en un set de weight (400)", async () => {
    prismaMock.gymWorkout.findUnique.mockResolvedValue(baseWorkout);

    const { status } = await post(
      POST,
      "/api/gym/workouts/7/sets",
      { exerciseName: "Sentadilla", exerciseType: "weight", reps: 8, weightKg: 80, durationSecs: 60 },
      { id: "7" }
    );

    expect(status).toBe(400);
  });

  it("rechaza un exerciseType desconocido (400)", async () => {
    prismaMock.gymWorkout.findUnique.mockResolvedValue(baseWorkout);

    const { status } = await post(
      POST,
      "/api/gym/workouts/7/sets",
      { exerciseName: "X", exerciseType: "isometric", reps: 1 },
      { id: "7" }
    );

    expect(status).toBe(400);
  });

  it("calcula setNumber como max+1 del ejercicio en el entreno", async () => {
    prismaMock.gymWorkout.findUnique.mockResolvedValue(baseWorkout);
    prismaMock.gymWorkoutSet.findFirst.mockResolvedValue({ setNumber: 3 });
    prismaMock.gymWorkoutSet.create.mockImplementation(async ({ data }: any) => ({
      id: 200,
      ...data,
    }));

    const { body } = await post(
      POST,
      "/api/gym/workouts/7/sets",
      { exerciseName: "Sentadilla", exerciseType: "weight", reps: 5, weightKg: 100 },
      { id: "7" }
    );

    expect(body.setNumber).toBe(4);
    expect(prismaMock.gymWorkoutSet.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ setNumber: 4 }) })
    );
  });

  it("setNumber es independiente por ejercicio dentro del mismo entreno", async () => {
    prismaMock.gymWorkout.findUnique.mockResolvedValue(baseWorkout);
    // findFirst se filtra por exerciseName en el where real; simulamos que no hay
    // series previas de este ejercicio aunque sí las haya de otro.
    prismaMock.gymWorkoutSet.findFirst.mockResolvedValue(null);
    prismaMock.gymWorkoutSet.create.mockImplementation(async ({ data }: any) => ({
      id: 201,
      ...data,
    }));

    const { body } = await post(
      POST,
      "/api/gym/workouts/7/sets",
      { exerciseName: "Press banca", exerciseType: "weight", reps: 5, weightKg: 60 },
      { id: "7" }
    );

    expect(body.setNumber).toBe(1);
    expect(prismaMock.gymWorkoutSet.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workoutId: 7, exerciseName: "Press banca" }),
      })
    );
  });

  it("responde 404 si el entreno no existe", async () => {
    prismaMock.gymWorkout.findUnique.mockResolvedValue(null);

    const { status, body } = await post(
      POST,
      "/api/gym/workouts/999/sets",
      { exerciseName: "Sentadilla", exerciseType: "weight", reps: 5, weightKg: 50 },
      { id: "999" }
    );

    expect(status).toBe(404);
    expect(body.error).toBe("El entreno no existe");
  });

  it("responde 400 si el id de entreno no es numérico", async () => {
    const { status } = await post(
      POST,
      "/api/gym/workouts/abc/sets",
      { exerciseName: "Sentadilla", exerciseType: "weight", reps: 5, weightKg: 50 },
      { id: "abc" }
    );

    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await post(
      POST,
      "/api/gym/workouts/7/sets",
      { exerciseName: "Sentadilla", exerciseType: "weight", reps: 5, weightKg: 50 },
      { id: "7" }
    );
    expect(status).toBe(401);
  });
});
