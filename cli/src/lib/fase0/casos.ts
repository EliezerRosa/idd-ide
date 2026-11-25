// src/lib/fase0/casos.ts — estrutura em disco de um caso da Fase 0
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { emptyDictionary, parseDictionary, type UbiquitousDictionary } from '@idd/core';

export interface CasoPaths {
  dir: string;
  fontes: string;
  rodadas: string;
  decisoes: string;
  intencoes: string;
  invariantes: string;
  dicionario: string;
  /** loop 2 */
  modelo: string;
  dominio: string;
  casos: string;
  contexto: string;
  atividades: string;
  atividadesDir: string;
  estados: string;
  estadosDir: string;
  metodos: string;
  contratosDir: string;
  rastreabilidade: string;
  exportacoesDir: string;
  dbml: string;
  dominioPuml: string;
  schemaSql: string;
  specMd: string;
}

export function nomeCasoValido(caso: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(caso);
}

export function caminhosCaso(root: string, caso: string): CasoPaths {
  if (!nomeCasoValido(caso)) throw new Error(`Nome de caso inválido: "${caso}". Use letras, números, ponto, hífen e sublinhado.`);
  const dir = path.join(root, 'fase0', caso);
  return {
    dir,
    fontes: path.join(dir, 'fontes'),
    rodadas: path.join(dir, 'rodadas'),
    decisoes: path.join(dir, 'decisoes.md'),
    intencoes: path.join(dir, 'intencoes.md'),
    invariantes: path.join(dir, 'invariantes.md'),
    dicionario: path.join(dir, 'dicionario.json'),
    modelo: path.join(dir, 'modelo'),
    dominio: path.join(dir, 'modelo', 'dominio.mmd'),
    casos: path.join(dir, 'modelo', 'casos-de-uso.yaml'),
    contexto: path.join(dir, 'modelo', 'contexto.puml'),
    atividades: path.join(dir, 'modelo', 'atividades.yaml'),
    atividadesDir: path.join(dir, 'modelo', 'atividades'),
    estados: path.join(dir, 'modelo', 'estados.yaml'),
    estadosDir: path.join(dir, 'modelo', 'estados'),
    metodos: path.join(dir, 'modelo', 'metodos.yaml'),
    contratosDir: path.join(dir, 'contratos'),
    rastreabilidade: path.join(dir, 'rastreabilidade.md'),
    exportacoesDir: path.join(dir, 'exportacoes'),
    dbml: path.join(dir, 'exportacoes', 'dominio.dbml'),
    dominioPuml: path.join(dir, 'exportacoes', 'dominio.puml'),
    schemaSql: path.join(dir, 'exportacoes', 'schema.sql'),
    specMd: path.join(dir, 'exportacoes', 'spec.md'),
  };
}

