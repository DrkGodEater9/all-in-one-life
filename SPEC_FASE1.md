# Personal OS — Spec completo Fase 1

> Documento para Claude Code. Construir exactamente lo que está aquí, módulo por módulo, sin tomar decisiones de arquitectura por cuenta propia.

---

## Visión del producto

**Personal OS** — una web app personal para gestionar finanzas, salud, productividad y proyectos desde un solo lugar. Diseñada para uso propio, sin multiusuario, sin red social. La idea es reemplazar apps dispersas (Fitia, Hevy, Google Calendar, Notion, apps de finanzas) con una sola interfaz cohesiva que el usuario controla completamente.

**Fase 1** — la web app completa con UI para PC y mobile.  
**Fase 2** — un agente de Telegram encima, consumiendo la misma API (no se construye en esta fase).

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| API | Next.js API Routes (`app/api/`) |
| ORM | Prisma |
| Base de datos | Supabase (Postgres) |
| Auth | Supabase Auth |
| Estilos | Tailwind CSS + shadcn/ui |
| Cron jobs | Vercel Cron Jobs (recordatorios) |
| Deploy | Vercel (todo en un solo proyecto) |

---

## Estructura del proyecto

```
personal-os/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                      ← dashboard home
│   ├── api/
│   │   ├── auth/
│   │   ├── finance/
│   │   │   ├── balance/route.ts
│   │   │   ├── transactions/route.ts
│   │   │   ├── debts/route.ts
│   │   │   └── assets/route.ts
│   │   ├── nutrition/
│   │   │   ├── search/route.ts
│   │   │   ├── log/route.ts
│   │   │   ├── favorites/route.ts
│   │   │   ├── goals/route.ts
│   │   │   ├── weight/route.ts
│   │   │   └── water/route.ts
│   │   ├── gym/
│   │   │   ├── routines/route.ts
│   │   │   ├── workouts/route.ts
│   │   │   └── measurements/route.ts
│   │   ├── calendar/
│   │   │   ├── events/route.ts
│   │   │   └── reminders/route.ts
│   │   ├── tasks/
│   │   │   ├── route.ts
│   │   │   ├── matrix/route.ts
│   │   │   └── labels/route.ts
│   │   ├── projects/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── cron/
│   │       └── reminders/route.ts    ← Vercel Cron Job
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── finance/page.tsx
│   ├── nutrition/page.tsx
│   ├── gym/page.tsx
│   ├── calendar/page.tsx
│   ├── tasks/page.tsx
│   ├── projects/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── settings/page.tsx
├── components/
│   ├── ui/                           ← shadcn components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── BottomNav.tsx
│   │   └── Header.tsx
│   └── modules/
│       ├── finance/
│       ├── nutrition/
│       ├── gym/
│       ├── calendar/
│       ├── tasks/
│       └── projects/
├── lib/
│   ├── db.ts                         ← cliente Prisma singleton
│   ├── auth.ts                       ← helpers de Supabase Auth
│   ├── api.ts                        ← fetch helpers del frontend
│   └── utils.ts
├── prisma/
│   └── schema.prisma                 ← todos los modelos
├── vercel.json                       ← configuración de cron jobs
└── .env.local
```

---

## Variables de entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Prisma
DATABASE_URL=                         ← connection string de Supabase
DIRECT_URL=                           ← direct connection para migraciones

# App
NEXTAUTH_SECRET=
NEXT_PUBLIC_APP_URL=
```

---

## Diseño — Sistema visual

### Identidad
El producto es una herramienta personal de alto uso diario. El diseño debe sentirse como un instrumento preciso — no una app de bienestar con gradientes pastel, no un dashboard corporativo con azules genéricos. Referencia estética: la claridad de Linear, la densidad de información de Superhuman, la personalidad de Raycast.

### Paleta
```css
--color-bg:          #0F0F11;   /* casi negro con tinte azul muy sutil */
--color-surface:     #17171A;   /* cards y paneles */
--color-surface-2:   #1F1F24;   /* hover states, inputs */
--color-border:      #2A2A30;   /* bordes sutiles */
--color-accent:      #7C6AF7;   /* violeta — acción principal */
--color-accent-soft: #7C6AF720; /* accent 12% opacidad — tag backgrounds */
--color-text:        #E8E8ED;   /* texto principal */
--color-text-2:      #8E8E9A;   /* texto secundario */
--color-text-3:      #4A4A56;   /* placeholder / deshabilitado */

