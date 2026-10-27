// src/commands/lintLn.ts — idd lint-ln: lint de ambiguidade em linguagem natural (offline, sem LLM)
import * as fs   from 'node:fs';
import * as path from 'node:path';
import { header, error, info, row, BOLD, RESET, RED, YELLOW, GRAY, GREEN, CYAN } from '../lib/ui.ts';
import { parseDictionary, type UbiquitousDictionary } from '@idd/core';
import { lintTexto, type DiagnosticoLn, type Severidade } from '../lib/fase0/lintLn.ts';

const COR: Record<Severidade, string> = { erro: RED, aviso: YELLOW, info: GRAY };

function flag(args: string[], name: string): string | undefined {
  return args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function carregarDicionario(file: string): UbiquitousDictionary {
  const parsed = parseDictionary(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (!parsed.ok) throw new Error(`Dicionário inválido em ${file}:\n` + parsed.issues.map(i => `  - ${i.field}: ${i.message}`).join('\n'));
  return parsed.dictionary;
}

function ajuda(): void {
  console.log(`
  ${CYAN}idd lint-ln <arquivos...> [--dicionario=<path>] [--strict]${RESET}
    Lint de ambiguidade em linguagem natural controlada (offline, determinístico).
    ${GRAY}--dicionario=<path>${RESET}  dicionário ubíquo (ativa LN006-LN008); padrão: dicionario.json ao lado do arquivo
    ${GRAY}--strict${RESET}             avisos também causam saída com código 1
    ${GRAY}Regras:${RESET} LN001 vago · LN002 e/ou · LN003 passiva · LN004 anáfora · LN005 tempo · LN006-8 dicionário ·
            LN010 EARS · LN011-12 invariantes · LN013 id duplicado
`);
}

export async function cmdLintLn(args: string[]): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) { ajuda(); return; }
  header('lint-ln');
  const strict = args.includes('--strict');
  const arquivos = args.filter(a => !a.startsWith('--'));
  if (arquivos.length === 0) { error('Uso: idd lint-ln <arquivos...> [--dicionario=<path>] [--strict]'); process.exit(1); }

  const dicFlag = flag(args, 'dicionario');
  let dicGlobal: UbiquitousDictionary | undefined;
  try {
    if (dicFlag) dicGlobal = carregarDicionario(path.resolve(dicFlag));
  } catch (e) {
    error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  let erros = 0, avisos = 0, infos = 0;
  for (const arq of arquivos) {
    const full = path.resolve(arq);
    if (!fs.existsSync(full)) { error(`Arquivo não encontrado: ${arq}`); process.exit(1); }
    let dic = dicGlobal;
    if (!dic) {
      const vizinho = path.join(path.dirname(full), 'dicionario.json');
      if (fs.existsSync(vizinho)) {
        try { dic = carregarDicionario(vizinho); }
        catch (e) { error(e instanceof Error ? e.message : String(e)); process.exit(1); }
      }
    }
    const rel = path.relative(process.cwd(), full) || arq;
    const diags: DiagnosticoLn[] = lintTexto(fs.readFileSync(full, 'utf8'), { dicionario: dic, arquivo: rel });
    if (diags.length) {
      console.log(`\n  ${BOLD}${rel}${RESET}`);
      for (const d of diags) {
        console.log(`    ${rel}:${d.linha}:${d.coluna} ${d.regra} ${COR[d.severidade]}${d.severidade}${RESET} ${d.mensagem}`);
        if (d.sugestao) console.log(`      ${GRAY}→ ${d.sugestao}${RESET}`);
      }
    }
    for (const d of diags) {
      if (d.severidade === 'erro') erros++; else if (d.severidade === 'aviso') avisos++; else infos++;
    }
  }
  console.log('');
  row('arquivos', String(arquivos.length));
  row('erros', erros ? `${RED}${erros}${RESET}` : `${GREEN}0${RESET}`);
  row('avisos', avisos ? `${YELLOW}${avisos}${RESET}` : `${GREEN}0${RESET}`);
  row('infos', String(infos));
  if (!dicGlobal) info('Sem --dicionario, as regras LN006-LN008 só rodam se houver dicionario.json ao lado do arquivo.');
  if (erros > 0 || (strict && avisos > 0)) process.exit(1);
}
