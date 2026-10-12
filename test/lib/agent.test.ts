// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { runAgent } from "@/lib/agent";
import type { LlmProvider } from "@/lib/agent/types";
import { splitMessage } from "@/lib/telegram/client";

vi.mock("@/lib/db", () => ({ prisma: { task: { findMany: vi.fn().mockResolvedValue([]) } } }));

describe("runAgent", () => {
  it("ejecuta la herramienta pedida y devuelve la respuesta final", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ toolCalls: [{ id: "1", name: "list_pending_tasks", args: {} }] })
      .mockResolvedValueOnce({ text: "No tienes tareas" });
    const reply = await runAgent("¿qué tengo pendiente?", { complete } as LlmProvider);

    expect(reply).toBe("No tienes tareas");
    const toolMsg = complete.mock.calls[1][0].messages.at(-1);
    expect(toolMsg).toMatchObject({ role: "tool", toolCallId: "1", content: "[]" });
  });

  it("corta tras el tope de vueltas", async () => {
    const complete = vi.fn().mockResolvedValue({ toolCalls: [{ id: "x", name: "nope", args: {} }] });
    await runAgent("hola", { complete } as LlmProvider);
    expect(complete).toHaveBeenCalledTimes(5);
  });
});

describe("splitMessage", () => {
  it("parte textos largos sin superar el máximo", () => {
    const chunks = splitMessage("a".repeat(25), 10);
    expect(chunks.every((c) => c.length <= 10)).toBe(true);
    expect(chunks.join("")).toBe("a".repeat(25));
  });
});
