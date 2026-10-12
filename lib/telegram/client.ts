import crypto from "node:crypto";

/**
 * Cliente mínimo de la Bot API sobre `fetch` (sin dependencias).
 * Si no hay `TELEGRAM_BOT_TOKEN`, `isTelegramConfigured()` da false y el resto
 * de la app (p. ej. el cron de recordatorios) funciona igual sin Telegram.
 */

const API = "https://api.telegram.org";
/** Límite de la Bot API por mensaje. */
const MAX_MESSAGE_LENGTH = 4096;

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

async function call<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN no está configurado");

  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as {
    ok: boolean;
    result?: T;
    description?: string;
  } | null;
  if (!res.ok || !json?.ok) {
    throw new Error(`Telegram ${method} falló: ${json?.description ?? res.status}`);
  }
  return json.result as T;
}

/** Parte un texto largo en trozos que entren en un mensaje de Telegram. */
export function splitMessage(text: string, max = MAX_MESSAGE_LENGTH): string[] {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > max) {
    // Corta en el último salto de línea para no partir frases a la mitad.
    const cut = rest.lastIndexOf("\n", max);
    const at = cut > max / 2 ? cut : max;
    chunks.push(rest.slice(0, at));
    rest = rest.slice(at).replace(/^\n/, "");
  }
  if (rest) chunks.push(rest);
  return chunks;
}

/** Envía texto plano (sin parse_mode: la salida del LLM puede traer caracteres que rompen Markdown). */
export async function sendMessage(chatId: number | string, text: string): Promise<void> {
  for (const chunk of splitMessage(text)) {
    await call("sendMessage", { chat_id: chatId, text: chunk });
  }
}

export async function sendChatAction(chatId: number | string, action = "typing"): Promise<void> {
  await call("sendChatAction", { chat_id: chatId, action });
}

/** Registra el webhook. `secretToken` llega luego en `X-Telegram-Bot-Api-Secret-Token`. */
export async function setWebhook(url: string, secretToken: string): Promise<void> {
  await call("setWebhook", { url, secret_token: secretToken, allowed_updates: ["message"] });
}

/** Comparación en tiempo constante del secreto que manda Telegram en cada update. */
export function isValidWebhookSecret(provided: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** App monousuario: solo se atiende al chat dueño. */
export function isAllowedChat(chatId: number): boolean {
  const allowed = process.env.TELEGRAM_CHAT_ID;
  return Boolean(allowed) && String(chatId) === allowed;
}
