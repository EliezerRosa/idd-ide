/**
 * Utilitário de parsing de anotações TSDoc / JSDoc in-tree para o IDD v2.
 * Extrai contratos comportamentais diretamente dos blocos de comentários de métodos TypeScript.
 */

export interface IdcContract {
  intent?: string;
  mutates: string[];
  readOnly: string[];
  invariants: string[];
  description?: string;
  /** "@mutates nenhum" (ou none, -): o método declara que não altera nenhum campo */
  mutatesNothing?: boolean;
}

const NENHUM = new Set(['nenhum', 'none', '-', '—']);

export function parseTsDocContract(comment: string): IdcContract {
  const result: IdcContract = {
    mutates: [],
    readOnly: [],
    invariants: [],
  };

  if (!comment) return result;

  // Limpa delimitadores de comentário /** ... */ e asteriscos iniciais
  const lines = comment
    .replace(/^\/\*\*?/, '')
    .replace(/\*\/$/, '')
    .split(/\r?\n/)
    .map(line => line.replace(/^\s*\*\s?/, '').trim());

  for (const line of lines) {
    if (!line) continue;

    // @intent <nome>
    const matchIntent = line.match(/^@intent\s+([A-Za-z0-9_.-]+)/i);
    if (matchIntent) {
      result.intent = matchIntent[1];
      continue;
    }

    // @mutates <campo1>, <campo2>, ...
    const matchMutates = line.match(/^@mutates\s+(.+)/i);
    if (matchMutates) {
      const fields = matchMutates[1]
        .split(/[,;\s]+/)
        .map(f => f.trim())
        .filter(Boolean);
      if (fields.length === 1 && NENHUM.has(fields[0].toLowerCase())) result.mutatesNothing = true;
      else result.mutates.push(...fields);
      continue;
    }

    // @readonly <campo1>, <campo2>, ...
    const matchReadOnly = line.match(/^@readonly\s+(.+)/i);
    if (matchReadOnly) {
      const fields = matchReadOnly[1]
        .split(/[,;\s]+/)
        .map(f => f.trim())
        .filter(Boolean);
      result.readOnly.push(...fields);
      continue;
    }

    // @invariant <expressão>
    const matchInvariant = line.match(/^@invariant\s+(.+)/i);
    if (matchInvariant) {
      result.invariants.push(matchInvariant[1].trim());
      continue;
    }
  }

  return result;
}