/* Semáforo proyectos */
--color-green:       #4ADE80;
--color-yellow:      #FACC15;
--color-red:         #F87171;

/* Estados */
--color-success:     #4ADE80;
--color-warning:     #FACC15;
--color-danger:      #F87171;
```

### Tipografía
- **Display / headings:** `Instrument Serif` — serif de personalidad, para títulos grandes y números destacados
- **UI / body / labels:** `Inter` — neutro, legible, estándar para interfaces
- **Datos / monoespaciado:** `JetBrains Mono` — solo para cifras financieras, calorías, pesos del gym

Importar desde Google Fonts en `layout.tsx`.

### Principios de diseño
1. **Densidad informativa** — mostrar mucho sin sentirse apretado. Padding generoso pero contenido real en cada pantalla
2. **Un acento, usado con disciplina** — el violeta `#7C6AF7` solo para acciones primarias y elementos activos. No decorativo
3. **Sin sombras decorativas** — bordes `1px solid var(--color-border)` en lugar de box-shadow para separar elementos
4. **Números con personalidad** — cifras financieras y métricas en `Instrument Serif` grande, label en `Inter` pequeño debajo
5. **Motion solo funcional** — transiciones de 150ms para feedback de interacción. Nada de animaciones de entrada por sección
6. **Sidebar fija en desktop, bottom nav en mobile**

### Layout base
```
Desktop:
┌──────────────────────────────────────────────┐
│  sidebar (240px fija)  │  content area        │
│                        │                      │
│  logo                  │  header de módulo    │
│  nav items             │  contenido           │
│  user / config         │                      │
└──────────────────────────────────────────────┘

Mobile:
┌─────────────────┐
│  header         │
│  contenido      │
│  bottom nav     │
└─────────────────┘
```

### Sidebar — navegación
```
🏠  Home
💰  Finanzas
🥗  Nutrición
🏋️  Gym
📅  Calendario
✅  Tareas
💡  Proyectos
─────────────
⚙️  Configuración
```

---

## Schema de Prisma — modelo de datos completo

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─────────────────────────────────────────
// SHARED
// ─────────────────────────────────────────

model RecurrenceRule {
  id           Int       @id @default(autoincrement())
  frequency    String    // 'daily' | 'weekly' | 'monthly'
  intervalN    Int       @default(1)
  dayOfMonth   Int?      // para monthly en día específico
  endsOn       DateTime?
  createdAt    DateTime  @default(now())

  events       CalendarEvent[]
  tasks        Task[]
}

// ─────────────────────────────────────────
// FINANZAS
// ─────────────────────────────────────────

model FinanceSource {
  id           Int       @id @default(autoincrement())
  name         String    // 'daily' | 'savings'
  balance      Decimal   @default(0) @db.Decimal(12, 2)
  createdAt    DateTime  @default(now())

  transactions FinanceTransaction[]
  debts        FinanceDebt[]
}

model FinanceTransaction {
  id        Int       @id @default(autoincrement())
  type      String    // 'expense' | 'income'
  amount    Decimal   @db.Decimal(12, 2)
  category  String
  sourceId  Int
  date      DateTime  @default(now()) @db.Date
  notes     String?
  createdAt DateTime  @default(now())

  source    FinanceSource @relation(fields: [sourceId], references: [id])
}

