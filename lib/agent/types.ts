import type { z } from "zod";

export interface ToolCall {
  id: string;
  name: string;
  args: unknown;
}

export interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  /** Solo en `assistant`: herramientas que pidió el modelo. */
  toolCalls?: ToolCall[];
  /** Solo en `tool`: a qué llamada responde. */
  toolCallId?: string;
}

/** Herramienta que el agente puede invocar. Cada una envuelve una operación de los módulos. */
export interface AgentTool<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  /** Se valida con esto antes de ejecutar: el LLM puede mandar argumentos inválidos. */
  schema: S;
  /** `true` si modifica datos. Reservado para pedir confirmación antes de ejecutar. */
  mutates: boolean;
  run(args: z.infer<S>): Promise<unknown>;
}

export interface LlmResponse {
  text?: string;
  toolCalls?: ToolCall[];
}

/**
 * Contrato con el proveedor de LLM. Implementar uno nuevo (Anthropic, OpenAI, …)
 * no toca el loop del agente ni las herramientas.
 */
export interface LlmProvider {
  complete(input: {
    system: string;
    messages: ChatMessage[];
    tools: AgentTool[];
  }): Promise<LlmResponse>;
}
