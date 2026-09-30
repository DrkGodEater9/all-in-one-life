// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const updateSessionMock = vi.fn();

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: updateSessionMock,
}));

async function run(path: string, user: { id: string } | null) {
  updateSessionMock.mockResolvedValue({ response: NextResponse.next(), user });
  const { middleware } = await import("@/middleware");
  const req = new NextRequest(`http://localhost:3000${path}`, { method: "POST" });
  return middleware(req);
}

describe("middleware — rutas públicas sin sesión", () => {
  it("deja pasar POST /api/auth/login sin sesión (si no, nadie podría autenticarse)", async () => {
    const res = await run("/api/auth/login", null);
    // Sin este caso público, el middleware corta con 401 antes de llegar al
    // handler y el login queda permanentemente roto.
    expect(res.status).not.toBe(401);
  });

  it("deja pasar POST /api/auth/logout sin sesión", async () => {
    const res = await run("/api/auth/logout", null);
    expect(res.status).not.toBe(401);
  });

  it("sigue bloqueando cualquier otra ruta /api sin sesión", async () => {
    const res = await run("/api/finance/balance", null);
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: "No autenticado" });
  });

  it("redirige a /login una página protegida sin sesión", async () => {
    const res = await run("/finance", null);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("deja pasar el cron sin exigir sesión de usuario", async () => {
    const res = await run("/api/cron/reminders", null);
    expect(res.status).not.toBe(401);
    expect(updateSessionMock).not.toHaveBeenCalled();
  });

  it("con sesión, /api/auth/login sigue respondiendo normal (no debe redirigir como /login)", async () => {
    const res = await run("/api/auth/login", { id: "u1" });
    expect(res.status).not.toBe(307);
  });

  it("con sesión, redirige fuera de /login", async () => {
    const res = await run("/login", { id: "u1" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).not.toContain("/login");
  });

  it("adjunta una CSP con nonce distinto en cada request", async () => {
    const res1 = await run("/finance", { id: "u1" });
    const res2 = await run("/finance", { id: "u1" });

    const csp1 = res1.headers.get("Content-Security-Policy");
    const csp2 = res2.headers.get("Content-Security-Policy");

    expect(csp1).toContain("default-src 'self'");
    expect(csp1).toContain("frame-ancestors 'none'");
    expect(csp1).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(csp1).not.toBe(csp2); // nonce nuevo por request
  });

  it("adjunta la CSP incluso en el 401 y en los redirects", async () => {
    const unauth = await run("/api/finance/balance", null);
    const redirect = await run("/finance", null);
    expect(unauth.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(redirect.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
  });
});