export function hoje(d = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function lerTexto(file: string): string {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

export function lerDicionarioCaso(file: string): UbiquitousDictionary {
  if (!fs.existsSync(file)) return emptyDictionary();
  const parsed = parseDictionary(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (!parsed.ok) {
    throw new Error(`Dicionário inválido em ${file}:\n` + parsed.issues.map(i => `  - ${i.field}: ${i.message}`).join('\n'));
  }
  return parsed.dictionary;
}

export function salvarDicionarioCaso(file: string, dic: UbiquitousDictionary): void {
  const ordenado: UbiquitousDictionary = { version: dic.version, terms: [...dic.terms].sort((a, b) => a.term.localeCompare(b.term)) };
  fs.writeFileSync(file, JSON.stringify(ordenado, null, 2) + '\n', 'utf8');
}

// ── Rodadas ────────────────────────────────────────────────────────

export function rotuloRodada(n: number): string {
  return String(n).padStart(2, '0');
}

export function arquivoRodada(p: CasoPaths, n: number, ext: 'md' | 'json' | 'aplicada'): string {
  return path.join(p.rodadas, `rodada-${rotuloRodada(n)}.${ext}`);
}

/** Números das rodadas existentes (por rodada-NN.json ou .md), em ordem crescente. */
export function listarRodadas(p: CasoPaths): number[] {
  if (!fs.existsSync(p.rodadas)) return [];
  const nums = new Set<number>();
  for (const f of fs.readdirSync(p.rodadas)) {
    const m = f.match(/^rodada-(\d+)\.(json|md)$/);
    if (m) nums.add(Number(m[1]));
  }
  return [...nums].sort((a, b) => a - b);
}

export function rodadaAplicada(p: CasoPaths, n: number): boolean {
  return fs.existsSync(arquivoRodada(p, n, 'aplicada'));
}

// ── decisoes.md ────────────────────────────────────────────────────

export interface ParametrosHashDecisao {
  id: string;
  texto: string;
  escolha: string;
  autor: string;
  data: string;
}

/**
 * Calcula o hash SHA-256 canônico de uma decisão humana:
 * SHA-256("${id}|${texto}|${escolha}|${autor}|${data}")
 */
export function calcularHashDecisao(p: ParametrosHashDecisao): string {
  const canônico = `${p.id.trim()}|${p.texto.trim()}|${p.escolha.trim()}|${p.autor.trim()}|${p.data.trim()}`;
  return crypto.createHash('sha256').update(canônico, 'utf8').digest('hex');
}

export interface Decisao {
  id: string;
  marcada: boolean;
  bloqueante: boolean;
  campos: string[];
  linha: number;
  rawLinha?: string;
  texto?: string;
  escolha?: string;
  autor?: string;
  data?: string;
  hash?: string;
  hashCalculado?: string;
  hashValido?: boolean;
}

/** Extrai os componentes semânticos e criptográficos de uma linha de decisão. */
export function extrairComponentesDecisao(id: string, campos: string[]): {
  texto?: string;
  escolha?: string;
  autor?: string;
  data?: string;
  hash?: string;
  hashCalculado?: string;
  hashValido?: boolean;
} {
  let autor: string | undefined;
  let hash: string | undefined;

  for (const c of campos) {
    if (/^autor\s*:/i.test(c)) autor = c.replace(/^autor\s*:/i, '').trim();
    if (/^sha256\s*:/i.test(c)) hash = c.replace(/^sha256\s*:/i, '').trim().toLowerCase();
  }

  const metaRodada = campos.find(c => /^(R\d+|L\d+)(\/|$)/i.test(c));
  const metaBloq = campos.find(c => /^(bloqueante|não-bloqueante)$/i.test(c));
  const conteudoCampos = campos.filter(c =>
    c !== metaRodada &&
    c !== metaBloq &&
    !/^autor\s*:/i.test(c) &&
    !/^sha256\s*:/i.test(c)
  );

  const miolo = conteudoCampos.join(' · ').trim();
  const mData = miolo.match(/\((\d{4}-\d{2}-\d{2})\)\s*$/);
  const data = mData ? mData[1] : undefined;
  const mioloSemData = mData ? miolo.slice(0, mData.index).trim() : miolo;

  let texto: string | undefined;
  let escolha: string | undefined;

  if (mioloSemData.includes('→')) {
    const partes = mioloSemData.split('→');
    texto = partes[0].trim();
    escolha = partes.slice(1).join('→').trim();
  } else if (mioloSemData.includes(':')) {
    const idx = mioloSemData.indexOf(':');
    escolha = mioloSemData.slice(0, idx).trim();
    texto = mioloSemData.slice(idx + 1).trim();
  } else if (mioloSemData.includes('—')) {
    const idx = mioloSemData.indexOf('—');
    escolha = mioloSemData.slice(0, idx).trim();
    texto = mioloSemData.slice(idx + 1).trim();
  } else if (mioloSemData.length > 0) {
    texto = mioloSemData;
    escolha = 'aprovado';
  }

  let hashCalculado: string | undefined;
  let hashValido: boolean | undefined;

  if (texto && escolha && autor && data) {
    hashCalculado = calcularHashDecisao({ id, texto, escolha, autor, data });
    hashValido = (hash !== undefined && hash.toLowerCase() === hashCalculado.toLowerCase());
  } else if (hash !== undefined) {
    hashValido = false;
  }

  return { texto, escolha, autor, data, hash, hashCalculado, hashValido };
}

/** Lê linhas `- [x] D-001 · R01/P01 · bloqueante · ...` */
export function lerDecisoes(texto: string): Decisao[] {
  const out: Decisao[] = [];
  let emCodigo = false;
  texto.split(/\r?\n/).forEach((raw, i) => {
    if (/^\s*(```|~~~)/.test(raw)) { emCodigo = !emCodigo; return; }
    if (emCodigo || /^\s*>/.test(raw)) return;
    const m = raw.match(/^\s*[-*]\s+\[( |x|X)\]\s+(D-\d+)\s*(?:·\s*(.*))?$/);
    if (!m) return;
    const todosCampos = (m[3] ?? '').split('·').map(s => s.trim());
    const campos = todosCampos.filter(c => !/^autor\s*:/i.test(c) && !/^sha256\s*:/i.test(c));
    const id = m[2];
    const marcada = m[1] !== ' ';
    const bloqueante = campos.some(c => c.toLowerCase() === 'bloqueante');
    const comp = extrairComponentesDecisao(id, todosCampos);

    out.push({
      id,
      marcada,
      bloqueante,
      campos,
      linha: i + 1,
      rawLinha: raw,
      ...comp,
    });
  });
  return out;
}

/**
 * Carimba uma linha de decisão em markdown com autor e hash SHA-256 canônico.
 * Se a linha for `- [x] D-001 · ...`, calcula o hash canônico e anexa `· autor: <autor> · sha256: <hash>`.
 */
export function carimbarDecisaoLinha(raw: string, autorPadrao = 'Eliézer Rosa'): string {
  const m = raw.match(/^\s*[-*]\s+\[(x|X)\]\s+(D-\d+)\s*(?:·\s*(.*))?$/);
  if (!m) return raw;
  const id = m[2];
  const campos = (m[3] ?? '').split('·').map(s => s.trim());

  let autor = autorPadrao;
  for (const c of campos) {
    if (/^autor\s*:/i.test(c)) autor = c.replace(/^autor\s*:/i, '').trim();
  }

  const camposBase = campos.filter(c => !/^autor\s*:/i.test(c) && !/^sha256\s*:/i.test(c));
  const comp = extrairComponentesDecisao(id, camposBase);
  if (!comp.texto || !comp.escolha || !comp.data) {
    throw new Error(`Não foi possível extrair componentes da decisão ${id}: "${raw}"`);
  }

  const hash = calcularHashDecisao({
    id,
    texto: comp.texto,
    escolha: comp.escolha,
    autor,
    data: comp.data,
  });

  const indent = raw.match(/^\s*/)?.[0] ?? '';
  return `${indent}- [x] ${id} · ${camposBase.join(' · ')} · autor: ${autor} · sha256: ${hash}`;
}

export function carimbarDecisoesTexto(texto: string, autorPadrao = 'Eliézer Rosa'): { texto: string; total: number; carimbadas: number } {
  let carimbadas = 0;
  let total = 0;
  let emCodigo = false;
  const linhas = texto.split(/\r?\n/).map(raw => {
    if (/^\s*(```|~~~)/.test(raw)) { emCodigo = !emCodigo; return raw; }
    if (emCodigo || /^\s*>/.test(raw)) return raw;
    if (/^\s*[-*]\s+\[(x|X)\]\s+(D-\d+)/.test(raw)) {
      total++;
      carimbadas++;
      return carimbarDecisaoLinha(raw, autorPadrao);
    }
    return raw;
  });
  return { texto: linhas.join('\n'), total, carimbadas };
}

export function proximoIdDecisao(texto: string): number {
  const nums = lerDecisoes(texto).map(d => Number(d.id.slice(2)));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

export function fmtDecisaoId(n: number): string {
  return `D-${String(n).padStart(3, '0')}`;
}

// ── Criação (idd fase0 init) ───────────────────────────────────────

const CAB_INTENCOES = `# Intenções — {caso}

> Uma intenção por linha, no formato \`- **INT-001** <frase>\`, em EARS adaptado ao português.
> Termos de domínio entre colchetes duplos: [[Termo]] (devem existir em dicionario.json).
> Moldes: "O/A <sujeito> deve <resposta>." · "Quando <gatilho>, o/a <sujeito> deve ..." ·
> "Enquanto <estado>, ..." · "Se <condição>, então o/a <sujeito> deve ..." · "Onde <característica>, ..."
> Exemplo: \`- **INT-001** Quando o cliente confirma o pedido, o [[Sistema]] deve registrar a venda.\`
> Nada entra aqui sem decisão humana registrada em decisoes.md.

`;

const CAB_INVARIANTES = `# Invariantes — {caso}

> Uma invariante por linha, no formato \`- **INV-001** [tipo] <enunciado testável>\`.
> Tipos: integridade, unicidade, temporal, autorização, cálculo, estado.
> O enunciado precisa de um marcador testável (sempre, nunca, deve, não pode, no máximo, no mínimo, exatamente, igual a, =, ≤, ≥, <, >).
> Exemplo: \`- **INV-001** [integridade] Todo [[Pagamento]] sempre pertence a exatamente uma [[Conta]].\`

`;

const CAB_DECISOES = `# Decisões — {caso}

> Registro das decisões humanas, uma por linha:
> respondida: \`- [x] D-001 · R01/P01 · bloqueante · <pergunta> → <resposta> (AAAA-MM-DD) · autor: <autor> · sha256: <hash>\`
> em aberto:  \`- [ ] D-002 · R01/P02 · bloqueante · <pergunta>\`
> Você também pode responder uma pergunta em aberto editando a linha e marcando [x].
> Toda decisão [x] deve ter autor e hash SHA-256 canônico ("\${id}|\${texto}|\${escolha}|\${autor}|\${data}").
> O Gate 1 só fica verde sem decisões \`[ ]\` bloqueantes e com todas as [x] íntegras.

`;

export interface ResultadoInit { criados: string[]; existentes: string[] }

export function inicializarCaso(root: string, caso: string): ResultadoInit {
  const p = caminhosCaso(root, caso);
  const criados: string[] = [];
  const existentes: string[] = [];
  const rel = (f: string): string => path.relative(root, f).split(path.sep).join('/');

  for (const d of [p.dir, p.fontes, p.rodadas]) {
    if (fs.existsSync(d)) existentes.push(rel(d) + '/');
    else { fs.mkdirSync(d, { recursive: true }); criados.push(rel(d) + '/'); }
  }
  const arquivos: Array<[string, string]> = [
    [p.decisoes, CAB_DECISOES.replace('{caso}', caso)],
    [p.intencoes, CAB_INTENCOES.replace('{caso}', caso)],
    [p.invariantes, CAB_INVARIANTES.replace('{caso}', caso)],
    [p.dicionario, JSON.stringify(emptyDictionary(), null, 2) + '\n'],
  ];
  for (const [file, conteudo] of arquivos) {
    if (fs.existsSync(file)) existentes.push(rel(file));
    else { fs.writeFileSync(file, conteudo, 'utf8'); criados.push(rel(file)); }
  }
  return { criados, existentes };
}
