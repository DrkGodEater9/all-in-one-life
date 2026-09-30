// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/nutrition/streak/route";
import { prismaMock } from "../../mocks/prisma";
import { get } from "../../helpers/route";
import { signOut } from "../../mocks/session";

function withDates(...isoDates: string[]) {
  return isoDates.map((d) => ({ date: new Date(d) }));
}

describe("GET /api/nutrition/streak", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T08:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cuenta los días consecutivos hasta hoy cuando hoy ya se registró algo", async () => {
    prismaMock.nutritionMealLog.findMany.mockResolvedValue(
      withDates(
        "2026-01-10T00:00:00.000Z",
        "2026-01-09T00:00:00.000Z",
        "2026-01-08T00:00:00.000Z"
      )
    );

    const { status, body } = await get(GET, "/api/nutrition/streak");

    expect(status).toBe(200);
    expect(body.loggedToday).toBe(true);
    expect(body.streak).toBe(3);
    expect(body.lastLoggedDate).toBe("2026-01-10");
  });

  it("si hoy todavía no hay nada registrado, cuenta la racha desde ayer (no la rompe)", async () => {
    prismaMock.nutritionMealLog.findMany.mockResolvedValue(
      withDates("2026-01-09T00:00:00.000Z", "2026-01-08T00:00:00.000Z")
    );

    const { status, body } = await get(GET, "/api/nutrition/streak");

    expect(status).toBe(200);
    expect(body.loggedToday).toBe(false);
    expect(body.streak).toBe(2);
    expect(body.lastLoggedDate).toBeNull();
  });

  it("una racha rota devuelve 0 si ni ayer ni hoy hay registro", async () => {
    prismaMock.nutritionMealLog.findMany.mockResolvedValue(
      withDates("2026-01-05T00:00:00.000Z")
    );

    const { body } = await get(GET, "/api/nutrition/streak");

    expect(body.streak).toBe(0);
    expect(body.loggedToday).toBe(false);
  });

  it("sin ningún registro, la racha es 0", async () => {
    prismaMock.nutritionMealLog.findMany.mockResolvedValue([]);

    const { body } = await get(GET, "/api/nutrition/streak");

    expect(body.streak).toBe(0);
    expect(body.loggedToday).toBe(false);
    expect(body.lastLoggedDate).toBeNull();
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/nutrition/streak");
    expect(status).toBe(401);
  });
});
