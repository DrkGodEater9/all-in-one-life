// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/tasks/labels/route";
import { DELETE } from "@/app/api/tasks/labels/[id]/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post, del } from "../../helpers/route";
import { signOut } from "../../mocks/session";

describe("GET /api/tasks/labels", () => {
  it("incluye el número de tareas que usan cada etiqueta", async () => {
    prismaMock.taskLabel.findMany.mockResolvedValue([
      { id: 1, name: "casa", color: "green", _count: { tasks: 3 } },
    ]);

    const { status, body } = await get(GET, "/api/tasks/labels");

    expect(status).toBe(200);
    expect(body).toEqual([{ id: 1, name: "casa", color: "green", taskCount: 3 }]);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/tasks/labels");
    expect(status).toBe(401);
  });
});

describe("POST /api/tasks/labels", () => {
  it("crea la etiqueta si el nombre no existe", async () => {
    prismaMock.taskLabel.findUnique.mockResolvedValue(null);
    prismaMock.taskLabel.create.mockResolvedValue({ id: 2, name: "trabajo", color: null });

    const { status, body } = await post(POST, "/api/tasks/labels", { name: "trabajo" });

    expect(status).toBe(201);
    expect(body).toEqual({ id: 2, name: "trabajo", color: null, taskCount: 0 });
  });

  it("un nombre duplicado da 400, no 500 por violar el @unique", async () => {
    prismaMock.taskLabel.findUnique.mockResolvedValue({ id: 2, name: "trabajo", color: null });

    const { status, body } = await post(POST, "/api/tasks/labels", { name: "trabajo" });

    expect(status).toBe(400);
    expect(body.error).toMatch(/ya existe/i);
    expect(prismaMock.taskLabel.create).not.toHaveBeenCalled();
  });

  it("rechaza un nombre vacío con 400", async () => {
    const { status } = await post(POST, "/api/tasks/labels", { name: "" });
    expect(status).toBe(400);
  });
});

describe("DELETE /api/tasks/labels/[id]", () => {
  it("borra las asignaciones y la etiqueta en una transacción", async () => {
    prismaMock.taskLabel.findUnique.mockResolvedValue({ id: 3, name: "x", color: null });

    const { status, body } = await del(DELETE, "/api/tasks/labels/3", { id: "3" });

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(prismaMock.taskLabelAssignment.deleteMany).toHaveBeenCalledWith({
      where: { labelId: 3 },
    });
    expect(prismaMock.taskLabel.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  it("una etiqueta inexistente da 404", async () => {
    prismaMock.taskLabel.findUnique.mockResolvedValue(null);
    const { status } = await del(DELETE, "/api/tasks/labels/999", { id: "999" });
    expect(status).toBe(404);
  });
});
