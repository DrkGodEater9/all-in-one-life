# Fase 2 — Agente de Telegram

```
Telegram ──POST──▶ /api/telegram/webhook ──▶ runAgent() ──▶ LlmProvider
                     (secreto + chat dueño)      │  ▲
                                                 ▼  │ resultado
                                              TOOLS (lib/agent/tools.ts) ──▶ Prisma
Vercel Cron ──▶ /api/cron/reminders ──▶ sendMessage()  (avisos salientes)
```

| Pieza | Dónde | Estado |
|---|---|---|
| Cliente Bot API (`sendMessage`, `setWebhook`, validación de secreto/chat) | `lib/telegram/client.ts` | listo |
| Webhook entrante | `app/api/telegram/webhook/route.ts` | listo |
| Avisos de calendario por Telegram | `dispatchNotification` en `app/api/cron/reminders/route.ts` | listo (no-op sin token) |
| Loop del agente (modelo ↔ herramientas, tope de 5 vueltas) | `lib/agent/index.ts` | listo |
| Herramientas | `lib/agent/tools.ts` | 2 de lectura (tareas, eventos) |
| **Proveedor de LLM** | `lib/agent/llm.ts` | **pendiente** — sin él el bot responde "sin modelo configurado" |
| Memoria de conversación | — | pendiente (requiere tabla nueva) |
| Confirmación antes de herramientas que escriben (`mutates`) | `execute()` en `lib/agent/index.ts` | pendiente |

## Puesta en marcha

1. Crear el bot con @BotFather → `TELEGRAM_BOT_TOKEN`.
2. Tu chat id (p. ej. con @userinfobot) → `TELEGRAM_CHAT_ID`. Solo ese chat es atendido.
3. `TELEGRAM_WEBHOOK_SECRET`: string aleatorio.
4. Cargar las tres variables en `.env.local` y en Vercel.
5. Con la app desplegada: `npm run telegram:webhook` (necesita `NEXT_PUBLIC_APP_URL` https).

## Seguridad

- El webhook no usa sesión de Supabase; se autentica con el secreto del header y el chat permitido. Chats ajenos se ignoran sin responder.
- Las herramientas hablan con Prisma directo, así que su único control de acceso es el anterior: no relajarlo.
- Las herramientas con `mutates: true` deben pedir confirmación antes de ejecutarse (pendiente).

## Siguientes pasos sugeridos

1. Implementar `LlmProvider` en `lib/agent/llm.ts`.
2. Herramientas de escritura (crear tarea, registrar gasto/comida) con confirmación.
3. Historial de conversación en base de datos.
4. Resumen diario proactivo (otro cron).
