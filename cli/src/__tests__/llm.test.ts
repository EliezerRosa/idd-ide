import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  AnthropicProvider, ManualProvider, RecordedProvider, escolherProvedor,
  LlmRefusalError, LlmTruncatedError, AguardandoRespostaManual, type LlmJsonRequest,
} from '../lib/llm/index.ts';

const req: LlmJsonRequest = {
  system: 'Sistema de teste', user: 'Pedido de teste', schemaName: 'teste',
  schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false },
};

function clienteFalso(resposta: unknown) {
  const chamadas: any[] = [];
  return { chamadas, client: { beta: { messages: { create: async (p: any) => { chamadas.push(p); return resposta; } } } } };
}

describe('AnthropicProvider', () => {
  afterEach(() => { delete process.env.IDD_FASE0_MODEL; });

  it('monta o pedido sem temperature e com betas/fallbacks/output_config', async () => {
    const { chamadas, client } = clienteFalso({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"ok":true}' }] });
    const r = await new AnthropicProvider(client).completeJson(req);
    expect(r).toEqual({ ok: true });
    const p = chamadas[0];
    expect(p.model).toBe('claude-opus-5-5');
    expect(p.betas).toContain('server-side-fallback-2026-07-01');
    expect(p.fallbacks).toBe('default');
    expect(p.max_tokens).toBe(16000);
    expect(p.system).toBe('Sistema de teste');
    expect(p.messages).toEqual([{ role: 'user', content: 'Pedido de teste' }]);
    expect(p.output_config.format.type).toBe('json_schema');
    expect(p.output_config.format.schema).toEqual(req.schema);
    expect(p.output_config.effort).toBe('high');
    for (const k of ['temperature', 'top_p', 'top_k', 'thinking']) expect(p).not.toHaveProperty(k);
  });

  it('respeita IDD_FASE0_MODEL, effort e maxTokens', async () => {
    process.env.IDD_FASE0_MODEL = 'outro-modelo';
    const { chamadas, client } = clienteFalso({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{}' }] });
    await new AnthropicProvider(client).completeJson({ ...req, effort: 'low', maxTokens: 500 });
    expect(chamadas[0].model).toBe('outro-modelo');
    expect(chamadas[0].max_tokens).toBe(500);
    expect(chamadas[0].output_config.effort).toBe('low');
  });

  it('refusal vira LlmRefusalError com categoria', async () => {
    const { client } = clienteFalso({ stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'cyber' }, content: [] });
    const e = await new AnthropicProvider(client).completeJson(req).catch(x => x);
    expect(e).toBeInstanceOf(LlmRefusalError);
    expect(e.category).toBe('cyber');
    expect(e.message).toContain('cyber');
  });

  it('max_tokens vira LlmTruncatedError', async () => {
    const { client } = clienteFalso({ stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"ok' }] });
    await expect(new AnthropicProvider(client).completeJson(req)).rejects.toBeInstanceOf(LlmTruncatedError);
  });

  it('JSON inválido e ausência de bloco de texto geram erro claro', async () => {
    const a = clienteFalso({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'não é json' }] });
    await expect(new AnthropicProvider(a.client).completeJson(req)).rejects.toThrow(/JSON válido/);
    const b = clienteFalso({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }] });
    await expect(new AnthropicProvider(b.client).completeJson(req)).rejects.toThrow(/bloco de texto/);
  });

  it('usa o bloco de texto mesmo com thinking antes', async () => {
    const { client } = clienteFalso({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"ok":false}' }] });
    expect(await new AnthropicProvider(client).completeJson(req)).toEqual({ ok: false });
  });
});

describe('ManualProvider', () => {
  let dir: string;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-llm-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it('sem resposta: grava o pedido e lança AguardandoRespostaManual', async () => {
    const m = new ManualProvider(dir, 'rodadas/rodada-01');
    const e = await m.completeJson(req).catch(x => x);
    expect(e).toBeInstanceOf(AguardandoRespostaManual);
    expect(e.promptPath).toBe(path.join(dir, 'rodadas', 'rodada-01.pedido.md'));
    expect(e.respostaPath).toBe(path.join(dir, 'rodadas', 'rodada-01.resposta.json'));
    const pedido = fs.readFileSync(e.promptPath, 'utf8');
    expect(pedido).toContain('Cole este texto');
    expect(pedido).toContain('rodada-01.resposta.json');
    expect(pedido).toContain('Sistema de teste');
    expect(pedido).toContain('Pedido de teste');
    expect(pedido).toContain('"additionalProperties": false');
  });

  it('com resposta: lê JSON puro', async () => {
    fs.mkdirSync(path.join(dir, 'rodadas'));
    fs.writeFileSync(path.join(dir, 'rodadas', 'rodada-01.resposta.json'), '{"ok": true}');
    expect(await new ManualProvider(dir, 'rodadas/rodada-01').completeJson(req)).toEqual({ ok: true });
  });

  it('com resposta: aceita cerca ```json', async () => {
    fs.mkdirSync(path.join(dir, 'rodadas'));
    fs.writeFileSync(path.join(dir, 'rodadas', 'rodada-01.resposta.json'), '```json\n{"ok": true}\n```\n');
    expect(await new ManualProvider(dir, 'rodadas/rodada-01').completeJson(req)).toEqual({ ok: true });
  });

  it('resposta que não é JSON gera erro claro', async () => {
    fs.mkdirSync(path.join(dir, 'rodadas'));
    fs.writeFileSync(path.join(dir, 'rodadas', 'rodada-01.resposta.json'), 'oi');
    await expect(new ManualProvider(dir, 'rodadas/rodada-01').completeJson(req)).rejects.toThrow(/Resposta inválida/);
  });
});

describe('RecordedProvider e escolherProvedor', () => {
  it('devolve respostas em ordem e registra pedidos', async () => {
    const r = new RecordedProvider([{ a: 1 }, { a: 2 }]);
    expect(await r.completeJson(req)).toEqual({ a: 1 });
    expect(await r.completeJson({ ...req, user: 'outro' })).toEqual({ a: 2 });
    expect(r.pedidos.map(p => p.user)).toEqual(['Pedido de teste', 'outro']);
    await expect(r.completeJson(req)).rejects.toThrow();
  });

  it('escolhe pelo ambiente', () => {
    const o = { dir: '/tmp', baseName: 'x' };
    expect(escolherProvedor({ ...o, env: {} }).name).toBe('manual');
    expect(escolherProvedor({ ...o, env: { ANTHROPIC_API_KEY: 'k' } }).name).toBe('anthropic');
    expect(escolherProvedor({ ...o, env: { ANTHROPIC_AUTH_TOKEN: 't' } }).name).toBe('anthropic');
    expect(escolherProvedor({ ...o, env: { ANTHROPIC_API_KEY: 'k', IDD_LLM: 'manual' } }).name).toBe('manual');
    expect(escolherProvedor({ ...o, env: { IDD_LLM: 'anthropic', ANTHROPIC_API_KEY: 'k' } }).name).toBe('anthropic');
    expect(() => escolherProvedor({ ...o, env: { IDD_LLM: 'xyz' } })).toThrow(/IDD_LLM/);
  });
});
