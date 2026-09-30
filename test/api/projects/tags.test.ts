// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/projects/tags/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("GET /api/projects/tags", () => {
  it("lista los tags ordenados por nombre", async () => {
    prismaMock.projectTag.findMany.mockResolvedValue([{ id: 1, name: "marketing" }]);
    const { status, body } = await get(GET, "/api/projects/tags");
    expect(status).toBe(200);
    expect(body).toEqual([{ id: 1, name: "marketing" }]);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/projects/tags");
    expect(status).toBe(401);
  });
});

describe("POST /api/projects/tags", () => {
  it("crea el tag si no existe", async () => {
    prismaMock.projectTag.findFirst.mockResolvedValue(null);
    prismaMock.projectTag.create.mockResolvedValue({ id: 5, name: "Ventas" });

    const { status, body } = await post(POST, "/api/projects/tags", { name: "Ventas" });

    expect(status).toBe(201);
    expect(body).toEqual({ id: 5, name: "Ventas" });
  });

  it("es idempotente por nombre (case-insensitive): 200 con el existente, no 500 por el @unique", async () => {
    prismaMock.projectTag.findFirst.mockResolvedValue({ id: 5, name: "Ventas" });

    const { status, body } = await post(POST, "/api/projects/tags", { name: "ventas" });

    expect(status).toBe(200);
    expect(body).toEqual({ id: 5, name: "Ventas" });
    expect(prismaMock.projectTag.create).not.toHaveBeenCalled();
  });

  it("rechaza un nombre vacío con 400", async () => {
    const { status } = await post(POST, "/api/projects/tags", { name: "" });
    expect(status).toBe(400);
  });
});
