// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DELETE } from "@/app/api/nutrition/log/item/[id]/route";
import { prismaMock } from "../../mocks/prisma";
import { del } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("DELETE /api/nutrition/log/item/[id]", () => {
  it("borra el item y, si era el último de la comida, borra también la comida", async () => {
    prismaMock.nutritionMealItem.findUnique.mockResolvedValue({ id: 1, mealLogId: 5 });
    prismaMock.nutritionMealItem.delete.mockResolvedValue({});
    prismaMock.nutritionMealItem.count.mockResolvedValue(0);
    prismaMock.nutritionMealLog.delete.mockResolvedValue({});

    const { status, body } = await del(DELETE, "/api/nutrition/log/item/1", { id: "1" });

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(prismaMock.nutritionMealLog.delete).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it("no borra la comida si todavía le quedan items", async () => {
    prismaMock.nutritionMealItem.findUnique.mockResolvedValue({ id: 2, mealLogId: 6 });
    prismaMock.nutritionMealItem.count.mockResolvedValue(2);

    const { status } = await del(DELETE, "/api/nutrition/log/item/2", { id: "2" });

    expect(status).toBe(200);
    expect(prismaMock.nutritionMealLog.delete).not.toHaveBeenCalled();
  });

  it("responde 404 si el item no existe", async () => {
    prismaMock.nutritionMealItem.findUnique.mockResolvedValue(null);
    const { status } = await del(DELETE, "/api/nutrition/log/item/999", { id: "999" });
    expect(status).toBe(404);
  });

  it("responde 400 con un id no numérico", async () => {
    const { status } = await del(DELETE, "/api/nutrition/log/item/abc", { id: "abc" });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await del(DELETE, "/api/nutrition/log/item/1", { id: "1" });
    expect(status).toBe(401);
  });
});
