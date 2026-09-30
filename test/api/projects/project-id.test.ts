// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, PUT, PATCH, DELETE } from "@/app/api/projects/[id]/route";
import { prismaMock } from "../../mocks/prisma";
import { get, put, patch, del } from "../../helpers/route";
import { signOut } from "../../mocks/session";

function makeProject(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    title: "Proyecto",
    description: "Descripción",
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

describe("GET /api/projects/[id]", () => {
  it("404 si no existe", async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);
    const { status } = await get(GET, "/api/projects/1", { id: "1" });
    expect(status).toBe(404);
  });

  it("un id no numérico da 400", async () => {
    const { status } = await get(GET, "/api/projects/abc", { id: "abc" });
    expect(status).toBe(400);
  });
});

describe("PATCH /api/projects/[id]", () => {
  it("un status fuera del enum exacto da 400", async () => {
    const { status } = await patch(PATCH, "/api/projects/1", { status: "en_pausa" }, { id: "1" });
    expect(status).toBe(400);
  });

  it("mueve la tarjeta del kanban: parche parcial de status sin reemplazar el resto", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 1 }); // assertProjectExists
    prismaMock.project.update.mockResolvedValue(makeProject({ id: 1, status: "en_progreso" }));

    const { status, body } = await patch(PATCH, "/api/projects/1", { status: "en_progreso" }, { id: "1" });

    expect(status).toBe(200);
    expect(body.status).toBe("en_progreso");
    expect(body.title).toBe("Proyecto"); // el resto del proyecto no se tocó

    const updateCall = prismaMock.project.update.mock.calls[0][0];
    expect(updateCall.data).toEqual({ status: "en_progreso" });
    expect(updateCall.data.title).toBeUndefined();
    expect(updateCall.data.description).toBeUndefined();
  });

  it("un parche vacío da 400", async () => {
    const { status } = await patch(PATCH, "/api/projects/1", {}, { id: "1" });
    expect(status).toBe(400);
  });

  it("un proyecto inexistente da 404", async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);
    const { status } = await patch(PATCH, "/api/projects/999", { status: "idea" }, { id: "999" });
    expect(status).toBe(404);
  });

  it("acepta viability null o uno de los tres valores válidos", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.project.update.mockResolvedValue(makeProject({ viability: "poco_viable" }));

    const { status, body } = await patch(
      PATCH,
      "/api/projects/1",
      { viability: "poco_viable" },
      { id: "1" }
    );
    expect(status).toBe(200);
    expect(body.viability).toBe("poco_viable");
  });

  it("categoryId null desconecta la categoría", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.project.update.mockResolvedValue(makeProject({ categoryId: null }));

    await patch(PATCH, "/api/projects/1", { categoryId: null }, { id: "1" });

    const updateCall = prismaMock.project.update.mock.calls[0][0];
    expect(updateCall.data.category).toEqual({ disconnect: true });
  });

  it("un categoryId inexistente da 400", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.projectCategory.findUnique.mockResolvedValue(null);

    const { status } = await patch(PATCH, "/api/projects/1", { categoryId: 999 }, { id: "1" });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await patch(PATCH, "/api/projects/1", { status: "idea" }, { id: "1" });
    expect(status).toBe(401);
  });
});

describe("PUT /api/projects/[id]", () => {
  it("el título es obligatorio en el reemplazo completo", async () => {
    const { status } = await put(PUT, "/api/projects/1", {}, { id: "1" });
    expect(status).toBe(400);
  });
});

describe("DELETE /api/projects/[id]", () => {
  it("borra notas, links y asignaciones de tags antes que el proyecto, en una transacción", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 1 });

    const { status, body } = await del(DELETE, "/api/projects/1", { id: "1" });

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });

    expect(prismaMock.projectNote.deleteMany).toHaveBeenCalledWith({ where: { projectId: 1 } });
    expect(prismaMock.projectLink.deleteMany).toHaveBeenCalledWith({ where: { projectId: 1 } });
    expect(prismaMock.projectTagAssignment.deleteMany).toHaveBeenCalledWith({
      where: { projectId: 1 },
    });
    expect(prismaMock.project.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("un proyecto inexistente da 404 y no borra nada", async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    const { status } = await del(DELETE, "/api/projects/999", { id: "999" });

    expect(status).toBe(404);
    expect(prismaMock.project.delete).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await del(DELETE, "/api/projects/1", { id: "1" });
    expect(status).toBe(401);
  });
});
