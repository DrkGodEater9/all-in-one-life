# Personal OS

Web app personal para gestionar finanzas, nutrición, gym, calendario, tareas y proyectos desde un solo lugar. Monousuario, sin registro público.

Spec del producto: [`SPEC_FASE1.md`](SPEC_FASE1.md) · Convenciones de código: [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md)

## Stack

Next.js 14 (App Router) · TypeScript · Prisma · Supabase (Postgres + Auth) · Tailwind + shadcn/ui · Vercel Cron.

## Puesta en marcha

1. **Variables de entorno** — copia la plantilla y llénala:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | De dónde sale |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
   | `DATABASE_URL` | Supabase → botón *Connect* → **Transaction pooler**, puerto 6543, con `?pgbouncer=true` |
   | `DIRECT_URL` | Mismo diálogo → **Session pooler**, puerto 5432 (no la "conexión directa") |
   | `CRON_SECRET` | Cualquier string aleatorio. Protege `/api/cron/reminders`. |

   > **Ojo con la "conexión directa"** (`db.<ref>.supabase.co:5432`, sin pooler): en proyectos nuevos de Supabase ese host solo resuelve por IPv6. Si tu red no tiene salida IPv6 (típico en Windows/redes domésticas), `prisma db push` falla con `P1001: Can't reach database server`. El *connection pooling* (mismo host `aws-0-<region>.pooler.supabase.com` para ambos modos) sí resuelve por IPv4 — úsalo para `DATABASE_URL` **y** `DIRECT_URL`, no solo para el primero.

   Prisma también lee `.env` (no `.env.local`) para los comandos de CLI: pon ahí `DATABASE_URL` y `DIRECT_URL`.

2. **Base de datos**

   ```bash
   npm run db:push     # crea las tablas a partir de prisma/schema.prisma
   npm run db:seed     # fuentes daily/savings, metas por defecto, categorías
   ```

3. **Usuario** — no hay registro público. Créalo a mano en Supabase → Authentication → Users → *Add user* (con email y contraseña, confirmado).

4. **Arrancar**

   ```bash
   npm run dev
   ```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build de producción y arranque |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:push` | Sincroniza el schema con la base sin migración |
| `npm run db:migrate` | Crea y aplica una migración |
| `npm run db:seed` | Datos base idempotentes |
| `npm run db:studio` | Prisma Studio |

## Deploy en Vercel

Un solo proyecto. Carga las mismas variables de entorno en el dashboard de Vercel. El cron de recordatorios está declarado en [`vercel.json`](vercel.json) y corre cada 10 minutos contra `/api/cron/reminders`; Vercel manda el header `Authorization: Bearer $CRON_SECRET`.

## Estructura

```
app/
  (app)/         páginas con shell (sidebar + bottom nav): /, /finance, /nutrition, …
  (auth)/login/  login sin shell
  api/           API routes por módulo
components/
  ui/            primitivos shadcn re-tematizados a la paleta del spec
  layout/        Sidebar, BottomNav, Header, AppShell, PageHeader
  modules/       componentes de cada módulo
lib/             db, auth, http, api (cliente), utils
prisma/          schema.prisma y seed.ts
```

## Fase 2

Un agente de Telegram encima de esta misma API. No se construye aquí; el punto de extensión está marcado en `/api/cron/reminders`.
