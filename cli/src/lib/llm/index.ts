// src/lib/llm/index.ts — escolha do provedor de LLM
import { AnthropicProvider } from './anthropic.ts';
import { ManualProvider } from './manual.ts';
import type { LlmProvider } from './types.ts';

export * from './types.ts';
export { AnthropicProvider, ManualProvider };
export { RecordedProvider } from './recorded.ts';

export interface EscolherProvedorOpts {
  /** diretório do caso (para o provedor manual) */
  dir: string;
  /** nome-base do pedido/resposta manual, ex.: rodadas/rodada-01 */
  baseName: string;
  env?: NodeJS.ProcessEnv;
}

/** IDD_LLM=anthropic|manual; padrão: anthropic se houver chave/token, senão manual. */
export function escolherProvedor(opts: EscolherProvedorOpts): LlmProvider {
  const env = opts.env ?? process.env;
  const escolha = env.IDD_LLM?.toLowerCase();
  if (escolha && escolha !== 'anthropic' && escolha !== 'manual') {
    throw new Error(`IDD_LLM inválido: "${env.IDD_LLM}". Use anthropic ou manual.`);
  }
  const usaApi = escolha ? escolha === 'anthropic' : Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN);
  return usaApi ? new AnthropicProvider() : new ManualProvider(opts.dir, opts.baseName);
}
