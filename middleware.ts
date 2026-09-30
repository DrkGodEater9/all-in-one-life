import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// "/login" es la página; "/api/auth/login" y "/api/auth/logout" son las
// rutas que la respaldan y por definición se llaman sin sesión todavía
// (o con una ya inválida). Sin esto el middleware las corta con 401 antes
// de que el handler se ejecute y el login queda permanentemente roto.
//
// Match exacto, no `startsWith`: ninguna de estas rutas tiene ni debería
// tener sub-rutas, y `startsWith` haría pública por accidente cualquier
// ruta futura que empiece igual (`/api/auth/login/lo-que-sea`,
// `/login-analytics`) sin que nadie se dé cuenta.
const PUBLIC_PATHS = ["/login", "/auth/callback", "/api/auth/login", "/api/auth/logout"];
const isPublicPath = (pathname: string) => PUBLIC_PATHS.includes(pathname);

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

/**
 * Copia las cookies que `updateSession` haya puesto en `sessionResponse`
 * (el refresh silencioso del access/refresh token) hacia la respuesta que
 * de verdad se va a devolver, y le pone la CSP.
 *
 * Antes esto no existía: los 3 branches que construían un `NextResponse`
 * nuevo (401, redirect a /login, redirect fuera de /login) tiraban esas
 * cookies al piso. Si el access token justo expiraba en esa request,
 * Supabase rotaba el refresh token, la cookie nueva nunca llegaba al
 * navegador, y el siguiente intento de refrescar con el refresh token viejo
 * (ya rotado) fallaba — sesión cerrada sola, en silencio, justo lo
 * contrario de lo que se pidió ("que nunca se me salga la sesión"). Solo el
 * branch final (`return finish(response, response)`, sin redirect ni 401)
 * sobrevivía porque ahí sí se devolvía el objeto original intacto.
 */
function finish(target: NextResponse, sessionResponse: NextResponse) {
  for (const cookie of sessionResponse.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  target.headers.set("Content-Security-Policy", CSP);
  return target;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // El cron de Vercel se autentica con CRON_SECRET, no con sesión.
  if (pathname.startsWith("/api/cron")) {
    const res = NextResponse.next();
    res.headers.set("Content-Security-Policy", CSP);
    return res;
  }

  const { response, user } = await updateSession(request);
  const isPublic = isPublicPath(pathname);

  if (!user && !isPublic) {
    if (pathname.startsWith("/api")) {
      return finish(NextResponse.json({ error: "No autenticado" }, { status: 401 }), response);
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return finish(NextResponse.redirect(url), response);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return finish(NextResponse.redirect(url), response);
  }

  return finish(response, response);
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto assets estáticos y el manifest/sw de la PWA.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