model FinanceDebt {
  id          Int       @id @default(autoincrement())
  direction   String    // 'i_owe' | 'they_owe_me'
  person      String
  reason      String
  amount      Decimal   @db.Decimal(12, 2)
  amountPaid  Decimal   @default(0) @db.Decimal(12, 2)
  sourceId    Int
  date        DateTime  @default(now()) @db.Date
  isSettled   Boolean   @default(false)
  createdAt   DateTime  @default(now())

  source      FinanceSource    @relation(fields: [sourceId], references: [id])
  payments    FinanceDebtPayment[]
}

model FinanceDebtPayment {
  id        Int      @id @default(autoincrement())
  debtId    Int
  amount    Decimal  @db.Decimal(12, 2)
  date      DateTime @default(now()) @db.Date
  createdAt DateTime @default(now())

  debt      FinanceDebt @relation(fields: [debtId], references: [id])
}

model FinanceAsset {
  id         Int      @id @default(autoincrement())
  title      String
  quantity   Decimal  @db.Decimal(12, 4)
  unit       String?
  priceEach  Decimal? @db.Decimal(12, 2)
  notes      String?
  createdAt  DateTime @default(now())
}

// ─────────────────────────────────────────
// NUTRICIÓN
// ─────────────────────────────────────────

model NutritionFoodCache {
  id          Int      @id @default(autoincrement())
  offId       String?  @unique
  name        String
  kcal100g    Decimal? @db.Decimal(8, 2)
  protein100g Decimal? @db.Decimal(8, 2)
  carbs100g   Decimal? @db.Decimal(8, 2)
  fat100g     Decimal? @db.Decimal(8, 2)
  cachedAt    DateTime @default(now())

  mealItems   NutritionMealItem[]
}

model NutritionFavorite {
  id           Int      @id @default(autoincrement())
  name         String
  kcal100g     Decimal  @db.Decimal(8, 2)
  protein100g  Decimal  @db.Decimal(8, 2)
  carbs100g    Decimal  @db.Decimal(8, 2)
  fat100g      Decimal  @db.Decimal(8, 2)
  defaultUnit  String   @default("g") // 'g' | 'ml' | 'unit'
  kcalPerUnit  Decimal? @db.Decimal(8, 2)
  createdAt    DateTime @default(now())

  mealItems    NutritionMealItem[]
}

model NutritionMealLog {
  id        Int      @id @default(autoincrement())
  date      DateTime @db.Date
  mealType  String   // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  createdAt DateTime @default(now())

  items     NutritionMealItem[]
}

model NutritionMealItem {
  id          Int      @id @default(autoincrement())
  mealLogId   Int
  foodName    String
  foodCacheId Int?
  favoriteId  Int?
  amountG     Decimal  @db.Decimal(8, 2)
  state       String   @default("unknown") // 'raw' | 'cooked' | 'unknown'
  kcal        Decimal  @db.Decimal(8, 2)
  proteinG    Decimal  @db.Decimal(8, 2)
  carbsG      Decimal  @db.Decimal(8, 2)
  fatG        Decimal  @db.Decimal(8, 2)
  isEstimated Boolean  @default(false)
  createdAt   DateTime @default(now())

  mealLog     NutritionMealLog   @relation(fields: [mealLogId], references: [id])
  foodCache   NutritionFoodCache? @relation(fields: [foodCacheId], references: [id])
  favorite    NutritionFavorite?  @relation(fields: [favoriteId], references: [id])
}

model NutritionGoal {
  id        Int      @id @default(autoincrement())
  kcal      Int
  proteinG  Int
  carbsG    Int
  fatG      Int
  updatedAt DateTime @default(now())
}

model NutritionWeightLog {
  id        Int      @id @default(autoincrement())
  weightKg  Decimal  @db.Decimal(5, 2)
  date      DateTime @db.Date
  notes     String?
  createdAt DateTime @default(now())
}

