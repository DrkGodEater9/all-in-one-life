import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// "/login" es la página; "/api/auth/login" y "/api/auth/logout" son las
// rutas que la respaldan y por definición se llaman sin sesión todavía
// (o con una ya inválida). Sin esto el middleware las corta con 401 antes
// de que el handler se ejecute y el login queda permanentemente roto.
const PUBLIC_PATHS = ["/login", "/auth/callback", "/api/auth/login", "/api/auth/logout"];

/**
 * CSP con nonce por request (receta oficial de Next.js para el App Router:
 * https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy).
 * El navegador nunca habla directo con Supabase ni con OpenFoodFacts —el
 * login pasa por /api/auth/login y la búsqueda de alimentos por
 * /api/nutrition/search, ambas server-side— así que todo lo demás es 'self'.
 *
 * `style-src` lleva 'unsafe-inline' además del nonce: Radix UI (Popover,
 * Select, DropdownMenu) posiciona con el atributo `style` inline en el DOM,
 * y ese atributo no lo cubre un nonce de CSP, solo 'unsafe-inline' o
 * 'unsafe-hashes' (poco soportado). Es un riesgo mucho menor que relajar
 * `script-src` —no permite ejecutar código, solo forzar estilos— así que el
 * nonce + 'strict-dynamic' se reserva para scripts, que es donde importa.
 */
function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function withCsp(nonce: string, response: NextResponse) {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // El cron de Vercel se autentica con CRON_SECRET, no con sesión.
  if (pathname.startsWith("/api/cron")) return withCsp(nonce, NextResponse.next());

  // `response` viene de updateSession con las cookies de sesión ya
  // refrescadas si el access token había expirado — hay que seguir usando
  // ESTE objeto (no uno nuevo) para no perder ese refresh silencioso.
  const { response, user } = await updateSession(request);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    if (pathname.startsWith("/api")) {
      return withCsp(nonce, NextResponse.json({ error: "No autenticado" }, { status: 401 }));
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return withCsp(nonce, NextResponse.redirect(url));
  }

  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return withCsp(nonce, NextResponse.redirect(url));
  }

  return withCsp(nonce, response);
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto assets estáticos y el manifest/sw de la PWA.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
