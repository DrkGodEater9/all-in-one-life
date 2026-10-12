import { withRoute } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/http";
import { runAgent } from "@/lib/agent";
import {
  isAllowedChat,
  isValidWebhookSecret,
  sendChatAction,
  sendMessage,
} from "@/lib/telegram/client";
import type { TelegramUpdate } from "@/lib/telegram/types";

export const maxDuration = 60;

/**
 * POST /api/telegram/webhook — Telegram entrega aquí cada mensaje al bot.
 *
 * Sin sesión de Supabase: se autentica con el secreto del webhook
 * (`TELEGRAM_WEBHOOK_SECRET`, que Telegram devuelve en un header) y se atiende
 * solo al chat dueño (`TELEGRAM_CHAT_ID`). Cualquier otro chat se ignora en
 * silencio: responderle revelaría que el bot existe y es de esta app.
 *
 * Siempre responde 200 tras autenticar: si devolviera error, Telegram
 * reintentaría el mismo update una y otra vez.
 */
export const POST = withRoute(async ({ req }) => {
  if (!isValidWebhookSecret(req.headers.get("x-telegram-bot-api-secret-token"))) {
    throw unauthorized("No autorizado");
  }

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  const message = update?.message;
  if (!message?.text || !isAllowedChat(message.chat.id)) return ok({ ok: true });

  const chatId = message.chat.id;
  try {
    await sendChatAction(chatId).catch(() => undefined);
    await sendMessage(chatId, await runAgent(message.text));
  } catch (error) {
    console.error("[telegram] error procesando update:", error);
    await sendMessage(chatId, "Ocurrió un error procesando tu mensaje.").catch(() => undefined);
  }

  return ok({ ok: true });
});
