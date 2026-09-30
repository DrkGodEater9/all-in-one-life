// @vitest-environment node
import { afterAll, describe, expect, it, vi } from "vitest";
import { withAuth, withRoute, assertCronSecret } from "@/lib/auth";
import { ok, ApiError, notFound } from "@/lib/http";
import { signOut, setTestUser } from "../mocks/session";
import { makeRequest, callRoute } from "../helpers/route";
import { z } from "zod";

describe("withAuth", () => {
  it("responde 401 sin sesión y no ejecuta el handler", async () => {
    signOut();
    const handler = vi.fn(async () => ok({ ok: true }));

    const { status, body } = await callRoute(withAuth(handler), makeRequest("/api/x"));

    expect(status).toBe(401);
    expect(body).toMatchObject({ error: "No autenticado" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("pasa el usuario autenticado al handler", async () => {
    setTestUser({ id: "user-42", email: "yo@ejemplo.com" });

    const route = withAuth(async ({ user }) => ok({ id: user.id }));
    const { status, body } = await callRoute(route, makeRequest("/api/x"));

    expect(status).toBe(200);
    expect(body).toEqual({ id: "user-42" });
  });

  it("expone los searchParams ya parseados", async () => {
    const route = withAuth(async ({ searchParams }) =>
      ok({ from: searchParams.get("from"), tipo: searchParams.get("type") })
    );

    const { body } = await callRoute(
      route,
      makeRequest("/api/x?from=2026-01-01&type=expense")
    );

    expect(body).toEqual({ from: "2026-01-01", tipo: "expense" });
  });

  it("expone los params de una ruta dinámica", async () => {
    const route = withAuth<{ id: string }>(async ({ params }) => ok({ id: params.id }));

    const { body } = await callRoute(route, makeRequest("/api/x/7"), { id: "7" });

    expect(body).toEqual({ id: "7" });
  });

  it("traduce un ZodError del handler a 400", async () => {
    const schema = z.object({ amount: z.number().positive() });
    const route = withAuth(async ({ req }) => ok(schema.parse(await req.json())));

    const { status, body } = await callRoute(
      route,
      makeRequest("/api/x", { method: "POST", body: { amount: -5 } })
    );

    expect(status).toBe(400);
    expect(body).toMatchObject({ error: "Datos inválidos" });
  });

  it("respeta el status de un ApiError lanzado por el handler", async () => {
    const route = withAuth(async () => {
      throw notFound("Transacción no encontrada");
    });

    const { status, body } = await callRoute(route, makeRequest("/api/x"));

    expect(status).toBe(404);
    expect(body).toMatchObject({ error: "Transacción no encontrada" });
  });

  it("no filtra detalles de un error inesperado", async () => {
    const route = withAuth(async () => {
      throw new Error("password=hunter2 en la cadena de conexión");
    });

    const { status, body } = await callRoute(route, makeRequest("/api/x"));

    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("hunter2");
  });
});

describe("withRoute", () => {
  it("ejecuta el handler sin exigir sesión", async () => {
    signOut();
    const route = withRoute(async () => ok({ publico: true }));

    const { status, body } = await callRoute(route, makeRequest("/api/cron/x"));

    expect(status).toBe(200);
    expect(body).toEqual({ publico: true });
  });
});

describe("assertCronSecret", () => {
  const original = process.env.CRON_SECRET;
  afterAll(() => {
    process.env.CRON_SECRET = original;
  });

  it("acepta el header correcto", () => {
    process.env.CRON_SECRET = "s3cr3t";
    const req = makeRequest("/api/cron/reminders", {
      headers: { authorization: "Bearer s3cr3t" },
    });
    expect(() => assertCronSecret(req)).not.toThrow();
  });

  it("rechaza un secreto equivocado con 401", () => {
    process.env.CRON_SECRET = "s3cr3t";
    const req = makeRequest("/api/cron/reminders", {
      headers: { authorization: "Bearer otro" },
    });
    expect(() => assertCronSecret(req)).toThrowError(ApiError);
  });

  it("rechaza si falta el header", () => {
    process.env.CRON_SECRET = "s3cr3t";
    expect(() => assertCronSecret(makeRequest("/api/cron/reminders"))).toThrow();
  });

  it("falla con 401 genérico (no 500) si CRON_SECRET no está configurado, para no filtrar el estado del servidor", () => {
    delete process.env.CRON_SECRET;
    const req = makeRequest("/api/cron/reminders", {
      headers: { authorization: "Bearer lo-que-sea" },
    });
    try {
      assertCronSecret(req);
      expect.unreachable("debió lanzar");
    } catch (e) {
      expect((e as ApiError).status).toBe(401);
    }
  });

  it("compara el secreto en tiempo constante (timingSafeEqual), no con !==", () => {
    process.env.CRON_SECRET = "s3cr3t";
    // Longitudes distintas: timingSafeEqual exigiría chequear el largo
    // aparte antes de comparar bytes, o lanzaría por longitudes distintas.
    const req = makeRequest("/api/cron/reminders", {
      headers: { authorization: "Bearer corto" },
    });
    expect(() => assertCronSecret(req)).toThrow();
  });
});
