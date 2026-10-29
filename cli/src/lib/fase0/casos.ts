// src/lib/fase0/casos.ts — estrutura em disco de um caso da Fase 0
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

export interface Decisao {
  id: string;
  marcada: boolean;
  bloqueante: boolean;
  campos: string[];
  linha: number;
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
    const campos = (m[3] ?? '').split('·').map(s => s.trim());
    out.push({ id: m[2], marcada: m[1] !== ' ', bloqueante: campos.some(c => c.toLowerCase() === 'bloqueante'), campos, linha: i + 1 });
  });
  return out;
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
> respondida: \`- [x] D-001 · R01/P01 · bloqueante · <pergunta> → <resposta> (AAAA-MM-DD)\`
> em aberto:  \`- [ ] D-002 · R01/P02 · bloqueante · <pergunta>\`
> Você também pode responder uma pergunta em aberto editando a linha e marcando [x].
> O Gate 1 só fica verde sem decisões \`[ ]\` bloqueantes.

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