model NutritionWaterLog {
  id        Int      @id @default(autoincrement())
  date      DateTime @db.Date
  amountMl  Int      @default(250)
  createdAt DateTime @default(now())
}

// ─────────────────────────────────────────
// GYM
// ─────────────────────────────────────────

model GymRoutine {
  id        Int      @id @default(autoincrement())
  name      String
  createdAt DateTime @default(now())

  exercises GymRoutineExercise[]
  workouts  GymWorkout[]
}

model GymRoutineExercise {
  id         Int      @id @default(autoincrement())
  routineId  Int
  name       String
  type       String   // 'weight' | 'bodyweight' | 'cardio'
  orderIndex Int      @default(0)
  createdAt  DateTime @default(now())

  routine    GymRoutine @relation(fields: [routineId], references: [id])
}

model GymWorkout {
  id         Int       @id @default(autoincrement())
  routineId  Int
  date       DateTime  @db.Date
  notes      String?
  finishedAt DateTime?
  createdAt  DateTime  @default(now())

  routine    GymRoutine      @relation(fields: [routineId], references: [id])
  sets       GymWorkoutSet[]
}

model GymWorkoutSet {
  id            Int      @id @default(autoincrement())
  workoutId     Int
  exerciseName  String
  exerciseType  String
  setNumber     Int
  reps          Int?
  weightKg      Decimal? @db.Decimal(6, 2)
  durationSecs  Int?
  distanceKm    Decimal? @db.Decimal(6, 3)
  notes         String?
  createdAt     DateTime @default(now())

  workout       GymWorkout @relation(fields: [workoutId], references: [id])
}

model GymMeasurement {
  id        Int      @id @default(autoincrement())
  date      DateTime @db.Date
  chestCm   Decimal? @db.Decimal(5, 2)
  waistCm   Decimal? @db.Decimal(5, 2)
  hipsCm    Decimal? @db.Decimal(5, 2)
  armsCm    Decimal? @db.Decimal(5, 2)
  thighsCm  Decimal? @db.Decimal(5, 2)
  notes     String?
  createdAt DateTime @default(now())
}

// ─────────────────────────────────────────
// CALENDARIO
// ─────────────────────────────────────────

model CalendarEvent {
  id             Int       @id @default(autoincrement())
  title          String
  date           DateTime  @db.Date
  time           DateTime  @db.Time
  category       String    // 'medical' | 'work' | 'personal' | 'study'
  location       String?
  meetingLink    String?
  notes          String?
  recurrenceId   Int?
  source         String    @default("manual") // 'manual' | 'task'
  sourceTaskId   Int?
  createdAt      DateTime  @default(now())

  recurrence     RecurrenceRule? @relation(fields: [recurrenceId], references: [id])
  reminders      CalendarReminder[]
}

model CalendarReminder {
  id          Int      @id @default(autoincrement())
  eventId     Int
  remindType  String   // 'same_day' | 'day_before' | 'custom'
  remindTime  DateTime @db.Time
  daysBefore  Int      @default(0)
  isSent      Boolean  @default(false)
  createdAt   DateTime @default(now())

  event       CalendarEvent @relation(fields: [eventId], references: [id])
}

// ─────────────────────────────────────────
// TAREAS
// ─────────────────────────────────────────

model TaskLabel {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  color     String?
  createdAt DateTime @default(now())

  tasks     TaskLabelAssignment[]
}

model Task {
  id              Int       @id @default(autoincrement())
  title           String
  description     String?
  urgent          Boolean   @default(false)
  important       Boolean   @default(false)
  status          String    @default("pending") // 'pending' | 'in_progress' | 'done'
  date            DateTime? @db.Date
  time            DateTime? @db.Time
  recurrenceId    Int?
  calendarEventId Int?
  doneAt          DateTime?
  createdAt       DateTime  @default(now())

  recurrence      RecurrenceRule? @relation(fields: [recurrenceId], references: [id])
  labels          TaskLabelAssignment[]
}

