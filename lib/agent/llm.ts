import type { LlmProvider } from "./types";

/**
 * Devuelve el proveedor de LLM configurado.
 *
 * PENDIENTE: implementar un `LlmProvider` real (p. ej. con la API de Anthropic
 * vía `fetch` o el SDK) y devolverlo aquí cuando haya `AGENT_LLM_API_KEY` /
 * `AGENT_MODEL`. Hasta entonces el agente responde que no está listo.
 */
export function getLlmProvider(): LlmProvider | null {
  return null;
}
