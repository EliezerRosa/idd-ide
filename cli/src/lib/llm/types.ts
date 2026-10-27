// src/lib/llm/types.ts — camada de LLM única (Fase 0)

export type LlmEffort = 'low' | 'medium' | 'high' | 'xhigh';

export interface LlmJsonRequest {
  system: string;
  user: string;
  schemaName: string;
  /** JSON Schema da resposta esperada */
  schema: Record<string, unknown>;
  effort?: LlmEffort;
  maxTokens?: number;
}

export interface LlmProvider {
  readonly name: string;
  completeJson(req: LlmJsonRequest): Promise<unknown>;
}

/** O modelo recusou o pedido (classificadores de segurança). */
export class LlmRefusalError extends Error {
  constructor(public readonly category?: string | null) {
    super(`O modelo recusou o pedido${category ? ` (categoria: ${category})` : ''}.`);
    this.name = 'LlmRefusalError';
  }
}

/** A resposta foi cortada por max_tokens. */
export class LlmTruncatedError extends Error {
  constructor(public readonly maxTokens?: number) {
    super(`Resposta truncada por limite de tokens${maxTokens ? ` (max_tokens=${maxTokens})` : ''}. Aumente o limite ou reduza o contexto.`);
    this.name = 'LlmTruncatedError';
  }
}

/** Provedor manual: o pedido foi gravado e falta a resposta do humano. */
export class AguardandoRespostaManual extends Error {
  constructor(public readonly promptPath: string, public readonly respostaPath: string) {
    super(`Aguardando resposta manual: cole o conteúdo de ${promptPath} em um assistente de IA e salve a resposta JSON em ${respostaPath}.`);
    this.name = 'AguardandoRespostaManual';
  }
}
