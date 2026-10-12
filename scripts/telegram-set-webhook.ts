/**
 * Registra el webhook del bot apuntando a la app desplegada.
 *   npm run telegram:webhook
 * Lee TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET y NEXT_PUBLIC_APP_URL (debe ser https).
 */
import { setWebhook } from "../lib/telegram/client";

async function main() {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!base?.startsWith("https://")) throw new Error("NEXT_PUBLIC_APP_URL debe ser una URL https pública");
  if (!secret) throw new Error("Falta TELEGRAM_WEBHOOK_SECRET");

  const url = `${base.replace(/\/$/, "")}/api/telegram/webhook`;
  await setWebhook(url, secret);
  console.log(`Webhook registrado: ${url}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
