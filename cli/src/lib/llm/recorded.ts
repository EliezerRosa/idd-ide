// src/lib/llm/recorded.ts — provedor para testes: respostas pré-gravadas, em ordem
import type { LlmJsonRequest, LlmProvider } from './types.ts';

export class RecordedProvider implements LlmProvider {
  readonly name = 'recorded';
  readonly pedidos: LlmJsonRequest[] = [];
  private i = 0;

  constructor(private readonly respostas: unknown[]) {}

  async completeJson(req: LlmJsonRequest): Promise<unknown> {
    this.pedidos.push(req);
    if (this.i >= this.respostas.length) throw new Error('RecordedProvider: sem mais respostas gravadas.');
    return this.respostas[this.i++];
  }
}
