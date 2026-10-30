// src/commands/inspect.ts — idd inspect <arquivo.ts|diretório>: sugere contratos TSDoc a partir do código
import * as fs from 'node:fs';
import * as path from 'node:path';
import { header, error, info, subHeader, BOLD, RESET, GRAY, YELLOW } from '../lib/ui.ts';
import { inspecionarCodigo, tsdocSugerido } from '../lib/inspect.ts';

function arquivosTs(alvo: string): string[] {
  const st = fs.statSync(alvo);
  if (st.isFile()) return [alvo];
  const out: string[] = [];
  for (const e of fs.readdirSync(alvo, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
    const full = path.join(alvo, e.name);
    if (e.isDirectory()) out.push(...arquivosTs(full));
    else if (/\.tsx?$/.test(e.name) && !/\.(test|spec|d)\.tsx?$/.test(e.name)) out.push(full);
  }
  return out.sort();
}

export async function cmdInspect(args: string[]): Promise<void> {
  header('inspect');
  const alvo = args.find(a => !a.startsWith('--'));
  if (!alvo) {
    error('Uso: idd inspect <arquivo.ts|diretório>');
    process.exit(1);
  }
  if (!fs.existsSync(alvo)) {
    error(`Não encontrado: "${alvo}"`);
    process.exit(1);
  }
  let total = 0;
  for (const arq of arquivosTs(alvo)) {
    const metodos = inspecionarCodigo(fs.readFileSync(arq, 'utf8'), path.basename(arq));
    if (!metodos.length) continue;
    subHeader(path.relative(process.cwd(), arq) || arq);
    for (const m of metodos) {
      total++;
      console.log(`  ${BOLD}${m.classe}.${m.metodo}${RESET} ${GRAY}(linha ${m.linha})${RESET}${m.dinamico ? `  ${YELLOW}⚠ mutação dinâmica${RESET}` : ''}`);
      console.log(tsdocSugerido(m).split('\n').map(l => `    ${l}`).join('\n'));
      console.log('');
    }
  }
  info(total
    ? `${total} método(s). Cole cada bloco acima do método e ative o @idd/eslint-plugin para fiscalizar.`
    : 'Nenhum método de classe encontrado.');
}
