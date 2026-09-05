// src/commands/dictionary.ts — Dicionário Ubíquo (DAV Layer 0)
// Curadoria humana, consulta offline e determinística. Nenhum LLM aqui.
import * as fs   from 'node:fs';
import * as path from 'node:path';
import yaml      from 'js-yaml';
import { header, success, error, info, warn, row, table, footer,
         BOLD, RESET, YELLOW, GRAY, GREEN, CYAN } from '../lib/ui.ts';
import { findProjectRoot } from '../lib/store.ts';
import {
  DICTIONARY_PATH, TERM_KINDS, emptyDictionary, parseDictionary, parseContract,
  checkContractTerms, findTerm,
  type UbiquitousDictionary, type DictionaryTerm, type TermKind, type TermWarning,
} from '@idd/core';

// ── IO ────────────────────────────────────────────────────────────

export function dictionaryFile(root: string): string {
  return path.join(root, DICTIONARY_PATH);
}

/** Returns undefined when no dictionary exists; throws on invalid content. */
export function loadDictionary(root: string): UbiquitousDictionary | undefined {
  const file = dictionaryFile(root);
  if (!fs.existsSync(file)) return undefined;
  const parsed = parseDictionary(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (!parsed.ok) {
    throw new Error(`Dicionário inválido em ${file}:\n` + parsed.issues.map(i => `  - ${i.field}: ${i.message}`).join('\n'));
  }
  return parsed.dictionary;
}

export function saveDictionary(root: string, dict: UbiquitousDictionary): string {
  const file = dictionaryFile(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sorted: UbiquitousDictionary = { version: dict.version, terms: [...dict.terms].sort((a, b) => a.term.localeCompare(b.term)) };
  fs.writeFileSync(file, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  return file;
}

/** Deterministic offline check used by capture/verify; silent when there is no dictionary. */
export function checkIntentAgainstDictionary(root: string, rawIntent: unknown): TermWarning[] {
  const dict = loadDictionary(root);
  if (!dict) return [];
  const parsed = parseContract(rawIntent);
  if (!parsed.ok) return [];
  return checkContractTerms(dict, parsed.contract);
}

export function printTermWarnings(warnings: TermWarning[]): void {
  for (const w of warnings) {
    const icon = w.kind === 'forbidden' ? `${YELLOW}⚠` : `${YELLOW}?`;
    console.log(`    ${icon}${RESET}  ${GRAY}${w.field}${RESET}  ${w.message}`);
  }
}

// ── Subcomandos ───────────────────────────────────────────────────

function flag(args: string[], name: string): string | undefined {
  return args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function listFlag(args: string[], name: string): string[] {
  return (flag(args, name) ?? '').split(',').map(s => s.trim()).filter(Boolean);
}

function dictInit(root: string): void {
  const file = dictionaryFile(root);
  if (fs.existsSync(file)) { info(`Dicionário já existe em ${file}`); return; }
  saveDictionary(root, emptyDictionary());
  success(file);
  footer('Adicione termos com: idd dictionary add <Termo> "definição" [--kind=entity] [--context=ctx] [--alias=a,b] [--forbid=x,y]');
}

function dictList(root: string, args: string[]): void {
  const dict = loadDictionary(root);
  if (!dict) { warn(`Nenhum dicionário em ${DICTIONARY_PATH}. Crie com: idd dictionary init`); return; }
  const ctx = flag(args, 'context');
  const terms = ctx ? dict.terms.filter(t => t.context === ctx) : dict.terms;
  if (terms.length === 0) { info('Dicionário vazio.'); return; }
  table(
    ['termo', 'tipo', 'contexto', 'aliases', 'proibidos', 'definição'],
    terms.map(t => [t.term, t.kind, t.context ?? `${GRAY}—${RESET}`, t.aliases.join(', ') || `${GRAY}—${RESET}`, t.forbidden.join(', ') || `${GRAY}—${RESET}`, t.definition.length > 60 ? t.definition.slice(0, 57) + '…' : t.definition]),
  );
  console.log('');
  row('termos', String(terms.length));
}

function dictShow(root: string, args: string[]): void {
  const name = args.find(a => !a.startsWith('--'));
  if (!name) { error('Uso: idd dictionary show <Termo>'); process.exit(1); }
  const dict = loadDictionary(root);
  const t = dict && findTerm(dict, name);
  if (!t) { error(`"${name}" não está no dicionário.`); process.exit(1); }
  row('termo', `${BOLD}${t.term}${RESET}`);
  row('tipo', t.kind);
  if (t.context) row('contexto', t.context);
  row('definição', t.definition);
  if (t.aliases.length) row('aliases', t.aliases.join(', '));
  if (t.forbidden.length) row('proibidos', t.forbidden.join(', '));
}

function dictAdd(root: string, args: string[]): void {
  const positional = args.filter(a => !a.startsWith('--'));
  const [term, definition] = positional;
  if (!term || !definition) {
    error('Uso: idd dictionary add <Termo> "definição" [--kind=entity] [--context=ctx] [--alias=a,b] [--forbid=x,y]');
    process.exit(1);
  }
  const kind = (flag(args, 'kind') ?? 'concept') as TermKind;
  if (!TERM_KINDS.includes(kind)) { error(`--kind deve ser um de: ${TERM_KINDS.join(', ')}`); process.exit(1); }

  const dict = loadDictionary(root) ?? emptyDictionary();
  const existing = findTerm(dict, term);
  if (existing && !args.includes('--force')) {
    error(`"${term}" já existe (como ${existing.term}). Use --force para substituir.`);
    process.exit(1);
  }
  const entry: DictionaryTerm = {
    term, definition, kind,
    context: flag(args, 'context'),
    aliases: listFlag(args, 'alias'),
    forbidden: listFlag(args, 'forbid'),
  };
  const next: UbiquitousDictionary = {
    version: dict.version,
    terms: [...dict.terms.filter(t => t.term.toLowerCase() !== term.toLowerCase()), entry],
  };
  const validated = parseDictionary(next);
  if (!validated.ok) {
    error('Termo rejeitado:');
    validated.issues.forEach(i => console.log(`    ${i.field}: ${i.message}`));
    process.exit(1);
  }
  const file = saveDictionary(root, validated.dictionary);
  success(`${BOLD}${term}${RESET} adicionado (${kind}) → ${file}`);
}

function dictRemove(root: string, args: string[]): void {
  const name = args.find(a => !a.startsWith('--'));
  if (!name) { error('Uso: idd dictionary remove <Termo>'); process.exit(1); }
  const dict = loadDictionary(root);
  if (!dict || !findTerm(dict, name)) { error(`"${name}" não está no dicionário.`); process.exit(1); }
  saveDictionary(root, { ...dict, terms: dict.terms.filter(t => t.term.toLowerCase() !== name.toLowerCase()) });
  success(`"${name}" removido.`);
}

function dictCheck(root: string, args: string[]): void {
  const strict = args.includes('--strict');
  const target = args.find(a => !a.startsWith('--'));
  const dict = loadDictionary(root);
  if (!dict) { warn(`Nenhum dicionário em ${DICTIONARY_PATH}. Crie com: idd dictionary init`); return; }

  const files = target ? [path.resolve(target)] : findIntentFiles(process.cwd());
  if (files.length === 0) { warn('Nenhum .intent.yaml encontrado.'); return; }

  let total = 0;
  const rows: string[][] = [];
  for (const file of files) {
    let warnings: TermWarning[];
    try {
      const raw = yaml.load(fs.readFileSync(file, 'utf8'));
      const parsed = parseContract(raw);
      if (!parsed.ok) { rows.push([path.relative(root, file), `${GRAY}contrato inválido${RESET}`]); continue; }
      warnings = checkContractTerms(dict, parsed.contract);
    } catch (e) {
      rows.push([path.relative(root, file), `${GRAY}YAML inválido${RESET}`]);
      continue;
    }
    total += warnings.length;
    rows.push([path.relative(root, file), warnings.length ? `${YELLOW}${warnings.length}${RESET}` : `${GREEN}0${RESET}`]);
    if (warnings.length) {
      console.log(`  ${BOLD}${path.relative(root, file)}${RESET}`);
      printTermWarnings(warnings);
      console.log('');
    }
  }
  table(['arquivo', 'termos fora do dicionário'], rows);
  console.log('');
  row('termos no dicionário', String(dict.terms.length));
  row('avisos', total ? `${YELLOW}${total}${RESET}` : `${GREEN}0${RESET}`);
  footer(total
    ? 'Termos fora do dicionário são ambiguidade latente. Defina-os (idd dictionary add) ou troque pelo termo canônico.'
    : 'Toda a linguagem das intenções está no Dicionário Ubíquo. ✓');
  if (strict && total > 0) process.exit(1);
}

function findIntentFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findIntentFiles(full));
    else if (entry.name.endsWith('.intent.yaml') && entry.name !== 'project.intent.yaml') out.push(full);
  }
  return out;
}

// ── Entrada ───────────────────────────────────────────────────────

export async function cmdDictionary(args: string[]): Promise<void> {
  const sub = args[0] && !args[0].startsWith('--') ? args[0] : 'list';
  const rest = args[0] && !args[0].startsWith('--') ? args.slice(1) : args;
  header(`dictionary ${sub}`);
  const root = findProjectRoot() ?? process.cwd();
  try {
    switch (sub) {
      case 'init':   return dictInit(root);
      case 'list':
      case 'ls':     return dictList(root, rest);
      case 'show':   return dictShow(root, rest);
      case 'add':    return dictAdd(root, rest);
      case 'remove':
      case 'rm':     return dictRemove(root, rest);
      case 'check':  return dictCheck(root, rest);
      default:
        error(`Subcomando desconhecido: "${sub}"`);
        info(`Use: ${CYAN}idd dictionary [init|list|show|add|remove|check]${RESET}`);
        process.exit(1);
    }
  } catch (e) {
    error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
