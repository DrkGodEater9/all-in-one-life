import { getLlmProvider } from "./llm";
import { findTool, TOOLS } from "./tools";
import type { ChatMessage, LlmProvider } from "./types";

/** Tope de vueltas modelo → herramienta → modelo, para cortar bucles. */
const MAX_STEPS = 5;

export const SYSTEM_PROMPT = [
  "Eres el asistente personal del dueño de Personal OS (finanzas, nutrición, gym, calendario, tareas, proyectos).",
  "Respondes por Telegram: mensajes cortos, en español, sin Markdown.",
  "Usa las herramientas para consultar datos reales; nunca inventes cifras ni fechas.",
  "Antes de ejecutar una herramienta que modifica datos, confirma con el usuario.",
].join("\n");

export const NOT_READY_REPLY = "El agente todavía no tiene un modelo de IA configurado.";

/**
 * Procesa un mensaje del usuario y devuelve el texto de respuesta.
 *
 * Sin memoria entre mensajes por ahora: cada mensaje es una conversación nueva.
 * Para conservar contexto hará falta una tabla (p. ej. `AgentMessage`) y pasar
 * aquí el historial reciente.
 */
export async function runAgent(
  userText: string,
  provider: LlmProvider | null = getLlmProvider()
): Promise<string> {
  if (!provider) return NOT_READY_REPLY;

  const messages: ChatMessage[] = [{ role: "user", content: userText }];

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await provider.complete({ system: SYSTEM_PROMPT, messages, tools: TOOLS });

    if (!res.toolCalls?.length) return res.text?.trim() || "No tengo una respuesta para eso.";

    messages.push({ role: "assistant", content: res.text ?? "", toolCalls: res.toolCalls });

    for (const call of res.toolCalls) {
      messages.push({
        role: "tool",
        toolCallId: call.id,
        content: JSON.stringify(await execute(call.name, call.args)),
      });
    }
  }

  return "No pude completar la consulta, intenta de nuevo con algo más concreto.";
}

/** Ejecuta una herramienta; los fallos vuelven al modelo como dato, no tumban el turno. */
async function execute(name: string, args: unknown): Promise<unknown> {
  const tool = findTool(name);
  if (!tool) return { error: `Herramienta desconocida: ${name}` };

  const parsed = tool.schema.safeParse(args);
  if (!parsed.success) return { error: "Argumentos inválidos", details: parsed.error.flatten() };

  // TODO: las `mutates` deben pasar por una confirmación explícita del usuario
  // antes de ejecutarse (estado pendiente por chat). Hoy no hay ninguna.
  try {
    return await tool.run(parsed.data);
  } catch (error) {
    console.error(`[agent] ${name} falló:`, error);
    return { error: "La herramienta falló" };
  }
}
