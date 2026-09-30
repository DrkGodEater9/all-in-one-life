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

type Handler = (
  req: NextRequest,
  segment?: { params: Record<string, string> }
) => Promise<Response>;

/** Invoca un handler y devuelve status y cuerpo ya parseado. */
export async function callRoute<T = unknown>(
  handler: Handler,
  req: NextRequest,
  params?: Record<string, string>
): Promise<{ status: number; body: T; res: Response }> {
  const res = await handler(req, params ? { params } : undefined);
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  return { status: res.status, body: body as T, res };
}

/** Atajo: GET a una ruta sin parámetros dinámicos. */
export function get(handler: Handler, path: string, params?: Record<string, string>) {
  return callRoute(handler, makeRequest(path), params);
}

/** Atajo: POST con cuerpo JSON. */
export function post(
  handler: Handler,
  path: string,
  body: unknown,
  params?: Record<string, string>
) {
  return callRoute(handler, makeRequest(path, { method: "POST", body }), params);
}

/** Atajo: PUT con cuerpo JSON. */
export function put(
  handler: Handler,
  path: string,
  body: unknown,
  params?: Record<string, string>
) {
  return callRoute(handler, makeRequest(path, { method: "PUT", body }), params);
}

/** Atajo: PATCH con cuerpo JSON. */
export function patch(
  handler: Handler,
  path: string,
  body: unknown,
  params?: Record<string, string>
) {
  return callRoute(handler, makeRequest(path, { method: "PATCH", body }), params);
}

/** Atajo: DELETE. */
export function del(handler: Handler, path: string, params?: Record<string, string>) {
  return callRoute(handler, makeRequest(path, { method: "DELETE" }), params);
}
