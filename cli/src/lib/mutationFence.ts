// src/lib/mutationFence.ts — cerca de mutação: compara as mutações de this (AST) com o contrato do método.
// INV-ENCAP-01: campo read-only mutado · INV-UI-04: campo fora de allowed_fields · INV-UI-05: mutação não verificável.
import { CAMPO_DINAMICO, extrairAstTypeScript, type MutationRecord } from './fase0/graphify.ts';

export interface ContratoMutacao {
  targetClass?: string;
  targetMethod?: string;
  allowedFields: string[];
  readOnlyFields: string[];
}

export interface ViolacaoMutacao {
  codigo: 'INV-ENCAP-01' | 'INV-UI-04' | 'INV-UI-05';
  mutacao: MutationRecord;
  mensagem: string;
}

/**
 * Campos do contrato que se referem a atributos da própria classe: "campo" ou "Classe.campo" com a
 * classe-alvo. "OutraClasse.campo" fala de outra entidade e não autoriza nem proíbe campos de this.
 */
function camposDaClasse(lista: string[], targetClass?: string): Set<string> {
  const out = new Set<string>();
  for (const f of lista) {
    const [cls, campo] = f.includes('.') ? f.split('.', 2) : [undefined, f];
    if (!cls || !targetClass || cls === targetClass) out.add(campo);
  }
  return out;
}

export function verificarCercaMutacao(codigo: string, arquivo: string, c: ContratoMutacao): ViolacaoMutacao[] {
  // Contrato v2 com método-alvo: allowed_fields é a lista exata (vazia = o método não muta nada).
  // Contrato sem método-alvo (legado): só fiscaliza se houver alguma lista declarada, no arquivo inteiro.
  const porMetodo = Boolean(c.targetMethod);
  if (!porMetodo && c.allowedFields.length === 0 && c.readOnlyFields.length === 0) return [];

  const permitidos = camposDaClasse(c.allowedFields, c.targetClass);
  const somenteLeitura = camposDaClasse(c.readOnlyFields, c.targetClass);
  const mutacoes = extrairAstTypeScript(codigo, arquivo).mutations.filter(m =>
    !porMetodo || (m.method === c.targetMethod && (!c.targetClass || m.className === c.targetClass)));

  const out: ViolacaoMutacao[] = [];
  for (const m of mutacoes) {
    const onde = `${m.className ? `${m.className}.` : ''}${m.method}, linha ${m.line}:${m.column}`;
    if (m.field === CAMPO_DINAMICO) {
      out.push({ codigo: 'INV-UI-05', mutacao: m, mensagem: `[INV-UI-05] Mutação de this não verificável estaticamente (${m.operator}) em ${onde}` });
    } else if (somenteLeitura.has(m.field)) {
      out.push({ codigo: 'INV-ENCAP-01', mutacao: m, mensagem: `[INV-ENCAP-01] Campo '${m.field}' é read-only no contrato, mutado em ${onde}` });
    } else if ((porMetodo || permitidos.size > 0) && !permitidos.has(m.field)) {
      const lista = c.allowedFields.length ? c.allowedFields.join(', ') : 'nenhum';
      out.push({ codigo: 'INV-UI-04', mutacao: m, mensagem: `[INV-UI-04] Campo '${m.field}' fora de allowed_fields (${lista}), mutado em ${onde}` });
    }
  }
  return out;
}
