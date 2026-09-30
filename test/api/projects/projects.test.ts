// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/projects/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post } from "../../helpers/route";
import { signOut } from "../../mocks/session";

function makeProject(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    title: "Proyecto",
    description: null,
    status: "idea",
    viability: null,
    categoryId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    category: null,
    tags: [],
    notes: [],
    links: [],
    ...overrides,
  };
}

describe("GET /api/projects", () => {
  it("filtra por status", async () => {
    prismaMock.project.findMany.mockResolvedValue([]);
    await get(GET, "/api/projects?status=en_progreso");
    const call = prismaMock.project.findMany.mock.calls[0][0];
    expect(call.where.status).toBe("en_progreso");
  });

  it("un status fuera del enum exacto da 400", async () => {
    const { status } = await get(GET, "/api/projects?status=archivado");
    expect(status).toBe(400);
  });

  it("?tag= acepta id numérico o nombre (case-insensitive)", async () => {
    prismaMock.project.findMany.mockResolvedValue([]);

    await get(GET, "/api/projects?tag=4");
    expect(prismaMock.project.findMany.mock.calls[0][0].where.tags).toEqual({
      some: { tagId: 4 },
    });

    await get(GET, "/api/projects?tag=Marketing");
    expect(prismaMock.project.findMany.mock.calls[1][0].where.tags).toEqual({
      some: { tag: { name: { equals: "Marketing", mode: "insensitive" } } },
    });
  });

  it("?category= acepta id numérico o nombre", async () => {
    prismaMock.project.findMany.mockResolvedValue([]);
    await get(GET, "/api/projects?category=Personal");
    expect(prismaMock.project.findMany.mock.calls[0][0].where.category).toEqual({
      name: { equals: "Personal", mode: "insensitive" },
    });
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/projects");
    expect(status).toBe(401);
  });
});

describe("POST /api/projects", () => {
  it("crea el proyecto con status por defecto 'idea'", async () => {
    prismaMock.project.create.mockResolvedValue(makeProject({ id: 10 }));

    const { status, body } = await post(POST, "/api/projects", { title: "Nuevo proyecto" });

    expect(status).toBe(201);
    expect(body.status).toBe("idea");
    const createCall = prismaMock.project.create.mock.calls[0][0];
    expect(createCall.data.status).toBe("idea");
  });

  it("un status fuera del enum exacto da 400", async () => {
    const { status } = await post(POST, "/api/projects", {
      title: "x",
      status: "en_pausa", // no es un valor válido
    });
    expect(status).toBe(400);
  });

  it("acepta viability explícito (fase 2) aunque la UI de fase 1 nunca lo mande", async () => {
    prismaMock.project.create.mockResolvedValue(makeProject({ id: 11, viability: "muy_viable" }));

    const { status, body } = await post(POST, "/api/projects", {
      title: "Con viabilidad",
      viability: "muy_viable",
    });

    expect(status).toBe(201);
    const createCall = prismaMock.project.create.mock.calls[0][0];
    expect(createCall.data.viability).toBe("muy_viable");
    expect(body.viability).toBe("muy_viable");
  });

  it("acepta viability null explícito sin romper nada", async () => {
    prismaMock.project.create.mockResolvedValue(makeProject({ id: 12, viability: null }));
    const { status } = await post(POST, "/api/projects", { title: "x", viability: null });
    expect(status).toBe(201);
  });

  it("un valor de viability fuera del enum da 400", async () => {
    const { status } = await post(POST, "/api/projects", {
      title: "x",
      viability: "super_viable",
    });
    expect(status).toBe(400);
  });

  it("tagNames nuevos se crean sin duplicar (case-insensitive)", async () => {
    prismaMock.projectTag.findFirst
      .mockResolvedValueOnce(null) // "Marketing" no existe
      .mockResolvedValueOnce({ id: 7, name: "Ventas" }); // "ventas" ya existe (distinta capitalización)
    prismaMock.projectTag.create.mockResolvedValue({ id: 8, name: "Marketing" });
    prismaMock.project.create.mockResolvedValue(makeProject({ id: 13 }));

    await post(POST, "/api/projects", {
      title: "Con tags",
      tagNames: ["Marketing", "ventas"],
    });

    expect(prismaMock.projectTag.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.projectTag.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "Marketing" } })
    );
    const createCall = prismaMock.project.create.mock.calls[0][0];
    expect(createCall.data.tags.create).toEqual(
      expect.arrayContaining([{ tagId: 8 }, { tagId: 7 }])
    );
  });

  it("tagIds y tagNames pueden combinarse sin duplicar ids repetidos", async () => {
    prismaMock.projectTag.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    prismaMock.projectTag.findFirst.mockResolvedValue({ id: 1, name: "duplicado" });
    prismaMock.project.create.mockResolvedValue(makeProject({ id: 14 }));

    await post(POST, "/api/projects", {
      title: "x",
      tagIds: [1, 2],
      tagNames: ["duplicado"],
    });

    const createCall = prismaMock.project.create.mock.calls[0][0];
    const tagIds = createCall.data.tags.create.map((t: { tagId: number }) => t.tagId);
    expect(new Set(tagIds).size).toBe(tagIds.length); // sin duplicados
    expect(tagIds.sort()).toEqual([1, 2]);
  });

  it("un tagId inexistente da 400", async () => {
    prismaMock.projectTag.findMany.mockResolvedValue([]); // ninguno encontrado
    const { status } = await post(POST, "/api/projects", { title: "x", tagIds: [999] });
    expect(status).toBe(400);
  });

  it("un categoryId inexistente da 400", async () => {
    prismaMock.projectCategory.findUnique.mockResolvedValue(null);
    const { status } = await post(POST, "/api/projects", { title: "x", categoryId: 999 });
    expect(status).toBe(400);
  });

  it("rechaza un título vacío con 400", async () => {
    const { status } = await post(POST, "/api/projects", { title: "   " });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await post(POST, "/api/projects", { title: "x" });
    expect(status).toBe(401);
  });
});
