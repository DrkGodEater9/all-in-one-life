import { NextRequest } from "next/server";

/** Construye una NextRequest para invocar un handler de API route. */
export function makeRequest(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const url = path.startsWith("http") ? path : `http://localhost:3000${path}`;
  const { method = "GET", body, headers = {} } = init;

  return new NextRequest(url, {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// `any` a propósito: los handlers reales llegan tipados como
// withAuth<{ id: string }> o withAuth<Record<string, string>>, formas que no
// unifican entre sí por varianza de parámetros. Este helper es solo para
// invocarlos en tests, no participa de la seguridad de tipos de la app.
type Handler = (
  req: NextRequest,
  segment?: { params: any }
) => Promise<Response>;

/**
 * Invoca un handler y devuelve status y cuerpo ya parseado.
 *
 * `T` por defecto es `any`, no `unknown`: es un helper de test, la corrección
 * la da la aserción en runtime (`expect`), no el tipo de retorno. Pásalo
 * explícito cuando quieras autocompletado o detectar un typo en una
 * propiedad: `get<Transaction[]>(GET, "/api/finance/transactions")`.
 */
export async function callRoute<T = any>(
  handler: Handler,
  req: NextRequest,
  params?: Record<string, string>
): Promise<{ status: number; body: T; res: Response }> {
  const res = await handler(req, params ? { params } : undefined);
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  return { status: res.status, body: body as T, res };
}

/**
 * Atajos GET/POST/PUT/PATCH/DELETE. Todos aceptan un genérico explícito para
 * tipar `body` en el resultado, p. ej. `get<Transaction[]>(GET, "/api/x")`.
 * Sin él, `body` es `any` — es un helper de test, la corrección la da la
 * aserción en runtime, no el tipo de retorno.
 */
export function get<T = any>(
  handler: Handler,
  path: string,
  params?: Record<string, string>
) {
  return callRoute<T>(handler, makeRequest(path), params);
}

/** Atajo: POST con cuerpo JSON. */
export function post<T = any>(
  handler: Handler,
  path: string,
  body: unknown,
  params?: Record<string, string>
) {
  return callRoute<T>(handler, makeRequest(path, { method: "POST", body }), params);
}

/** Atajo: PUT con cuerpo JSON. */
export function put<T = any>(
  handler: Handler,
  path: string,
  body: unknown,
  params?: Record<string, string>
) {
  return callRoute<T>(handler, makeRequest(path, { method: "PUT", body }), params);
}

/** Atajo: PATCH con cuerpo JSON. */
export function patch<T = any>(
  handler: Handler,
  path: string,
  body: unknown,
  params?: Record<string, string>
) {
  return callRoute<T>(handler, makeRequest(path, { method: "PATCH", body }), params);
}

/** Atajo: DELETE. */
export function del<T = any>(
  handler: Handler,
  path: string,
  params?: Record<string, string>
) {
  return callRoute<T>(handler, makeRequest(path, { method: "DELETE" }), params);
}
