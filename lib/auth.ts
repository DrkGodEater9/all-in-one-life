import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { toErrorResponse, unauthorized } from "@/lib/http";

/** Usuario autenticado o null. Para Server Components. */
export async function getUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Usuario autenticado; lanza 401 si no hay sesión. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) throw unauthorized();
  return user;
}

type RouteContext<P> = {
  req: NextRequest;
  user: User;
  params: P;
  searchParams: URLSearchParams;
};

/**
 * Envoltura estándar para toda API route: exige sesión, captura ZodError/ApiError
 * y devuelve el error en el formato común { error, details }.
 *
 *   export const GET = withAuth(async ({ searchParams }) => ok(await ...));
 */
export function withAuth<P extends Record<string, string | string[]> = Record<string, string>>(
  handler: (ctx: RouteContext<P>) => Promise<Response>
) {
  return async (req: NextRequest, segment?: { params: P }): Promise<Response> => {
    try {
      const user = await requireUser();
      const searchParams = new URL(req.url).searchParams;
      return await handler({
        req,
        user,
        params: (segment?.params ?? {}) as P,
        searchParams,
      });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

/** Igual que withAuth pero sin exigir sesión (cron, login). */
export function withRoute<P extends Record<string, string | string[]> = Record<string, string>>(
  handler: (ctx: Omit<RouteContext<P>, "user">) => Promise<Response>
) {
  return async (req: NextRequest, segment?: { params: P }): Promise<Response> => {
    try {
      const searchParams = new URL(req.url).searchParams;
      return await handler({
        req,
        params: (segment?.params ?? {}) as P,
        searchParams,
      });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

/** Valida el header Authorization de los cron jobs de Vercel. */
export function assertCronSecret(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  // Genérico y sin exponer si CRON_SECRET está configurado o no: esta ruta
  // es la única que no exige sesión, así que la responde cualquiera y no
  // conviene que el mensaje delate detalles de configuración del servidor.
  const unauthorizedResponse = () => unauthorized("No autorizado");
  if (!expected) throw unauthorizedResponse();

  const provided = req.headers.get("authorization") ?? "";
  const expectedHeader = `Bearer ${expected}`;
  const a = Buffer.from(provided);
  const b = Buffer.from(expectedHeader);
  // Comparación en tiempo constante: un `!==` normal corta en la primera
  // diferencia de byte, filtrando por temporización cuánto del secreto
  // acertó un intento. timingSafeEqual exige igual longitud, así que se
  // compara el largo aparte (eso sí es seguro de filtrar).
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw unauthorizedResponse();
  }
}
