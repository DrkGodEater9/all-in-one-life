// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/blog/route";
import { PATCH, DELETE } from "@/app/api/blog/[id]/route";
import { POST as POST_LINK } from "@/app/api/blog/[id]/links/route";
import { DELETE as DELETE_LINK } from "@/app/api/blog/[id]/links/[linkId]/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post, patch, del } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("/api/blog", () => {
  it("lista las entradas con el filtro de búsqueda y etiqueta", async () => {
    prismaMock.blogPost.findMany.mockResolvedValue([]);
    const { status } = await get(GET, "/api/blog?q=acta&tag=grupo");
    expect(status).toBe(200);
    const args = prismaMock.blogPost.findMany.mock.calls[0][0];
    expect(args.where.tags).toEqual({ has: "grupo" });
    expect(args.where.OR).toHaveLength(2);
  });

  it("crea una entrada y depura etiquetas repetidas", async () => {
    prismaMock.blogPost.create.mockResolvedValue({ id: 1, title: "Acta", links: [] });
    const { status } = await post(POST, "/api/blog", {
      title: "Acta",
      content: "Texto",
      tags: ["Grupo", "grupo", " IA "],
    });
    expect(status).toBe(201);
    expect(prismaMock.blogPost.create.mock.calls[0][0].data.tags).toEqual(["Grupo", "IA"]);
  });

  it("un título vacío da 400", async () => {
    const { status } = await post(POST, "/api/blog", { title: "  " });
    expect(status).toBe(400);
    expect(prismaMock.blogPost.create).not.toHaveBeenCalled();
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/blog");
    expect(status).toBe(401);
  });
});

describe("/api/blog/[id]", () => {
  it("PATCH actualiza la entrada", async () => {
    prismaMock.blogPost.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.blogPost.update.mockResolvedValue({ id: 1, title: "Nuevo", links: [] });
    const { status, body } = await patch(PATCH, "/api/blog/1", { title: "Nuevo" }, { id: "1" });
    expect(status).toBe(200);
    expect(body.title).toBe("Nuevo");
  });

  it("PATCH sin campos da 400", async () => {
    const { status } = await patch(PATCH, "/api/blog/1", {}, { id: "1" });
    expect(status).toBe(400);
  });

  it("DELETE 404 si no existe", async () => {
    prismaMock.blogPost.findUnique.mockResolvedValue(null);
    const { status } = await del(DELETE, "/api/blog/9", { id: "9" });
    expect(status).toBe(404);
  });
});

describe("/api/blog/[id]/links", () => {
  it("crea un link", async () => {
    prismaMock.blogPost.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.blogLink.create.mockResolvedValue({ id: 5, url: "https://drive.google.com/x" });
    const { status } = await post(
      POST_LINK,
      "/api/blog/1/links",
      { title: "Paper", url: "https://drive.google.com/x" },
      { id: "1" }
    );
    expect(status).toBe(201);
  });

  it("rechaza esquemas que no sean http(s)", async () => {
    const { status } = await post(
      POST_LINK,
      "/api/blog/1/links",
      { url: "javascript:alert(1)" },
      { id: "1" }
    );
    expect(status).toBe(400);
  });

  it("DELETE 404 si el link es de otra entrada", async () => {
    prismaMock.blogLink.findFirst.mockResolvedValue(null);
    const { status } = await del(DELETE_LINK, "/api/blog/1/links/9", { id: "1", linkId: "9" });
    expect(status).toBe(404);
  });
});
