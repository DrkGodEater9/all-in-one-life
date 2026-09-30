import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const unauthorized = (msg = "No autenticado") => new ApiError(401, msg);
export const notFound = (msg = "No encontrado") => new ApiError(404, msg);
export const badRequest = (msg = "Solicitud inválida", details?: unknown) =>
  new ApiError(400, msg, details);

/**
 * Convierte Decimal / Date de Prisma a tipos serializables:
 * Decimal -> number, Date -> ISO string. Recursivo.
 */
export function serialize<T>(value: T): T {
  if (value === null || value === undefined) return value;

  if (value instanceof Date) return value.toISOString() as unknown as T;

  if (typeof value === "object") {
    // Prisma.Decimal expone toFixed/toNumber sin ser Date ni Array
    const maybeDecimal = value as unknown as {
      toNumber?: () => number;
      constructor?: { name?: string };
    };
    if (
      typeof maybeDecimal.toNumber === "function" &&
      maybeDecimal.constructor?.name === "Decimal"
    ) {
      return maybeDecimal.toNumber() as unknown as T;
    }

    if (Array.isArray(value)) {
      return value.map((v) => serialize(v)) as unknown as T;
    }

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serialize(v);
    }
    return out as T;
  }

  return value;
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(serialize(data), { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function toErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Datos inválidos", details: error.flatten() },
      { status: 400 }
    );
  }
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, details: error.details ?? undefined },
      { status: error.status }
    );
  }
  console.error("[api] error no controlado:", error);
  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}
