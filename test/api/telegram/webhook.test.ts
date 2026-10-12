// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/telegram/webhook/route";
import { makeRequest, callRoute } from "../../helpers/route";

const sendMessage = vi.fn();
vi.mock("@/lib/telegram/client", async (orig) => ({
  ...(await orig<typeof import("@/lib/telegram/client")>()),
  sendMessage: (...a: unknown[]) => sendMessage(...a),
  sendChatAction: vi.fn().mockResolvedValue(undefined),
}));

const update = (chatId: number, text = "hola") => ({
  update_id: 1,
  message: { message_id: 1, date: 0, chat: { id: chatId, type: "private" }, text },
});
const post = (body: unknown, secret = "sec") =>
  callRoute(POST, makeRequest("/api/telegram/webhook", {
    method: "POST",
    body,
    headers: { "x-telegram-bot-api-secret-token": secret },
  }));

describe("POST /api/telegram/webhook", () => {
  beforeEach(() => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "sec";
    process.env.TELEGRAM_CHAT_ID = "42";
    sendMessage.mockReset();
  });
  afterEach(() => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  it("401 con secreto incorrecto", async () => {
    const { status } = await post(update(42), "mal");
    expect(status).toBe(401);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("ignora en silencio chats ajenos", async () => {
    const { status } = await post(update(99));
    expect(status).toBe(200);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("responde al chat dueño (sin LLM configurado, avisa que no está listo)", async () => {
    const { status } = await post(update(42));
    expect(status).toBe(200);
    expect(sendMessage).toHaveBeenCalledWith(42, expect.stringContaining("modelo de IA"));
  });
});