model TaskLabelAssignment {
  taskId   Int
  labelId  Int

  task     Task      @relation(fields: [taskId], references: [id])
  label    TaskLabel @relation(fields: [labelId], references: [id])

  @@id([taskId, labelId])
}

// ─────────────────────────────────────────
// PROYECTOS
// ─────────────────────────────────────────

model ProjectCategory {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  createdAt DateTime  @default(now())

  projects  Project[]
}

model Project {
  id          Int       @id @default(autoincrement())
  title       String
  description String?
  status      String    @default("idea")
  // 'idea' | 'en_progreso' | 'pausado' | 'descartado' | 'completado'
  viability   String?
  // null en fase 1 — 'muy_viable' | 'viable' | 'poco_viable' en fase 2
  categoryId  Int?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  category    ProjectCategory?     @relation(fields: [categoryId], references: [id])
  tags        ProjectTagAssignment[]
  notes       ProjectNote[]
  links       ProjectLink[]
}

model ProjectTag {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  createdAt DateTime @default(now())

  projects  ProjectTagAssignment[]
}

model ProjectTagAssignment {
  projectId Int
  tagId     Int

  project   Project    @relation(fields: [projectId], references: [id])
  tag       ProjectTag @relation(fields: [tagId], references: [id])

  @@id([projectId, tagId])
}

model ProjectNote {
  id        Int      @id @default(autoincrement())
  projectId Int
  content   String
  createdAt DateTime @default(now())

  project   Project @relation(fields: [projectId], references: [id])
}

