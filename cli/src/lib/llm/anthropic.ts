// src/lib/llm/anthropic.ts — provedor com o SDK oficial da Anthropic
import Anthropic from '@anthropic-ai/sdk';
import { LlmRefusalError, LlmTruncatedError, type LlmJsonRequest, type LlmProvider } from './types.ts';

export const MODELO_PADRAO = 'claude-opus-5-5';

/** Subconjunto do cliente usado aqui — permite injetar um cliente falso nos testes. */
export interface ClienteMensagens {
  beta: { messages: { create(params: any): Promise<any> } };
}

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private readonly client: ClienteMensagens;

  constructor(client?: ClienteMensagens) {
    // Lê ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN; timeout de 10 min, 2 retentativas (padrões do SDK)
    this.client = client ?? (new Anthropic({ timeout: 10 * 60 * 1000 }) as unknown as ClienteMensagens);
  }

  async completeJson(req: LlmJsonRequest): Promise<unknown> {
    const model = process.env.IDD_FASE0_MODEL ?? MODELO_PADRAO;
    const maxTokens = req.maxTokens ?? 16000;
    // Sem temperature/top_p/top_k nem thinking com budget: são rejeitados por esses modelos.
    const params = {
      model,
      max_tokens: maxTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: req.system,
      messages: [{ role: 'user', content: req.user }],
      output_config: { effort: req.effort ?? 'high', format: { type: 'json_schema', schema: req.schema } },
    };

    let resp: any;
    try {
      resp = await this.client.beta.messages.create(params);
    } catch (e) {
      throw traduzirErro(e);
    }

    if (resp.stop_reason === 'refusal') throw new LlmRefusalError(resp.stop_details?.category ?? null);
    if (resp.stop_reason === 'max_tokens') throw new LlmTruncatedError(maxTokens);
    const bloco = (resp.content ?? []).find((b: { type: string }) => b.type === 'text');
    if (!bloco) throw new Error('Resposta do modelo sem bloco de texto.');
    try {
      return JSON.parse(bloco.text);
    } catch {
      throw new Error('O modelo não devolveu JSON válido.');
    }
  }
}

function traduzirErro(e: unknown): Error {
  if (e instanceof Anthropic.AuthenticationError) return new Error('Autenticação recusada pela API: confira ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN.');
  if (e instanceof Anthropic.PermissionDeniedError) return new Error('Sem permissão para este modelo ou recurso na API da Anthropic.');
  if (e instanceof Anthropic.RateLimitError) return new Error('Limite de requisições da API atingido; tente novamente em instantes.');
  if (e instanceof Anthropic.BadRequestError) return new Error(`Pedido rejeitado pela API: ${e.message}`);
  if (e instanceof Anthropic.APIConnectionTimeoutError) return new Error('Tempo esgotado ao chamar a API da Anthropic.');
  if (e instanceof Anthropic.APIConnectionError) return new Error('Falha de conexão com a API da Anthropic.');
  return e instanceof Error ? e : new Error(String(e));
}
