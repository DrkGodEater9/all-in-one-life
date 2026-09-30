import { vi } from "vitest";

/**
 * Mock profundo y perezoso del cliente de Prisma.
 *
 * Cada acceso `prismaMock.<modelo>.<método>` devuelve el mismo `vi.fn()`, así
 * que un test puede programar `prismaMock.task.findMany.mockResolvedValue([...])`
 * y la ruta bajo prueba recibe exactamente eso. No hay lista de modelos que
 * mantener: el proxy los crea al vuelo.
 */
export type PrismaMock = Record<string, any> & {
  $transaction: ReturnType<typeof vi.fn>;
};

function createModelProxy() {
  const methods = new Map<string, ReturnType<typeof vi.fn>>();
  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === "then") return undefined; // no es un thenable
        if (!methods.has(prop)) methods.set(prop, vi.fn());
        return methods.get(prop);
      },
    }
  );
}

export function createPrismaMock(): PrismaMock {
  const models = new Map<string, unknown>();

  const $transaction = vi.fn(async (arg: unknown) => {
    // Forma callback: prisma.$transaction(tx => ...) — le pasamos el mismo mock.
    if (typeof arg === "function") {
      return (arg as (tx: unknown) => unknown)(proxy);
    }
    // Forma array: prisma.$transaction([p1, p2]).
    if (Array.isArray(arg)) return Promise.all(arg);
    return undefined;
  });

  const extras: Record<string, unknown> = {
    $transaction,
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  };

  const proxy = new Proxy({} as PrismaMock, {
    get(_target, prop: string) {
      if (prop in extras) return extras[prop];
      if (prop === "then") return undefined;
      if (!models.has(prop)) models.set(prop, createModelProxy());
      return models.get(prop);
    },
  });

  return proxy;
}

export const prismaMock = createPrismaMock();