model ProjectLink {
  id        Int      @id @default(autoincrement())
  projectId Int
  title     String?
  url       String
  createdAt DateTime @default(now())

  project   Project @relation(fields: [projectId], references: [id])
}
```

---

## API Routes — endpoints por módulo

### Auth
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

### Finanzas
```
GET    /api/finance/balance
GET    /api/finance/transactions          ?type=&category=&sourceId=&from=&to=
POST   /api/finance/transactions
DELETE /api/finance/transactions/[id]
GET    /api/finance/debts                 ?direction=&isSettled=
POST   /api/finance/debts
POST   /api/finance/debts/[id]/pay
GET    /api/finance/debts/[id]/payments
GET    /api/finance/assets
POST   /api/finance/assets
PUT    /api/finance/assets/[id]
DELETE /api/finance/assets/[id]
GET    /api/finance/summary/monthly
GET    /api/finance/export/csv
```

### Nutrición
```
GET    /api/nutrition/search              ?q=
GET    /api/nutrition/favorites
POST   /api/nutrition/favorites
DELETE /api/nutrition/favorites/[id]
GET    /api/nutrition/log                 ?date=
POST   /api/nutrition/log/meal
POST   /api/nutrition/log/meal/[id]/item
DELETE /api/nutrition/log/item/[id]
GET    /api/nutrition/summary             ?date=
GET    /api/nutrition/history             ?days=
GET    /api/nutrition/goals
PUT    /api/nutrition/goals
GET    /api/nutrition/weight
POST   /api/nutrition/weight
GET    /api/nutrition/water               ?date=
POST   /api/nutrition/water
GET    /api/nutrition/streak
```

### Gym
```
GET    /api/gym/routines
POST   /api/gym/routines
PUT    /api/gym/routines/[id]
DELETE /api/gym/routines/[id]
GET    /api/gym/workouts
POST   /api/gym/workouts
POST   /api/gym/workouts/[id]/sets
DELETE /api/gym/workouts/[id]/sets/[setId]
PUT    /api/gym/workouts/[id]/finish
GET    /api/gym/history/[routineId]
GET    /api/gym/exercise/[name]/history
GET    /api/gym/exercise/[name]/record
GET    /api/gym/measurements
POST   /api/gym/measurements
GET    /api/gym/streak
```

### Calendario
```
GET    /api/calendar/events               ?from=&to=&category=
POST   /api/calendar/events
PUT    /api/calendar/events/[id]
DELETE /api/calendar/events/[id]          ?deleteRecurrence=this|future|all
POST   /api/calendar/events/[id]/reminders
DELETE /api/calendar/reminders/[id]
GET    /api/calendar/day/[date]
```

### Tareas
```
GET    /api/tasks                         ?status=&urgent=&important=&label=
POST   /api/tasks
PUT    /api/tasks/[id]
PATCH  /api/tasks/[id]/status
DELETE /api/tasks/[id]
GET    /api/tasks/matrix
GET    /api/tasks/labels
POST   /api/tasks/labels
DELETE /api/tasks/labels/[id]
```

### Proyectos
```
GET    /api/projects                      ?status=&category=&tag=
POST   /api/projects
GET    /api/projects/[id]
PUT    /api/projects/[id]
DELETE /api/projects/[id]
POST   /api/projects/[id]/notes
DELETE /api/projects/[id]/notes/[noteId]
POST   /api/projects/[id]/links
DELETE /api/projects/[id]/links/[linkId]
GET    /api/projects/tags
POST   /api/projects/tags
```

### Cron Jobs
```
GET    /api/cron/reminders                ← Vercel Cron, corre cada 10 min
```

---

## Vercel Cron Jobs

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

El endpoint `/api/cron/reminders`:
1. Busca recordatorios con `isSent: false` y `remindTime <= now`
2. Por cada uno, prepara el mensaje (título del evento, hora, lugar, link si tiene)
3. En fase 2 manda el mensaje por `notify_bot` de Telegram
4. En fase 1 solo marca `isSent: true` (los avisos se verán dentro de la app)
5. Proteger el endpoint con un header `Authorization: Bearer CRON_SECRET`

---

## UI — Módulo 0: Dashboard Home

Widgets en grid 2 columnas desktop, 1 mobile:

1. **Saldo** — daily y savings en Instrument Serif grande lado a lado
2. **Calorías** — kcal consumidas / meta, barra de progreso de macros
3. **Próximos eventos** — los 3 próximos con hora y categoría (badge de color)
4. **Tareas urgentes** — cuadrante "Hacer ya" con tareas pendientes
5. **Último entreno** — fecha, rutina y volumen total
6. **Proyectos** — conteo por semáforo: verde / amarillo / rojo

Cada widget es clickable y navega al módulo.

---

## UI — Módulo 1: Finanzas `/finance`

- Header: saldo daily y savings en Instrument Serif grande, total combinado debajo en text-2
- Tabs: Transacciones | Deudas | Activos
- Botón "+" flotante contextual según tab activo

**Tab Transacciones**
- Filtros inline: tipo (gasto/ingreso toggle), categoría (select), fuente (toggle), rango fechas
- Lista cronológica: amount en JetBrains Mono, categoría badge, fuente chip, fecha, notas
- Gráfica de dona: gastos por categoría del mes
- Gráfica de línea: evolución de saldo daily y savings en el tiempo

**Tab Deudas**
- Dos secciones colapsables: "Me deben" y "Debo"
- Cada deuda: persona, razón, barra de progreso (pagado / total), monto pendiente
- Click → modal con historial de pagos y botón registrar pago

**Tab Activos**
- Lista: título, cantidad, unidad, precio estimado si tiene
- Total estimado al pie si todos tienen precio

**Modal agregar transacción**
- Toggle gasto / ingreso
- Monto (JetBrains Mono input)
- Categorías predefinidas: alimentación, transporte, salud, entretenimiento, suscripciones, ropa, educación, otro
- Toggle fuente: daily / savings
- Fecha (default hoy)
- Notas (opcional)

**Modal agregar deuda**
- Toggle dirección: yo debo / me deben
- Persona, razón, monto, fuente, fecha

---

## UI — Módulo 2: Nutrición `/nutrition`

- Header: kcal consumidas / meta grande, 3 barras de macros (proteína verde, carbs amarillo, grasa azul)
- Racha de días registrando (ej: "🔥 5 días seguidos")
- Tabs: Hoy | Peso | Agua

**Tab Hoy**
- Secciones: Desayuno / Almuerzo / Cena / Snacks
- Cada sección lista sus items con nombre, gramos, kcal
- Botón "+" por sección abre buscador de alimentos

**Buscador de alimentos**
- Input con debounce (300ms) → llama a `/api/nutrition/search`
- Resultados: nombre, kcal/100g
- Al seleccionar: input de gramos, toggle crudo/cocido
- Tab "Mis favoritos" con lista guardada para acceso rápido

**Tab Peso**
- Input para registrar peso de hoy
- Gráfica de línea con evolución

**Tab Agua**
- Indicador circular: ml consumidos / objetivo (2000ml default)
- Botones rápidos: +250ml, +500ml, +1L

---

## UI — Módulo 3: Gym `/gym`

- Tabs: Rutinas | Entrenos | Progreso | Medidas

**Tab Rutinas**
- Lista de rutinas con nombre y cantidad de ejercicios
- Click → detalle con lista de ejercicios y tipos
- Botón "Iniciar entreno" por rutina
- Botón "+" para nueva rutina con modal (nombre + agregar ejercicios con tipo)

**Vista entreno activo `/gym/workout/[id]`**
- Header: nombre rutina + cronómetro
- Ejercicios en orden con sus series
- Por ejercicio: tabla de series (set, kg, reps) + botón "+ Serie"
- Para cardio: duración y distancia
- Botón "Terminar entreno" sticky al fondo

**Tab Progreso**
- Selector de ejercicio
- Gráfica de línea: peso máximo por sesión
- Records personales: mejor peso, mejor volumen total
- Racha del mes: días entrenados / días del mes

**Tab Medidas**
- Formulario: pecho, cintura, cadera, brazos, muslos
- Gráfica de evolución por medida seleccionada

---

## UI — Módulo 4: Calendario `/calendar`

- Tabs: Mes | Semana | Día
- Botón "+" para crear evento

**Vista Mes**
- Grid de días del mes
- Puntos de colores por categoría en días con eventos
- Click en día → va a vista Día

**Vista Semana**
- 7 columnas, items listados por día con hora y título

**Vista Día**
- Lista detallada: hora, badge de categoría, título, lugar, link si tiene
- Items de tareas con fecha aparecen aquí también (badge diferente)

**Modal crear evento**
- Título, fecha, hora
- Categoría con íconos: 🏥 Médico | 💼 Trabajo | 👤 Personal | 📚 Estudio
- Lugar (opcional)
- Link de reunión (opcional)
- Notas (opcional)
- Toggle recurrencia → frecuencia, intervalo, fecha fin
- Recordatorios: botones rápidos "Mismo día 7am" / "Día anterior 9am" + personalizado

---

## UI — Módulo 5: Tareas `/tasks`

- Tabs: Matriz | Lista

**Tab Matriz**
- Pantalla dividida en 4 cuadrantes por una cruz centrada
- Títulos de cuadrante:
  - Top-left: "Hacer ya" — borde accent rojo sutil
  - Top-right: "Agendar" — borde accent azul sutil
  - Bottom-left: "Delegar" — borde accent amarillo sutil
  - Bottom-right: "Eliminar" — borde accent gris sutil
- Tasks como cards draggables con `@dnd-kit/core`
- Al soltar en cuadrante: PATCH automático de `urgent` e `important`
- Solo aparecen tareas `pending` e `in_progress`
- Botón "+" en cada cuadrante para crear tarea directamente ahí

**Tab Lista**
- Tabla o lista con todas las tareas
- Filtros: estado, etiqueta, cuadrante, fecha, búsqueda por texto
- Agrupar por: cuadrante | etiqueta | fecha

**Modal tarea**
- Título, descripción
- Selector de cuadrante visual (4 opciones con íconos)
- Etiquetas (chips seleccionables + crear nueva)
- Estado: Pendiente → En progreso → Hecho (stepper)
- Fecha opcional → si se agrega, aparece campo de hora
- Toggle recurrencia

---

## UI — Módulo 6: Proyectos `/projects`

- Tabs: Lista | Kanban
- Botón "+" para nuevo proyecto

**Tab Lista**
- Cards con título, descripción corta, badge de status, categoría, tags, fecha
- Filtros: status, categoría, tag, búsqueda

**Tab Kanban**
- Columnas: Idea | En progreso | Pausado | Descartado | Completado
- Cards draggables entre columnas con `@dnd-kit/core`
- Al mover: PATCH de status automático

**Vista detalle `/projects/[id]`**
- Header: título editable inline, badge de status, semáforo si tiene viabilidad (oculto si es null)
- Categoría y tags editables
- Descripción editable inline (textarea que se expande)
- Sección "Notas" — entradas cronológicas con fecha, input para agregar
- Sección "Links" — lista con título y URL, botón agregar

---

## Features transversales

### Auth
- Supabase Auth con email + password
- No hay registro público — el usuario se crea directamente desde el dashboard de Supabase
- Middleware de Next.js que protege todas las rutas excepto `/login`
- En cada API route: validar el JWT de Supabase con `supabase.auth.getUser()`

### PWA
```json
// app/manifest.json
{
  "name": "Personal OS",
  "short_name": "Personal OS",
  "theme_color": "#0F0F11",
  "background_color": "#0F0F11",
  "display": "standalone",
  "icons": [...]
}
```
- Service worker con cache básico para assets estáticos
- Instalable desde Chrome y Safari en mobile

### Modo oscuro / claro
- Oscuro por defecto
- Toggle en sidebar guarda en localStorage
- Variables CSS en `:root` y `:root.light`
- Usar `next-themes` para manejar el cambio

### Configuración `/settings`
- Metas nutricionales (kcal, proteína, carbs, grasa)
- Zona horaria
- Objetivo de agua diario (default 2000ml)
- Toggle tema oscuro/claro

---

## Librerías a instalar

```bash
# Core
npx create-next-app@latest personal-os --typescript --tailwind --app

