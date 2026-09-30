import { vi } from "vitest";

/**
 * Sesión de Supabase que ven las rutas bajo prueba.
 *
 * `withAuth` se ejecuta de verdad en los tests — lo único que se sustituye es
 * el cliente de Supabase. Así cada test cubre también el guardia de auth.
 */
export type TestUser = { id: string; email: string } | null;

let currentUser: TestUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "test@personal-os.local",
};

export function setTestUser(user: TestUser) {
  currentUser = user;
}

/** Deja la petición sin sesión, para verificar que la ruta responde 401. */
export function signOut() {
  currentUser = null;
}

export function resetTestUser() {
  currentUser = {
    id: "00000000-0000-4000-8000-000000000001",
    email: "test@personal-os.local",
  };
}

export const getUserMock = vi.fn(async () => ({
  data: { user: currentUser },
  error: currentUser ? null : { message: "No session" },
}));

export const signInWithPasswordMock = vi.fn(async () => ({
  data: { user: currentUser },
  error: currentUser ? null : { message: "Invalid credentials" },
}));

export const signOutMock = vi.fn(async () => ({ error: null }));

export function createSupabaseMock() {
  return {
    auth: {
      getUser: getUserMock,
      signInWithPassword: signInWithPasswordMock,
      signOut: signOutMock,
    },
  };
}
