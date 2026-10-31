// src/lib/inspect.ts — ponte código → contrato: sugere anotações TSDoc (@intent, @mutates) a partir das
// mutações de estado que o código já faz. Útil para adotar o IDD numa base existente, método a método.
import { CAMPO_DINAMICO, extrairAstTypeScript } from './fase0/graphify.ts';

export interface MetodoInspecionado {
  classe: string;
  metodo: string;
  linha: number;
  /** campos de this que o método altera, na ordem em que aparecem */
  muta: string[];
  /** há mutação que a análise estática não consegue identificar (this[k], Object.assign(this, ...)) */
  dinamico: boolean;
}

export function inspecionarCodigo(codigo: string, arquivo = 'fonte.ts'): MetodoInspecionado[] {
  const ast = extrairAstTypeScript(codigo, arquivo);
  const out: MetodoInspecionado[] = [];
  for (const n of ast.nodes) {
    if (n.kind !== 'method') continue;
    const [classe, metodo] = n.id.replace(/^method:/, '').split('.');
    if (!metodo || metodo === 'constructor') continue;
    const muts = ast.mutationsByMethod.get(`${classe}.${metodo}`) ?? [];
    const campos = [...new Set(muts.map(m => m.field).filter(f => f !== CAMPO_DINAMICO))];
    out.push({ classe, metodo, linha: n.line ?? 0, muta: campos, dinamico: muts.some(m => m.field === CAMPO_DINAMICO) });
  }
  return out;
}

export function tsdocSugerido(m: MetodoInspecionado): string {
  const L = ['/**', ` * @intent ${m.classe}.${m.metodo}`, ` * @mutates ${m.muta.length ? m.muta.join(', ') : 'nenhum'}`];
  if (m.dinamico) L.push(' * TODO(IDD): há mutação dinâmica (this[k] ou Object.assign(this, ...)); troque por campos literais.');
  L.push(' */');
  return L.join('\n');
}
