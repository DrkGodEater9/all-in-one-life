import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// "/login" es la página; "/api/auth/login" y "/api/auth/logout" son las
// rutas que la respaldan y por definición se llaman sin sesión todavía
// (o con una ya inválida). Sin esto el middleware las corta con 401 antes
// de que el handler se ejecute y el login queda permanentemente roto.
const PUBLIC_PATHS = ["/login", "/auth/callback", "/api/auth/login", "/api/auth/logout"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // El cron de Vercel se autentica con CRON_SECRET, no con sesión.
  if (pathname.startsWith("/api/cron")) return NextResponse.next();

  const { response, user } = await updateSession(request);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto assets estáticos y el manifest/sw de la PWA.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
