// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { serialize, ok, toErrorResponse, ApiError, badRequest } from "@/lib/http";
import { z } from "zod";

describe("serialize", () => {
  it("convierte Decimal de Prisma a number", () => {
    expect(serialize(new Prisma.Decimal("1234.56"))).toBe(1234.56);
  });

  it("convierte Date a ISO string", () => {
    const d = new Date("2026-03-15T00:00:00.000Z");
    expect(serialize(d)).toBe("2026-03-15T00:00:00.000Z");
  });

  it("recorre objetos y arrays anidados", () => {
    const input = {
      total: new Prisma.Decimal("10.50"),
      items: [
        { amount: new Prisma.Decimal("3.25"), date: new Date("2026-01-01T00:00:00Z") },
      ],
      nested: { deep: { value: new Prisma.Decimal("0.01") } },
    };

    expect(serialize(input)).toEqual({
      total: 10.5,
      items: [{ amount: 3.25, date: "2026-01-01T00:00:00.000Z" }],
      nested: { deep: { value: 0.01 } },
    });
  });

  it("deja intactos null, undefined y primitivas", () => {
    expect(serialize(null)).toBeNull();
    expect(serialize(undefined)).toBeUndefined();
    expect(serialize("texto")).toBe("texto");
    expect(serialize(42)).toBe(42);
    expect(serialize(false)).toBe(false);
  });
});

describe("ok", () => {
  it("responde 200 con el cuerpo serializado", async () => {
    const res = ok({ amount: new Prisma.Decimal("99.99") });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ amount: 99.99 });
  });
});

describe("toErrorResponse", () => {
  it("traduce ZodError a 400 con details", async () => {
    const schema = z.object({ amount: z.number() });
    let caught: unknown;
    try {
      schema.parse({ amount: "no es número" });
    } catch (e) {
      caught = e;
    }

    const res = toErrorResponse(caught);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Datos inválidos");
    expect(body.details).toBeDefined();
  });

  it("respeta el status de un ApiError", async () => {
    const res = toErrorResponse(new ApiError(404, "No encontrado"));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: "No encontrado" });
  });

  it("incluye los details de badRequest", async () => {
    const res = toErrorResponse(badRequest("id inválido", { id: "abc" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "id inválido",
      details: { id: "abc" },
    });
  });

  it("convierte cualquier otro error en 500 sin filtrar el mensaje", async () => {
    const res = toErrorResponse(new Error("connect ECONNREFUSED 10.0.0.1:5432"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Error interno del servidor");
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
  });
});
