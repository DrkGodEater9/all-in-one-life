// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/nutrition/weight/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("GET /api/nutrition/weight", () => {
  it("devuelve la fecha de una columna @db.Date como el día correcto (UTC), no el anterior", async () => {
    // Medianoche UTC de un día: en un huso negativo (Bogotá, UTC-5) leerlo en
    // hora local restaría un día si se usara toDateKey en vez de dbDateKey.
    prismaMock.nutritionWeightLog.findMany.mockResolvedValue([
      { id: 1, date: new Date("2026-01-01T00:00:00.000Z"), weightKg: 70.5, notes: null },
    ]);

    const { status, body } = await get(GET, "/api/nutrition/weight");

    expect(status).toBe(200);
    expect(body[0].date).toBe("2026-01-01");
    expect(body[0].weightKg).toBe(70.5);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/nutrition/weight");
    expect(status).toBe(401);
  });
});

describe("POST /api/nutrition/weight", () => {
  it("crea un registro nuevo si no hay uno para ese día", async () => {
    prismaMock.nutritionWeightLog.findFirst.mockResolvedValue(null);
    prismaMock.nutritionWeightLog.create.mockResolvedValue({
      id: 1,
      weightKg: 71,
      notes: null,
    });

    const { status, body } = await post(POST, "/api/nutrition/weight", {
      weightKg: 71,
      date: "2026-01-05",
    });

    expect(status).toBe(201);
    expect(body.date).toBe("2026-01-05");
    expect(prismaMock.nutritionWeightLog.update).not.toHaveBeenCalled();
  });

  it("si ya existe un registro ese día, lo actualiza en vez de duplicarlo", async () => {
    prismaMock.nutritionWeightLog.findFirst.mockResolvedValue({ id: 5, weightKg: 70 });
    prismaMock.nutritionWeightLog.update.mockResolvedValue({ id: 5, weightKg: 72, notes: "ajuste" });

    const { status, body } = await post(POST, "/api/nutrition/weight", {
      weightKg: 72,
      date: "2026-01-05",
      notes: "ajuste",
    });

    expect(status).toBe(200); // actualización, no creación
    expect(body.weightKg).toBe(72);
    expect(prismaMock.nutritionWeightLog.create).not.toHaveBeenCalled();
    expect(prismaMock.nutritionWeightLog.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { weightKg: 72, notes: "ajuste" },
    });
  });

  it("responde 400 con un peso <= 0", async () => {
    const { status } = await post(POST, "/api/nutrition/weight", { weightKg: 0 });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await post(POST, "/api/nutrition/weight", { weightKg: 70 });
    expect(status).toBe(401);
  });
});
