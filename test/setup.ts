import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { prismaMock } from "./mocks/prisma";
import { createSupabaseMock, resetTestUser } from "./mocks/session";

/**
 * Sustituye la base y el cliente de Supabase en todo el grafo de módulos.
 *
 * Lo que NO se sustituye a propósito: `withAuth`, los helpers de `lib/http` y
 * la validación con Zod. Cada test de una API route ejecuta el guardia de auth
 * y la serialización de verdad.
 */
vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createSupabaseMock(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => createSupabaseMock(),
}));

// next/navigation no existe fuera del runtime de Next.
const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

beforeEach(() => {
  resetTestUser();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// jsdom no implementa estas dos y varios componentes de Radix las usan.
if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
}
