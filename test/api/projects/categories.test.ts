// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/projects/categories/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("GET /api/projects/categories", () => {
  it("lista las categorías ordenadas por nombre", async () => {
    prismaMock.projectCategory.findMany.mockResolvedValue([{ id: 1, name: "Personal" }]);
    const { status, body } = await get(GET, "/api/projects/categories");
    expect(status).toBe(200);
    expect(body).toEqual([{ id: 1, name: "Personal" }]);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/projects/categories");
    expect(status).toBe(401);
  });
});

describe("POST /api/projects/categories", () => {
  it("crea la categoría si no existe", async () => {
    prismaMock.projectCategory.findFirst.mockResolvedValue(null);
    prismaMock.projectCategory.create.mockResolvedValue({ id: 2, name: "Freelance" });

    const { status, body } = await post(POST, "/api/projects/categories", { name: "Freelance" });

    expect(status).toBe(201);
    expect(body).toEqual({ id: 2, name: "Freelance" });
  });

  it("es idempotente por nombre (case-insensitive): 200 con la existente, no 500 por el @unique", async () => {
    prismaMock.projectCategory.findFirst.mockResolvedValue({ id: 2, name: "Freelance" });

    const { status, body } = await post(POST, "/api/projects/categories", { name: "FREELANCE" });

    expect(status).toBe(200);
    expect(body).toEqual({ id: 2, name: "Freelance" });
    expect(prismaMock.projectCategory.create).not.toHaveBeenCalled();
  });

  it("rechaza un nombre vacío con 400", async () => {
    const { status } = await post(POST, "/api/projects/categories", { name: "" });
    expect(status).toBe(400);
  });
});
