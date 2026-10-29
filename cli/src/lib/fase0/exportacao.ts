// src/lib/fase0/exportacao.ts — Entrega 5: exportações para Visual Paradigm (DBML/PlantUML), SQL e Aider/Spec Kit (spec.md).
import * as fs from 'node:fs';
import * as path from 'node:path';
import { compileToSql } from '../domain/compiler.ts';
import type { DomainEntity, DomainModel } from '../domain/types.ts';
import { lerAtividades } from './atividades.ts';
import { lerDicionarioCaso, lerTexto, type CasoPaths } from './casos.ts';
import { lerCasos } from './casosDeUso.ts';
import { lerEstados } from './estados.ts';
import { avaliarGate1 } from './gate1.ts';
import { avaliarGate2, diagnosticarEntidade, lerModelo } from './gate2.ts';
import { lerMetodos, renderRastreabilidadeMd, type MetodoSpec, type Metodos } from './metodos.ts';

const DBML_TYPES: Record<string, string> = {
  uuid: 'uuid',
  string: 'varchar(255)',
  text: 'text',
  integer: 'integer',
  bigint: 'bigint',
  decimal: 'decimal(15,4)',
  float: 'double precision',
  boolean: 'boolean',
  timestamp: 'timestamptz',
  date: 'date',
  time: 'time',
  json: 'json',
  jsonb: 'jsonb',
  bytea: 'bytea',
  enum: 'varchar(64)',
};

/** Gera DBML (Database Markup Language) importável no Visual Paradigm e dbdiagram.io. */
export function renderDbml(caso: string, modelo: DomainModel): string {
  const linhas: string[] = [
    `// DBML gerado pelo IDD (Fase 0) — caso: ${caso}`,
    `Project "${caso}" {`,
    `  database_type: 'PostgreSQL'`,
    `  Note: 'Modelo normalizado (BCNF/3NF) aprovado no Gate 2 do IDD'`,
    `}`,
    '',
  ];

  const classes = modelo.entities.filter(e => !e.abstract);
  for (const ent of classes) {
    linhas.push(`Table ${ent.name} {`);
    const pkComposta = ent.primaryKey.length > 1;
    for (const a of ent.attributes) {
      const tipo = DBML_TYPES[a.type] ?? a.type;
      const tags: string[] = [];
      if (a.primaryKey && !pkComposta) tags.push('pk');
      if (!a.nullable) tags.push('not null');
      else tags.push('null');
      if (a.unique && !a.primaryKey) tags.push('unique');
      if (a.foreignKey) tags.push(`ref: > ${a.foreignKey.entity}.${a.foreignKey.attribute}`);
      linhas.push(`  ${a.name} ${tipo}${tags.length ? ` [${tags.join(', ')}]` : ''}`);
    }

    const diag = diagnosticarEntidade(ent);
    const chavesExtras = diag.chaves.filter(k => {
      if (k.length === ent.primaryKey.length && k.every(c => ent.primaryKey.includes(c))) return false;
      return k.length > 0;
    });

    if (pkComposta || chavesExtras.length > 0) {
      linhas.push('', '  indexes {');
      if (pkComposta) {
        linhas.push(`    (${ent.primaryKey.join(', ')}) [pk]`);
      }
      for (const ck of chavesExtras) {
        linhas.push(`    (${ck.join(', ')}) [unique]`);
      }
      linhas.push('  }');
    }

    linhas.push('}', '');
  }

  return linhas.join('\n').trimEnd() + '\n';
}

/** Gera PlantUML de classes consolidado (atributos + métodos circunscritos + relacionamentos) para o Visual Paradigm. */
export function renderDominioPuml(caso: string, modelo: DomainModel, metodosDoc?: Metodos): string {
  const metodosPorClasse = new Map<string, MetodoSpec[]>();
  for (const m of metodosDoc?.metodos ?? []) {
    const arr = metodosPorClasse.get(m.classe) ?? [];
    arr.push(m);
    metodosPorClasse.set(m.classe, arr);
  }

  const visSimbolo = (v: MetodoSpec['visibilidade']): string => {
    switch (v) {
      case 'private': return '-';
      case 'protected': return '#';
      case 'internal': return '~';
      default: return '+';
    }
  };

  const linhas: string[] = [
    '@startuml',
    `title Modelo de Domínio e Métodos Circunscritos — ${caso}`,
    'hide empty members',
    '',
  ];

  const classes = modelo.entities.filter((e: DomainEntity) => !e.abstract);
  for (const ent of classes) {
    linhas.push(`class ${ent.name} {`);
    for (const a of ent.attributes) {
      const estereotipos: string[] = [];
      if (a.primaryKey) estereotipos.push('PK');
      if (a.unique && !a.primaryKey) estereotipos.push('UK');
      if (a.foreignKey) estereotipos.push(`FK ${a.foreignKey.entity}.${a.foreignKey.attribute}`);
      const sufixo = estereotipos.length ? ` <<${estereotipos.join(', ')}>>` : '';
      const opcional = a.nullable ? '?' : '';
      linhas.push(`  +${a.name} : ${a.type}${opcional}${sufixo}`);
    }
    const ms = metodosPorClasse.get(ent.name) ?? [];
    if (ms.length) {
      linhas.push('  --');
      for (const m of ms) {
        linhas.push(`  ${visSimbolo(m.visibilidade)}${m.metodo}() : [${m.transacoes.join(', ')}]`);
      }
    }
    linhas.push('}', '');
  }

  for (const rel of modelo.relationships) {
    const [cardDe, cardPara] = rel.cardinality.split(':');
    const rotulo = rel.name ? ` : ${rel.name}` : '';
    linhas.push(`${rel.from} "${cardDe}" --> "${cardPara}" ${rel.to}${rotulo}`);
  }

  linhas.push('@enduml', '');
  return linhas.join('\n');
}

