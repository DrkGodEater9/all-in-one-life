# Testing — Personal OS

Vitest + Testing Library. `npm test` (una pasada), `npm run test:watch`, `npm run test:coverage`.

Los tests viven en `test/`, espejando la estructura del código:

```
test/
  setup.ts              mocks globales (no tocar sin motivo)
  mocks/prisma.ts       mock profundo del cliente de Prisma
  mocks/session.ts      sesión de Supabase
  helpers/route.ts      invocar API routes
  lib/                  tests de lib/
  api/<modulo>/         tests de app/api/<modulo>/
  components/<modulo>/  tests de components/modules/<modulo>/
```

## Qué está mockeado y qué no

Se sustituyen **solo** la base y el cliente de Supabase:

| Mockeado | Real en los tests |
|---|---|
| `@/lib/db` (Prisma) | `withAuth` y el guardia de sesión |
| `@/lib/supabase/server` y `/client` | `lib/http`: `ok`, `serialize`, `toErrorResponse` |
| `next/navigation` | La validación con Zod de cada ruta |

Eso significa que cada test de una API route **también** cubre el 401 sin sesión, la traducción de `ZodError` a 400 y la serialización de `Decimal → number`. No los mockees.

## Tests de API routes

Ponles `// @vitest-environment node` en la **primera línea** (el entorno por defecto es jsdom, para componentes).

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/finance/transactions/route";
import { prismaMock } from "../../mocks/prisma";
import { get, post } from "../../helpers/route";
import { signOut } from "../../mocks/session";
import { Prisma } from "@prisma/client";

describe("GET /api/finance/transactions", () => {
  it("devuelve las transacciones del rango", async () => {
    prismaMock.financeTransaction.findMany.mockResolvedValue([
      { id: 1, amount: new Prisma.Decimal("1500.50"), type: "expense" },
    ]);

    const { status, body } = await get<{ id: number; amount: number }[]>(
      GET,
      "/api/finance/transactions?from=2026-01-01"
    );

    expect(status).toBe(200);
    expect(body[0].amount).toBe(1500.5);   // serializado a number, no a string
  });

  it("responde 401 sin sesión", async () => {
    signOut();
    const { status } = await get(GET, "/api/finance/transactions");
    expect(status).toBe(401);
  });

  it("rechaza un cuerpo inválido con 400", async () => {
    const { status } = await post(POST, "/api/finance/transactions", { amount: -1 });
    expect(status).toBe(400);
  });
});
```

Helpers de `test/helpers/route.ts`: `get`, `post`, `put`, `patch`, `del`, y `makeRequest`/`callRoute` para casos con headers. Todos devuelven `{ status, body, res }` y aceptan un genérico opcional para tipar `body` (por defecto `any`): `get<Transaction[]>(GET, "/api/finance/transactions")`. Pásalo cuando te dé autocompletado o te ayude a pillar un typo; no es obligatorio. El último parámetro son los `params` de una ruta dinámica: `get(GET, "/api/projects/7", { id: "7" })`.

El mock de Prisma crea modelos y métodos al vuelo: `prismaMock.<modelo>.<método>.mockResolvedValue(...)`. `$transaction` está implementado: con callback recibe el propio mock, con array resuelve el `Promise.all`.

## Tests de componentes

Entorno jsdom por defecto. Mockea `@/lib/api` para controlar las respuestas:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  qs: (o: Record<string, unknown>) => "",
}));
```

Consulta por rol y texto visible (`getByRole`, `findByText`), no por clases ni por `data-testid` salvo que no haya alternativa. Usa `findBy*` para lo asíncrono en vez de `waitFor` con timers.

## Qué merece un test

Prioriza lo que **puede romperse en silencio** y lo que duele si se rompe:

- Reglas de negocio con dinero o acumuladores: actualización de balances, pagos que no deben exceder el pendiente, cálculo de macros, volumen de entreno, rachas.
- Todo lo que sea atómico (`$transaction`): verifica que se revierte el efecto contrario al borrar.
- Fronteras de fecha y huso: `@db.Date` vuelve a medianoche UTC; un día de diferencia es el bug más fácil de colar.
- Validación: un cuerpo inválido debe dar 400, no un 500 ni un guardado a medias.
- Autorización: 401 sin sesión en al menos una ruta por módulo.
- Casos límite: listas vacías, división por cero, `null` en campos opcionales, valores que exceden límites.

No escribas tests que solo repiten la implementación (que `findMany` se llamó con exactamente ese objeto) salvo que el `where` **sea** la lógica que se quiere fijar, como en un filtro.
