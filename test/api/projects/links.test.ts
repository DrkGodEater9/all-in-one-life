// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/projects/[id]/links/route";
import { DELETE } from "@/app/api/projects/[id]/links/[linkId]/route";
import { prismaMock } from "../../mocks/prisma";
import { post, del } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("POST /api/projects/[id]/links", () => {
  it("crea el link cuando la URL es válida", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.projectLink.create.mockResolvedValue({
      id: 1,
      projectId: 1,
      title: "Docs",
      url: "https://example.com/docs",
      createdAt: new Date(),
    });

    const { status, body } = await post(
      POST,
      "/api/projects/1/links",
      { title: "Docs", url: "https://example.com/docs" },
      { id: "1" }
    );

    expect(status).toBe(201);
    expect(body.url).toBe("https://example.com/docs");
  });

  it("una URL malformada da 400", async () => {
    const { status } = await post(
      POST,
      "/api/projects/1/links",
      { title: "Roto", url: "no-es-una-url" },
      { id: "1" }
    );
    expect(status).toBe(400);
    expect(prismaMock.projectLink.create).not.toHaveBeenCalled();
  });

  it("un proyecto inexistente da 404", async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);
    const { status } = await post(
      POST,
      "/api/projects/999/links",
      { url: "https://example.com" },
      { id: "999" }
    );
    expect(status).toBe(404);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await post(
      POST,
      "/api/projects/1/links",
      { url: "https://example.com" },
      { id: "1" }
    );
    expect(status).toBe(401);
  });
});

describe("DELETE /api/projects/[id]/links/[linkId]", () => {
  it("borra el link si pertenece al proyecto", async () => {
    prismaMock.projectLink.findFirst.mockResolvedValue({ id: 2 });

    const { status } = await del(DELETE, "/api/projects/1/links/2", { id: "1", linkId: "2" });

    expect(status).toBe(200);
    expect(prismaMock.projectLink.delete).toHaveBeenCalledWith({ where: { id: 2 } });
  });

  it("404 si el link no existe o pertenece a otro proyecto", async () => {
    prismaMock.projectLink.findFirst.mockResolvedValue(null);

    const { status } = await del(DELETE, "/api/projects/1/links/999", { id: "1", linkId: "999" });

    expect(status).toBe(404);
    expect(prismaMock.projectLink.delete).not.toHaveBeenCalled();
  });
});
