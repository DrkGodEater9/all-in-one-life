# Convenciones — Personal OS

Este documento es el contrato que **todos** los módulos deben respetar. La fuente de verdad del producto es `SPEC_FASE1.md`; esto solo fija *cómo* se escribe el código para que los módulos encajen entre sí.

## Stack

Next.js 14 (App Router) + TypeScript · Prisma · Supabase (Postgres + Auth) · Tailwind + shadcn/ui · Vercel Cron.

No sustituir librerías. No instalar dependencias nuevas sin que estén en la lista del spec.

## Rutas y estructura

| Qué | Dónde |
|---|---|
| Páginas de módulo | `app/(app)/<modulo>/page.tsx` — el route group `(app)` aplica el `AppShell` (sidebar + bottom nav). Las URLs son idénticas al spec: `/finance`, `/nutrition`, … |
| Login | `app/(auth)/login/page.tsx` — sin shell |
| API | `app/api/<modulo>/…/route.ts` |
| Componentes del módulo | `components/modules/<modulo>/*.tsx` |
| Primitivos de UI | `components/ui/*` |

> El único desvío respecto al árbol del spec es el route group `(app)`: es necesario porque el login no debe llevar sidebar, y no cambia ninguna URL.

**Cada agente de módulo es dueño exclusivo de sus tres carpetas** (`app/api/<mod>/`, `app/(app)/<mod>/`, `components/modules/<mod>/`). No editar archivos de otro módulo ni los compartidos (`lib/`, `components/ui/`, `components/layout/`, `prisma/schema.prisma`). Si algo compartido falta, reportarlo en vez de cambiarlo.

## API routes

Toda ruta usa el envoltorio `withAuth` de `@/lib/auth`, que exige sesión de Supabase y traduce errores al formato común.

```ts
import { withAuth } from "@/lib/auth";
import { ok, created, notFound, badRequest } from "@/lib/http";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({ amount: z.number().positive() });

export const GET = withAuth(async ({ searchParams }) => {
  const from = searchParams.get("from");
  return ok(await prisma.financeTransaction.findMany({ ... }));
});

export const POST = withAuth(async ({ req }) => {
  const data = bodySchema.parse(await req.json());   // ZodError -> 400 automático
  return created(await prisma.financeTransaction.create({ data }));
});
```

Rutas dinámicas: el segundo argumento de Next llega como `params` tipado.

```ts
export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest("id inválido");
  ...
  return ok({ success: true });
});
```

Reglas:

- **Zod en toda ruta que reciba body o query.** `schema.parse()` — el `ZodError` se convierte solo en un 400 con `details`.
- Errores: lanzar `notFound()`, `badRequest(msg)`, `new ApiError(status, msg)`. No devolver `NextResponse.json` de error a mano.
- Respuestas: `ok(data)` / `created(data)`. `ok` serializa recursivamente `Prisma.Decimal → number` y `Date → ISO string`, así que **el cliente siempre recibe números, no strings**.
- El cron (`/api/cron/reminders`) usa `withRoute` + `assertCronSecret(req)`, no `withAuth`.

## Tipos de fecha y hora

El schema usa `@db.Date` y `@db.Time` por separado. Helpers en `@/lib/utils`:

- `toDateKey(date?)` → `"YYYY-MM-DD"` (local)
- `parseDateKey("YYYY-MM-DD")` → `Date` en UTC medianoche, que es lo que espera una columna `@db.Date`
- `parseTime("HH:mm")` → `Date` para una columna `@db.Time`
- `formatTime(value)` → `"HH:mm"` desde una columna `@db.Time`

Las fechas viajan por la API siempre como `"YYYY-MM-DD"` y las horas como `"HH:mm"`. Nunca mandar un ISO completo para un campo de fecha.

## Cliente

`@/lib/api` expone `api.get/post/put/patch/delete` (prefijo `/api` implícito) y `qs(obj)` para querystrings. Los errores llegan como `ApiClientError` con `.status` y `.message`.

```ts
import { api, qs } from "@/lib/api";
const txs = await api.get<Transaction[]>(`/finance/transactions${qs({ from, to, type })}`);
```

Patrón de página de módulo: la `page.tsx` es un Server Component mínimo que renderiza `<PageHeader>` y un componente cliente de `components/modules/<mod>/`. Los datos se cargan en el cliente con `api.*` dentro de `useEffect`/handlers. Feedback de éxito y error con `toast` de `@/components/ui/use-toast`.

## Diseño

Tokens ya definidos en `app/globals.css` y mapeados en `tailwind.config.ts`. **Usar solo estas clases**, nunca colores de la paleta por defecto de Tailwind (`gray-800`, `indigo-500`, …) ni hex sueltos:

`bg-bg` · `bg-surface` · `bg-surface-2` · `border-border` · `text-text` · `text-text-2` · `text-text-3` · `bg-accent` / `text-accent` / `bg-accent-soft` · `text-green|yellow|red` · `text-success|warning|danger` · `text-cat-medical|cat-work|cat-personal|cat-study`

Tipografía: `font-sans` (Inter, UI) · `font-serif` (Instrument Serif, títulos y cifras destacadas) · `font-mono` (JetBrains Mono, **solo** cifras financieras, calorías y pesos).

Las seis reglas del spec, en corto:

1. Densidad informativa — contenido real en cada pantalla, padding generoso.
2. Un solo acento, con disciplina — el violeta solo para acción primaria y estado activo.
3. Sin sombras decorativas — separar con `border border-border`.
4. Números con personalidad — cifra en `font-serif` grande (usa el componente `Stat`), label en `Inter` pequeño debajo.
5. Motion solo funcional — 150ms de feedback. Sin animaciones de entrada por sección.
6. Sidebar fija en desktop, bottom nav en mobile — ya resuelto por `AppShell`.

Mobile first: toda vista debe funcionar a 375px de ancho.

## Componentes compartidos disponibles

De `@/components/ui` (también importables por archivo):

`Button` `Input` `Textarea` `Label` `Card`+`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter` `Dialog`+`DialogTrigger`/`DialogContent`/`DialogHeader`/`DialogBody`/`DialogFooter`/`DialogTitle`/`DialogDescription` `Tabs`+`TabsList`/`TabsTrigger`/`TabsContent` `Select`+`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem` `Badge` `Progress` `Switch` `Checkbox` `Separator` `Skeleton` `Popover` `DropdownMenu` `EmptyState` `Stat` `SectionHeader` `useToast`/`toast`

De `@/components/layout`: `PageHeader` (título + descripción + acción).

Estados vacíos: siempre `EmptyState`, nunca una pantalla en blanco. Estados de carga: `Skeleton`.

## Gráficas

`recharts`. Sin grid decorativo, ejes en `text-3`, tooltip con fondo `surface` y borde `border`, series en `accent` salvo que el spec pida colores concretos (macros, semáforo de proyectos).

## Calidad

- `npx tsc --noEmit` debe pasar limpio para los archivos propios.
- Nada de `any` salvo que sea inevitable; nada de credenciales hardcodeadas.
- Los textos de la interfaz van en español.
