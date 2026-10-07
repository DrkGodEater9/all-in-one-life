// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/concepts/route";
import { PATCH, DELETE } from "@/app/api/concepts/[id]/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post, patch, del } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("/api/concepts", () => {
  it("lista ordenado alfabéticamente y aplica filtros", async () => {
    prismaMock.concept.findMany.mockResolvedValue([]);
    const { status } = await get(GET, "/api/concepts?q=red&topic=IA");
    expect(status).toBe(200);
    const args = prismaMock.concept.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ term: "asc" });
    expect(args.where.topic).toEqual({ equals: "IA", mode: "insensitive" });
    expect(args.where.OR).toHaveLength(2);
  });

  it("crea un concepto; el área vacía se guarda como null", async () => {
    prismaMock.concept.create.mockResolvedValue({ id: 1, term: "Backprop" });
    const { status } = await post(POST, "/api/concepts", {
      term: "Backprop",
      definition: "Propagación del error hacia atrás",
      topic: "  ",
    });
    expect(status).toBe(201);
    expect(prismaMock.concept.create.mock.calls[0][0].data.topic).toBeNull();
  });

  it("exige concepto y explicación", async () => {
    expect((await post(POST, "/api/concepts", { term: "", definition: "x" })).status).toBe(400);
    expect((await post(POST, "/api/concepts", { term: "x", definition: " " })).status).toBe(400);
    expect(prismaMock.concept.create).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    expect((await get(GET, "/api/concepts")).status).toBe(401);
  });
});

describe("/api/concepts/[id]", () => {
  it("PATCH actualiza", async () => {
    prismaMock.concept.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.concept.update.mockResolvedValue({ id: 1, term: "Nuevo" });
    const { status } = await patch(PATCH, "/api/concepts/1", { term: "Nuevo" }, { id: "1" });
    expect(status).toBe(200);
  });

  it("DELETE 404 si no existe", async () => {
    prismaMock.concept.findUnique.mockResolvedValue(null);
    expect((await del(DELETE, "/api/concepts/9", { id: "9" })).status).toBe(404);
  });

  it("DELETE borra", async () => {
    prismaMock.concept.findUnique.mockResolvedValue({ id: 3 });
    const { status } = await del(DELETE, "/api/concepts/3", { id: "3" });
    expect(status).toBe(200);
    expect(prismaMock.concept.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });
});
