// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/tasks/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post } from "../../helpers/route";
import { signOut } from "../../mocks/session";

function makeTask(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    title: "Tarea",
    description: null,
    urgent: false,
    important: false,
    status: "pending",
    date: null,
    time: null,
    recurrenceId: null,
    calendarEventId: null,
    doneAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    recurrence: null,
    labels: [],
    ...overrides,
  };
}

describe("GET /api/tasks", () => {
  it("coacciona ?urgent=true&important=false a booleanos reales, no a strings truthy", async () => {
    prismaMock.task.findMany.mockResolvedValue([]);

    await get(GET, "/api/tasks?urgent=true&important=false");

    const call = prismaMock.task.findMany.mock.calls[0][0];
    expect(call.where.urgent).toBe(true);
    expect(call.where.important).toBe(false);
    expect(typeof call.where.urgent).toBe("boolean");
    expect(typeof call.where.important).toBe("boolean");
  });

  it("un valor booleano inválido en el query da 400", async () => {
    const { status } = await get(GET, "/api/tasks?urgent=si");
    expect(status).toBe(400);
  });

  it("?label= acepta el id numérico de la etiqueta", async () => {
    prismaMock.task.findMany.mockResolvedValue([]);
    await get(GET, "/api/tasks?label=3");
    const call = prismaMock.task.findMany.mock.calls[0][0];
    expect(call.where.labels).toEqual({ some: { labelId: 3 } });
  });

  it("?label= acepta el nombre de la etiqueta", async () => {
    prismaMock.task.findMany.mockResolvedValue([]);
    await get(GET, "/api/tasks?label=trabajo");
    const call = prismaMock.task.findMany.mock.calls[0][0];
    expect(call.where.labels).toEqual({ some: { label: { name: "trabajo" } } });
  });

  it("un cuadrante inconsistente con la validación de zod da 400", async () => {
    const { status } = await get(GET, "/api/tasks?quadrant=inventado");
    expect(status).toBe(400);
  });

  it("devuelve las tareas serializadas", async () => {
    prismaMock.task.findMany.mockResolvedValue([makeTask({ id: 9, title: "Comprar leche" })]);
    const { status, body } = await get(GET, "/api/tasks");
    expect(status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: 9, title: "Comprar leche", quadrant: "eliminate" });
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/tasks");
    expect(status).toBe(401);
  });
});

describe("POST /api/tasks", () => {
  it("crea una tarea con labelNames nuevos: los crea vía upsert", async () => {
    prismaMock.taskLabel.upsert.mockResolvedValue({ id: 42, name: "urgente-casa" });
    prismaMock.task.create.mockResolvedValue({ id: 100 });
    prismaMock.task.findUnique.mockResolvedValue(
      makeTask({
        id: 100,
        title: "Regar plantas",
        labels: [{ labelId: 42, label: { id: 42, name: "urgente-casa", color: null } }],
      })
    );

    const { status, body } = await post(POST, "/api/tasks", {
      title: "Regar plantas",
      labelNames: ["urgente-casa"],
    });

    expect(status).toBe(201);
    expect(prismaMock.taskLabel.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: "urgente-casa" },
        create: { name: "urgente-casa" },
      })
    );
    expect(prismaMock.taskLabelAssignment.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: [{ taskId: 100, labelId: 42 }] })
    );
    expect(body.labels).toEqual([{ id: 42, name: "urgente-casa", color: null }]);
  });

  it("el atajo quadrant fija urgent/important", async () => {
    prismaMock.task.create.mockResolvedValue({ id: 101 });
    prismaMock.task.findUnique.mockResolvedValue(
      makeTask({ id: 101, urgent: true, important: true })
    );

    await post(POST, "/api/tasks", { title: "Hacer ya", quadrant: "do" });

    expect(prismaMock.task.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ urgent: true, important: true }) })
    );
  });

  it("rechaza un título vacío con 400", async () => {
    const { status } = await post(POST, "/api/tasks", { title: "   " });
    expect(status).toBe(400);
  });

  it("rechaza un cuadrante que no existe con 400", async () => {
    const { status } = await post(POST, "/api/tasks", { title: "x", quadrant: "urgentissimo" });
    expect(status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await post(POST, "/api/tasks", { title: "x" });
    expect(status).toBe(401);
  });
});
