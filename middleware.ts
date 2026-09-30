import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// "/login" es la página; "/api/auth/login" y "/api/auth/logout" son las
// rutas que la respaldan y por definición se llaman sin sesión todavía
// (o con una ya inválida). Sin esto el middleware las corta con 401 antes
// de que el handler se ejecute y el login queda permanentemente roto.
const PUBLIC_PATHS = ["/login", "/auth/callback", "/api/auth/login", "/api/auth/logout"];

/**
 * CSP sin nonce.
 *
 * Se intentó primero la receta oficial de Next (nonce por request +
 * 'strict-dynamic'), pero en Next 14.2.35 los <script> que el propio
 * App Router inyecta (streaming de RSC, el script de next-themes contra el
 * flash de tema) no reciben el nonce automáticamente pase lo que pase con
 * los headers — comprobado en build real: 0 de 17 <script> llevaban el
 * atributo. Con 'strict-dynamic' presente, el navegador ignora 'self' por
 * completo, así que **ningún** script corría: la app cargaba en blanco, sin
 * error visible, tanto en local (`next start`) como en producción (Vercel).
 *
 * En su lugar: 'self' + 'unsafe-inline' en script-src. Sigue bloqueando
 * cualquier script de otro origen (el riesgo real: inyectar/cargar JS
 * ajeno), que es la protección que de verdad importa aquí. Lo que se
 * relaja es permitir los <script> inline que el propio framework genera
 * (RSC streaming, next-themes) — esta app no tiene dangerouslySetInnerHTML
 * ni interpola datos de usuario en HTML crudo, así que no hay vector real
 * para que un atacante inyecte un <script> inline explotando esa relajación.
 *
 * El navegador nunca habla directo con Supabase ni con OpenFoodFacts —el
 * login pasa por /api/auth/login y la búsqueda de alimentos por
 * /api/nutrition/search, ambas server-side— así que todo lo demás es 'self'.
 * `style-src` también lleva 'unsafe-inline': Radix UI (Popover, Select,
 * DropdownMenu) posiciona con el atributo `style` inline en el DOM.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
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

function withCsp(response: NextResponse) {
  response.headers.set("Content-Security-Policy", CSP);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // El cron de Vercel se autentica con CRON_SECRET, no con sesión.
  if (pathname.startsWith("/api/cron")) return withCsp(NextResponse.next());

  // `response` viene de updateSession con las cookies de sesión ya
  // refrescadas si el access token había expirado — hay que seguir usando
  // ESTE objeto (no uno nuevo) para no perder ese refresh silencioso.
  const { response, user } = await updateSession(request);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    if (pathname.startsWith("/api")) {
      return withCsp(NextResponse.json({ error: "No autenticado" }, { status: 401 }));
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return withCsp(NextResponse.redirect(url));
  }

  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return withCsp(NextResponse.redirect(url));
  }

  return withCsp(response);
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto assets estáticos y el manifest/sw de la PWA.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
