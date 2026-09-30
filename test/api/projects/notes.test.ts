// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/projects/[id]/notes/route";
import { DELETE } from "@/app/api/projects/[id]/notes/[noteId]/route";
import { prismaMock } from "../../mocks/prisma";
import { post, del } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("POST /api/projects/[id]/notes", () => {
  it("crea la nota", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.projectNote.create.mockResolvedValue({
      id: 1,
      projectId: 1,
      content: "Avance de hoy",
      createdAt: new Date(),
    });

    const { status, body } = await post(
      POST,
      "/api/projects/1/notes",
      { content: "Avance de hoy" },
      { id: "1" }
    );

    expect(status).toBe(201);
    expect(body.content).toBe("Avance de hoy");
  });

  it("una nota vacía da 400", async () => {
    const { status } = await post(POST, "/api/projects/1/notes", { content: "   " }, { id: "1" });
    expect(status).toBe(400);
    expect(prismaMock.projectNote.create).not.toHaveBeenCalled();
  });

  it("un proyecto inexistente da 404", async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);
    const { status } = await post(
      POST,
      "/api/projects/999/notes",
      { content: "x" },
      { id: "999" }
    );
    expect(status).toBe(404);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await post(POST, "/api/projects/1/notes", { content: "x" }, { id: "1" });
    expect(status).toBe(401);
  });
});

describe("DELETE /api/projects/[id]/notes/[noteId]", () => {
  it("borra la nota si pertenece al proyecto", async () => {
    prismaMock.projectNote.findFirst.mockResolvedValue({ id: 3 });

    const { status } = await del(DELETE, "/api/projects/1/notes/3", { id: "1", noteId: "3" });

    expect(status).toBe(200);
    expect(prismaMock.projectNote.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  it("404 si la nota no existe o pertenece a otro proyecto", async () => {
    prismaMock.projectNote.findFirst.mockResolvedValue(null);
    const { status } = await del(DELETE, "/api/projects/1/notes/999", { id: "1", noteId: "999" });
    expect(status).toBe(404);
  });
});