# UI
npx shadcn-ui@latest init
npm install next-themes

# DB
npm install prisma @prisma/client
npm install @supabase/supabase-js @supabase/ssr

# Drag and drop (matriz tareas + kanban proyectos)
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Gráficas
npm install recharts

# Formularios
npm install react-hook-form zod @hookform/resolvers

# Fechas
npm install date-fns

# Tipografías (en layout.tsx desde next/font/google)
# Instrument_Serif, Inter, JetBrains_Mono
```

---

## Instrucciones para Claude Code

1. Leer este documento completo antes de escribir una sola línea
2. Usar exactamente el stack especificado — no sustituir librerías
3. Orden de construcción:
   - Estructura base del proyecto + instalación de dependencias
   - Schema de Prisma + migración inicial
   - Auth con Supabase + middleware + página de login
   - Layout base: sidebar, bottom nav, header
   - Dashboard home (widgets en skeleton hasta que existan los módulos)
   - Módulo Finanzas completo (API routes + UI)
   - Módulo Nutrición completo
   - Módulo Gym completo
   - Módulo Calendario completo
   - Módulo Tareas completo
   - Módulo Proyectos completo
   - Dashboard home con datos reales
   - PWA + modo oscuro/claro
   - Configuración
4. El sistema de colores del spec reemplaza los colores por defecto de shadcn — aplicar las variables CSS globales desde el inicio
5. Todos los componentes son responsivos — mobile first
6. Validación con Zod en todas las API routes
7. Nunca hardcodear credenciales — siempre variables de entorno
8. El diseño NO debe verse genérico ni como template — seguir el sistema visual definido arriba al pie de la letra