/** Gera spec.md consolidado para Aider / Spec Kit e agentes de codificação. */
export function renderSpecMd(p: CasoPaths, caso: string): string {
  const dic = lerDicionarioCaso(p.dicionario);
  const intencoes = lerTexto(p.intencoes).trim();
  const invariantes = lerTexto(p.invariantes).trim();
  const dominioMmd = lerTexto(p.dominio).trim();
  const casosTexto = lerTexto(p.casos).trim();
  const atividadesTexto = lerTexto(p.atividades).trim();
  const estadosTexto = lerTexto(p.estados).trim();
  const metodosTexto = lerTexto(p.metodos).trim();

  const modelo = lerModelo(dominioMmd);
  const classes = modelo.entities.filter(e => !e.abstract);
  const diagLinhas = classes.map(e => {
    const d = diagnosticarEntidade(e);
    return `- **${e.name}**: chaves ${d.chaves.map(k => `{${k.join(', ')}}`).join(' ')} — ${d.motivo}`;
  });

  const ucsLidos = lerCasos(casosTexto);
  const metLidos = lerMetodos(metodosTexto);
  const ativLidas = lerAtividades(atividadesTexto);
  const estLidos = lerEstados(estadosTexto);

  const rastreio = fs.existsSync(p.rastreabilidade)
    ? lerTexto(p.rastreabilidade).trim()
    : (metLidos.ok ? renderRastreabilidadeMd(caso, metLidos.metodos, ucsLidos.ok ? ucsLidos.casos : undefined, intencoes, invariantes, estadosTexto).trim() : '');

  const secoes: string[] = [
    `# Especificação Compilada (IDD Fase 0) — ${caso}`,
    '',
    '> Documento canônico determinístico gerado por `idd fase0 export` para consumo por humanos, Aider, Spec Kit e pipelines CI.',
    '> Nenhum termo, invariante, entidade, transação ou método entrou nesta especificação sem decisão humana registrada (Comando Epistêmico).',
    '',
    '## 1. Dicionário Ubíquo',
    '',
    '| Termo | Tipo | Definição | Aliases | Proibidos |',
    '| --- | --- | --- | --- | --- |',
    ...dic.terms.map(t =>
      `| **${t.term}** | \`${t.kind}\` | ${t.definition} | ${t.aliases.join(', ') || '—'} | ${t.forbidden.join(', ') || '—'} |`,
    ),
    '',
    '## 2. Intenções (EARS)',
    '',
    intencoes,
    '',
    '## 3. Invariantes de Domínio',
    '',
    invariantes,
    '',
    '## 4. Modelo Entidade-Relacionamento (BCNF / 3NF)',
    '',
    '```mermaid',
    dominioMmd,
    '```',
    '',
    '### Diagnóstico de Forma Normal (Fecho de Armstrong)',
    '',
    ...diagLinhas,
    '',
    '## 5. Casos de Uso e Transações de Negócio',
    '',
  ];

  if (ucsLidos.ok) {
    for (const uc of ucsLidos.casos.casos_de_uso) {
      secoes.push(`### ${uc.id} — ${uc.nome} (Ator: \`${uc.ator}\`${uc.intencoes.length ? ` · Intenções: ${uc.intencoes.join(', ')}` : ''})`, '');
      for (const tn of uc.transacoes) {
        secoes.push(`- **${tn.id} — ${tn.nome}**`);
        secoes.push(`  - **Pré-condições:** ${tn.pre.join(' · ')}`);
        secoes.push(`  - **Pós-condições:** ${tn.pos.join(' · ')}`);
        if (tn.invariantes.length) secoes.push(`  - **Invariantes:** ${tn.invariantes.join(', ')}`);
        if (tn.altera.length) secoes.push(`  - **Altera:** \`${tn.altera.join('`, `')}\``);
        if (tn.le.length) secoes.push(`  - **Lê:** \`${tn.le.join('`, `')}\``);
      }
      secoes.push('');
    }
  }

  if (ativLidas.ok) {
    secoes.push('## 6. Fluxos de Atividades', '');
    for (const f of ativLidas.atividades.atividades) {
      secoes.push(`### ${f.uc} — ${f.resumo}`, '');
      for (const s of f.passos) {
        const tnTag = s.transacao ? ` [\`${s.transacao}\`]` : '';
        secoes.push(`1. **${s.id}** (\`${s.raia}\`)${tnTag}: ${s.acao}`);
        if (s.guarda) secoes.push(`   - *Guarda:* ${s.guarda}`);
        if (s.senao) secoes.push(`   - *Senão:* ${s.senao}`);
      }
      secoes.push('');
    }
  }

  if (estLidos.ok) {
    secoes.push('## 7. Máquinas de Estado', '');
    for (const m of estLidos.estados.maquinas) {
      secoes.push(`### Classe \`${m.classe}\``, '');
      for (const e of m.estados) {
        secoes.push(`- **${e.nome}**: ${e.descricao}`);
      }
      secoes.push('');
      for (const tr of m.transicoes) {
        const g = tr.guarda ? ` [${tr.guarda}]` : '';
        const ef = tr.efeito ? ` / ${tr.efeito}` : '';
        secoes.push(`- \`${tr.de}\` → \`${tr.para}\` via **${tr.transacao}**${g}${ef}`);
      }
      secoes.push('');
    }
  }

  if (metLidos.ok) {
    secoes.push('## 8. Métodos Circunscritos e Contratos Comportamentais (v2)', '');
    for (const m of metLidos.metodos.metodos) {
      secoes.push(`### \`${m.classe}.${m.metodo}\` (\`${m.visibilidade}\`)`, '');
      secoes.push(`- **Intenção:** ${m.intencao}`);
      secoes.push(`- **Transações:** ${m.transacoes.join(', ')}`);
      if (m.invariantes.length) secoes.push(`- **Invariantes:** ${m.invariantes.join(', ')}`);
      secoes.push(`- **Mutação permitida (\`allowed_fields\`):** ${m.allowed_fields.length ? `\`${m.allowed_fields.join('`, `')}\`` : '*(nenhuma — consulta)*'}`);
      secoes.push(`- **Leitura (\`read_only_fields\`):** ${m.read_only_fields.length ? `\`${m.read_only_fields.join('`, `')}\`` : '*(nenhuma)*'}`);
      secoes.push(`- **Contrato v2:** \`contratos/${m.classe}.${m.metodo}.intent.yaml\``);
      secoes.push('');
    }
  }

  if (rastreio) {
    secoes.push('## 9. Matriz de Rastreabilidade', '', rastreio.replace(/^# [^\n]+\n+/, ''), '');
  }

  return secoes.join('\n').trimEnd() + '\n';
}

export interface ResultadoExportacao {
  arquivos: string[];
}

export function exportarCaso(root: string, caso: string, p: CasoPaths, opcoes?: { forcar?: boolean }): ResultadoExportacao {
  const g1 = avaliarGate1(p);
  const g2 = avaliarGate2(p);
  if (!opcoes?.forcar) {
    if (!g1.verde) throw new Error(`O Gate 1 de "${caso}" não está verde. Rode "idd fase0 gate1 ${caso}" ou use --forcar.`);
    if (!g2.verde) throw new Error(`O Gate 2 de "${caso}" não está verde. Rode "idd fase0 gate2 ${caso}" ou use --forcar.`);
  }

  const modelo = lerModelo(lerTexto(p.dominio));
  modelo.name = caso;
  const metLidos = fs.existsSync(p.metodos) ? lerMetodos(lerTexto(p.metodos)) : undefined;
  const ucsLidos = fs.existsSync(p.casos) ? lerCasos(lerTexto(p.casos)) : undefined;

  fs.mkdirSync(p.exportacoesDir, { recursive: true });

  fs.writeFileSync(p.dbml, renderDbml(caso, modelo), 'utf8');
  fs.writeFileSync(p.dominioPuml, renderDominioPuml(caso, modelo, metLidos && metLidos.ok ? metLidos.metodos : undefined), 'utf8');
  fs.writeFileSync(p.schemaSql, compileToSql(modelo), 'utf8');
  fs.writeFileSync(p.specMd, renderSpecMd(p, caso), 'utf8');

  if (metLidos && metLidos.ok) {
    const rastreioMd = renderRastreabilidadeMd(
      caso,
      metLidos.metodos,
      ucsLidos && ucsLidos.ok ? ucsLidos.casos : undefined,
      lerTexto(p.intencoes),
      lerTexto(p.invariantes),
      lerTexto(p.estados),
    );
    fs.writeFileSync(p.rastreabilidade, rastreioMd, 'utf8');
  }

  const rel = (f: string): string => path.relative(root, f) || f;
  return {
    arquivos: [rel(p.dbml), rel(p.dominioPuml), rel(p.schemaSql), rel(p.specMd), rel(p.rastreabilidade)],
  };
}
