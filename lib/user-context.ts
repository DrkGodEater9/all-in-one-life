import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Usuario dueño de la petición en curso. `withAuth` lo fija con la sesión y
 * `lib/db.ts` lo lee para filtrar cada consulta. Vive aparte de `lib/db.ts`
 * para poder importarlo sin arrastrar Prisma (y para que los tests, que
 * sustituyen `@/lib/db`, sigan ejecutando el contexto de verdad).
 */
const userStore = new AsyncLocalStorage<string>();

/** Ejecuta `fn` con `userId` como dueño de todo lo que toque `prisma`. */
export function runAsUser<T>(userId: string, fn: () => T): T {
  return userStore.run(userId, fn);
}

export function currentUserId(): string | undefined {
  return userStore.getStore();
}

/** Igual que `currentUserId` pero lanza si no hay usuario en contexto. */
export function requireUserId(): string {
  const id = userStore.getStore();
  if (!id) throw new Error("No hay usuario en contexto");
  return id;
}
