// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/finance/assets/route";
import { PUT, DELETE } from "@/app/api/finance/assets/[id]/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post, put, del } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("GET /api/finance/assets", () => {
  it("lista los activos", async () => {
    prismaMock.financeAsset.findMany.mockResolvedValue([{ id: 1, title: "Laptop" }]);
    const { status, body } = await get(GET, "/api/finance/assets");
    expect(status).toBe(200);
    expect(body).toHaveLength(1);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/finance/assets");
    expect(status).toBe(401);
  });
});

describe("POST /api/finance/assets", () => {
  it("crea el activo", async () => {
    prismaMock.financeAsset.create.mockResolvedValue({ id: 1, title: "Laptop", quantity: 1 });
    const { status, body } = await post(POST, "/api/finance/assets", {
      title: "Laptop",
      quantity: 1,
    });
    expect(status).toBe(201);
    expect(body.title).toBe("Laptop");
  });

  it("responde 400 con cantidad <= 0", async () => {
    const { status } = await post(POST, "/api/finance/assets", { title: "Laptop", quantity: 0 });
    expect(status).toBe(400);
  });

  it("responde 400 sin título", async () => {
    const { status } = await post(POST, "/api/finance/assets", { title: "", quantity: 1 });
    expect(status).toBe(400);
  });
});

describe("PUT /api/finance/assets/[id]", () => {
  it("responde 404 si el activo no existe", async () => {
    prismaMock.financeAsset.findUnique.mockResolvedValue(null);
    const { status } = await put(
      PUT,
      "/api/finance/assets/999",
      { title: "X", quantity: 1 },
      { id: "999" }
    );
    expect(status).toBe(404);
  });

  it("actualiza el activo existente", async () => {
    prismaMock.financeAsset.findUnique.mockResolvedValue({ id: 1, title: "Laptop" });
    prismaMock.financeAsset.update.mockResolvedValue({ id: 1, title: "Laptop Pro", quantity: 1 });
    const { status, body } = await put(
      PUT,
      "/api/finance/assets/1",
      { title: "Laptop Pro", quantity: 1 },
      { id: "1" }
    );
    expect(status).toBe(200);
    expect(body.title).toBe("Laptop Pro");
  });
});

describe("DELETE /api/finance/assets/[id]", () => {
  it("responde 404 si el activo no existe", async () => {
    prismaMock.financeAsset.findUnique.mockResolvedValue(null);
    const { status } = await del(DELETE, "/api/finance/assets/999", { id: "999" });
    expect(status).toBe(404);
  });

  it("borra el activo existente", async () => {
    prismaMock.financeAsset.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.financeAsset.delete.mockResolvedValue({});
    const { status, body } = await del(DELETE, "/api/finance/assets/1", { id: "1" });
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
  });
});
