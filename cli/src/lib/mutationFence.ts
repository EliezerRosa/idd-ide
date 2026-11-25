// src/lib/mutationFence.ts — Cerca de mutação: audita o conjunto de arestas 'WRITES' e mutações de this contra o contrato (.intent.yaml).
// Conexão formal de AST Graph (I11 / I12):
// - INV-ENCAP-01: aresta WRITES ou mutação em campo read-only
// - INV-UI-04: aresta WRITES ou mutação em campo fora de allowed_fields
// - INV-UI-05: aresta WRITES ou mutação dinâmica não verificável estaticamente
import { CAMPO_DINAMICO, extrairAstTypeScript, type MutationRecord, type AstGraph, type GraphEdge } from './fase0/astGraph.ts';

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
  aresta?: GraphEdge;
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

  const astResult = extrairAstTypeScript(codigo, arquivo);
  const { edges } = astResult.astGraph;

  // Filtra mutações de instância pelo escopo da classe e do método/acessor alvo
  const mutacoes = astResult.mutations.filter(m => {
    if (!porMetodo) return true;
    if (c.targetClass && m.className !== c.targetClass) return false;
    if (m.method === c.targetMethod) return true;
    if (c.targetMethod && (c.targetMethod === `set ${m.method}` || c.targetMethod === `get ${m.method}`)) return true;
    return false;
  });

  // Mapeia arestas tipadas do tipo 'WRITES' para fiscalização direta do grafo
  const targetRaw = c.targetMethod?.replace(/^(set|get)\s+/, '');
  const arestasWrites = edges.filter(e => {
    if (e.tipo !== 'WRITES') return false;
    if (!porMetodo) return true;
    if (!targetRaw) return true;
    const prefixoMetodo = c.targetClass ? `method:${c.targetClass}.${targetRaw}` : `method:${targetRaw}`;
    const prefixoAcessor = c.targetClass ? `accessor:${c.targetClass}.${targetRaw}` : `accessor:${targetRaw}`;
    return e.origem === prefixoMetodo || e.origem === prefixoAcessor || e.origem.endsWith(`.${targetRaw}`);
  });

  const out: ViolacaoMutacao[] = [];

  for (const m of mutacoes) {
    const onde = `${m.className ? `${m.className}.` : ''}${m.method}, linha ${m.line}:${m.column}`;
    const arestaAssociada = arestasWrites.find(
      e => e.destino.endsWith(`.${m.field}`) || e.destino === `prop:${m.field}`
    );

    if (m.field === CAMPO_DINAMICO) {
      out.push({
        codigo: 'INV-UI-05',
        mutacao: m,
        aresta: arestaAssociada,
        mensagem: `[INV-UI-05] Mutação de this não verificável estaticamente (${m.operator}) em ${onde}`,
      });
    } else if (somenteLeitura.has(m.field)) {
      out.push({
        codigo: 'INV-ENCAP-01',
        mutacao: m,
        aresta: arestaAssociada,
        mensagem: `[INV-ENCAP-01] Campo '${m.field}' é read-only no contrato, mutado em ${onde}`,
      });
    } else if ((porMetodo || permitidos.size > 0) && !permitidos.has(m.field)) {
      const lista = c.allowedFields.length ? c.allowedFields.join(', ') : 'nenhum';
      out.push({
        codigo: 'INV-UI-04',
        mutacao: m,
        aresta: arestaAssociada,
        mensagem: `[INV-UI-04] Campo '${m.field}' fora de allowed_fields (${lista}), mutado em ${onde}`,
      });
    }
  }

  return out;
}
