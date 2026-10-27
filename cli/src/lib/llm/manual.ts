// src/lib/llm/manual.ts — provedor "manual": o humano cola o pedido em qualquer assistente de IA
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AguardandoRespostaManual, type LlmJsonRequest, type LlmProvider } from './types.ts';

/** Aceita JSON puro ou envolvido em cerca ```json ... ```. */
export function extrairJson(texto: string): unknown {
  const t = texto.trim();
  const cerca = t.match(/^```[a-zA-Z]*\s*\n([\s\S]*?)\n?```\s*$/);
  return JSON.parse(cerca ? cerca[1] : t);
}

export class ManualProvider implements LlmProvider {
  readonly name = 'manual';

  /** baseName: caminho sem extensão, relativo a dir (ex.: rodadas/rodada-01) */
  constructor(private readonly dir: string, private readonly baseName: string) {}

  get pedidoPath(): string { return path.join(this.dir, `${this.baseName}.pedido.md`); }
  get respostaPath(): string { return path.join(this.dir, `${this.baseName}.resposta.json`); }

  async completeJson(req: LlmJsonRequest): Promise<unknown> {
    if (fs.existsSync(this.respostaPath)) {
      try {
        return extrairJson(fs.readFileSync(this.respostaPath, 'utf8'));
      } catch (e) {
        throw new Error(`Resposta inválida em ${this.respostaPath}: não é JSON (${e instanceof Error ? e.message : e}).`);
      }
    }
    fs.mkdirSync(path.dirname(this.pedidoPath), { recursive: true });
    fs.writeFileSync(this.pedidoPath, renderPedido(req, this.respostaPath), 'utf8');
    throw new AguardandoRespostaManual(this.pedidoPath, this.respostaPath);
  }
}

function renderPedido(req: LlmJsonRequest, respostaPath: string): string {
  return `# Pedido manual — ${req.schemaName}

> Cole este texto (inteiro) em qualquer assistente de IA (Claude, ChatGPT, Gemini...).
> Salve a resposta, que deve ser **somente JSON**, em:
> \`${respostaPath}\`
> Depois rode o comando novamente.

## Instruções do sistema

${req.system}

## Pedido

${req.user}

## JSON Schema esperado da resposta

\`\`\`json
${JSON.stringify(req.schema, null, 2)}
\`\`\`

Responda apenas com um objeto JSON que obedeça ao schema acima, sem texto adicional.
`;
}
