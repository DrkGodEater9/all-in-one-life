// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const updateSessionMock = vi.fn();

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: updateSessionMock,
}));

async function run(
  path: string,
  user: { id: string } | null,
  opts: { refreshedCookie?: { name: string; value: string } } = {}
) {
  const sessionResponse = NextResponse.next();
  if (opts.refreshedCookie) sessionResponse.cookies.set(opts.refreshedCookie);
  updateSessionMock.mockResolvedValue({ response: sessionResponse, user });
  const { middleware } = await import("@/middleware");
  const req = new NextRequest(`http://localhost:3000${path}`, { method: "POST" });
  return middleware(req);
}

describe("middleware — rutas públicas sin sesión", () => {
  it("deja pasar POST /api/auth/login sin sesión (si no, nadie podría autenticarse)", async () => {
    const res = await run("/api/auth/login", null);
    expect(res.status).not.toBe(401);
  });

  it("deja pasar POST /api/auth/logout sin sesión", async () => {
    const res = await run("/api/auth/logout", null);
    expect(res.status).not.toBe(401);
  });

  it("no verifica la sesión de las rutas /api: lo hace withAuth en el handler (una sola ida a Supabase, no dos)", async () => {
    const res = await run("/api/finance/balance", null);
    // El middleware ya no corta con 401 aquí; la ruta se protege sola. Lo
    // que importa es que NO gastó un getUser() de red extra.
    expect(updateSessionMock).not.toHaveBeenCalled();
    expect(res.status).not.toBe(307);
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

  it("con sesión, redirige fuera de /login", async () => {
    const res = await run("/login", { id: "u1" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).not.toContain("/login");
  });

  it("adjunta la misma CSP (sin nonce) en cada request", async () => {
    // Sin nonce a propósito: Next 14.2.35 no lo aplica a los <script> que el
    // propio App Router inyecta (RSC streaming, next-themes), y con
    // 'strict-dynamic' eso bloqueaba absolutamente todo el JS — comprobado
    // en un build real, 0 de 17 <script> llevaban el atributo, página en
    // blanco sin error visible. Ver el comentario de CSP en middleware.ts.
    const res1 = await run("/finance", { id: "u1" });
    const res2 = await run("/finance", { id: "u1" });

    const csp1 = res1.headers.get("Content-Security-Policy");
    const csp2 = res2.headers.get("Content-Security-Policy");

    expect(csp1).toContain("default-src 'self'");
    expect(csp1).toContain("frame-ancestors 'none'");
    expect(csp1).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp1).not.toMatch(/nonce-/);
    expect(csp1).toBe(csp2); // estática, no cambia por request
  });

  it("adjunta la CSP incluso en el 401 y en los redirects", async () => {
    const unauth = await run("/api/finance/balance", null);
    const redirect = await run("/finance", null);
    expect(unauth.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(redirect.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
  });

  describe("preserva el refresh silencioso de la cookie de sesión", () => {
    // updateSession() refresca el access/refresh token de Supabase cuando el
    // access token expiró, escribiendo la cookie nueva en el `response` que
    // devuelve. Antes de este fix, los tres branches que construían un
    // NextResponse nuevo (401, redirect a /login, redirect fuera de /login)
    // tiraban esa cookie al piso — el navegador se quedaba con el refresh
    // token viejo, ya rotado por Supabase, y la siguiente vez que se
    // intentara usar fallaba: sesión cerrada sola, en silencio.
    const cookie = { name: "sb-access-token", value: "refrescada-123" };

    it("sobrevive en el redirect a /login", async () => {
      const res = await run("/finance", null, { refreshedCookie: cookie });
      expect(res.cookies.get("sb-access-token")?.value).toBe("refrescada-123");
    });

    it("sobrevive en el redirect fuera de /login", async () => {
      const res = await run("/login", { id: "u1" }, { refreshedCookie: cookie });
      expect(res.cookies.get("sb-access-token")?.value).toBe("refrescada-123");
    });

    it("sobrevive en el paso normal (con sesión, ruta protegida)", async () => {
      const res = await run("/finance", { id: "u1" }, { refreshedCookie: cookie });
      expect(res.cookies.get("sb-access-token")?.value).toBe("refrescada-123");
    });
  });
});
