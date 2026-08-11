// src/commands/domain.ts — Fase 5: Business Model Intent Layer
import * as fs   from 'node:fs';
import * as path from 'node:path';
import { findProjectRoot } from '../lib/store.ts';
import { parseDomainFile, parseMermaid, parseYamlDomain } from '../lib/domain/parser.ts';
import { normalizeModel, NormalizationReport } from '../lib/domain/normalizer.ts';
import { compile, compileToDomainYaml, compileToSql, compileToJsonSchema, compileToErDiagram } from '../lib/domain/compiler.ts';
import { diffDomainModels } from '../lib/domain/evolver.ts';
import { parseSqlMigration, verifySchema, formatVerificationComment, loadMigrationFiles } from '../lib/domain/verifier.ts';
import { DomainModel, NormalFormLevel } from '../lib/domain/types.ts';
import {
  header, footer, success, error, info, warn, row, table, spinner,
  BOLD, RESET, GRAY, CYAN, GREEN, RED, YELLOW, PURPLE,
} from '../lib/ui.ts';

// ── Helpers ───────────────────────────────────────────────────────

function findDomainFile(root: string, arg?: string): string | null {
  if (arg && fs.existsSync(arg)) return arg;
  const candidates = [
    path.join(root, 'domain.yaml'),
    path.join(root, 'domain.mmd'),
    path.join(root, 'domain.puml'),
    path.join(root, 'docs', 'domain.yaml'),
    path.join(root, 'docs', 'domain.mmd'),
    path.join(root, '.idd', 'domain.yaml'),
  ];
  return candidates.find(p => fs.existsSync(p)) ?? null;
}

function writeOutput(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

// ── idd domain parse ─────────────────────────────────────────────

async function domainParse(args: string[]): Promise<void> {
  const inputFile = args.find(a => !a.startsWith('--'));
  const outArg    = args.find(a => a.startsWith('--out='))?.split('=')[1];
  const root      = findProjectRoot() ?? process.cwd();

  header('domain parse');

  const file = inputFile ?? findDomainFile(root);
  if (!file) {
    error('Arquivo UML não encontrado. Forneça: idd domain parse <arquivo.mmd|.puml|.yaml>');
    info('Formatos suportados: Mermaid classDiagram (.mmd), PlantUML (.puml), YAML nativo (.yaml)');
    process.exit(1);
  }

  const spin = spinner(`Parseando ${path.basename(file)}...`);
  const model = parseDomainFile(file);
  spin.stop(true);

  console.log('');
  row('domínio',   model.name);
  row('fonte',     model.source);
  row('entidades', `${model.entities.length}`);
  row('relações',  `${model.relationships.length}`);
  row('enums',     `${Object.keys(model.enums).length}`);

  console.log(`\n  ${BOLD}Entidades detectadas:${RESET}`);
  model.entities.forEach(e => {
    const pkStr = e.primaryKey.join(', ');
    const relStr = e.relationships.length > 0 ? ` → [${e.relationships.map(r=>r.to).join(', ')}]` : '';
    console.log(`  ${CYAN}${e.name}${RESET} (${e.tableName}) pk:{${pkStr}}${relStr}`);
    console.log(`    ${GRAY}${e.attributes.length} atributos · ${e.functionalDeps.length} dependências funcionais${RESET}`);
  });

  if (outArg) {
    const outYaml = path.join(root, '.idd', 'domain.intent.yaml');
    writeOutput(outArg ?? outYaml, JSON.stringify(model, null, 2));
    success(`AST salvo em: ${outArg ?? outYaml}`);
  }

  footer('"idd domain compile" → gera YAML + JSONB + SQL\n  "idd domain normalize" → verifica formas normais');
}

// ── idd domain normalize ──────────────────────────────────────────

async function domainNormalize(args: string[]): Promise<void> {
  const inputFile  = args.find(a => !a.startsWith('--'));
  const targetArg  = args.find(a => a.startsWith('--target='))?.split('=')[1] as NormalFormLevel ?? '3NF';
  const root       = findProjectRoot() ?? process.cwd();

  header('domain normalize');

  const file = inputFile ?? findDomainFile(root);
  if (!file) { error('Arquivo de domínio não encontrado.'); process.exit(1); }

  const model = parseDomainFile(file);
  const result = normalizeModel(model, targetArg);

  console.log('');
  row('modelo', model.name);
  row('alvo',   targetArg);
  row('conformidade', result.conforming
    ? `${GREEN}✓ Sim${RESET}`
    : `${RED}✗ Não${RESET}`
  );

  console.log('');
  table(
    ['entidade', 'maior NF', 'ok', 'violações'],
    result.reports.map((r: NormalizationReport) => [
      r.entity,
      r.highestNF,
      r.passed.join(', ') || '—',
      r.violations.length > 0
        ? `${RED}${r.violations.length}${RESET}`
        : `${GREEN}0${RESET}`,
    ])
  );

  if (result.allViolations.length > 0) {
    console.log(`\n  ${BOLD}Violações encontradas (${result.allViolations.length}):${RESET}\n`);
    for (const v of result.allViolations) {
      const color = v.form === '1NF' || v.form === '2NF' ? RED : YELLOW;
      console.log(`  ${color}${BOLD}[${v.form}]${RESET} ${v.entity}${v.attribute ? `.${v.attribute}` : ''}`);
      console.log(`    ${v.message}`);
      console.log(`    ${GRAY}💡 ${v.suggestion}${RESET}`);
      console.log('');
    }
  }

  console.log(`  ${result.summary}`);
  footer(`"idd domain normalize --target=BCNF" → forma mais restritiva`);

  if (!result.conforming) process.exit(1);
}

// ── idd domain compile ────────────────────────────────────────────

async function domainCompile(args: string[]): Promise<void> {
  const inputFile = args.find(a => !a.startsWith('--'));
  const outDir    = args.find(a => a.startsWith('--out='))?.split('=')[1] ?? '.idd/domain';
  const formats   = args.find(a => a.startsWith('--format='))?.split('=')[1]?.split(',')
    ?? ['yaml','jsonb','sql','er'];
  const root      = findProjectRoot() ?? process.cwd();

  header('domain compile');

  const file = inputFile ?? findDomainFile(root);
  if (!file) { error('Arquivo de domínio não encontrado.'); process.exit(1); }

  const spin = spinner('Compilando modelo de domínio...');
  const model = parseDomainFile(file);
  const result = compile(model);
  spin.stop(true);

  console.log('');
  const absOut = path.isAbsolute(outDir) ? outDir : path.join(root, outDir);
  fs.mkdirSync(absOut, { recursive: true });

  const outputs: Array<{ format: string; file: string; content: string }> = [
    { format: 'yaml',  file: 'domain.intent.yaml', content: result.domainYaml },
    { format: 'jsonb', file: 'schema.jsonb.json',  content: result.jsonbSchema },
    { format: 'sql',   file: 'schema.sql',          content: result.sql },
    { format: 'er',    file: 'er-diagram.md',       content: result.erDiagram },
  ];

  for (const o of outputs) {
    if (!formats.includes(o.format)) continue;
    const outPath = path.join(absOut, o.file);
    writeOutput(outPath, o.content);
    success(`${o.file} → ${outPath}`);
  }

  console.log('');
  row('entidades',   `${model.entities.length}`);
  row('relações',    `${model.relationships.length}`);
  row('tabelas SQL', `${model.entities.filter(e=>!e.abstract).length}`);
  row('diretório',   absOut);

  footer([
    '"idd domain verify" → verifica conformidade com migrations',
    '"idd domain normalize" → analisa formas normais',
  ].join('\n  '));
}

// ── idd domain verify ─────────────────────────────────────────────

async function domainVerify(args: string[]): Promise<void> {
  const domainFileArg = args.find(a => !a.startsWith('--'));
  const migrDir       = args.find(a => a.startsWith('--migrations='))?.split('=')[1];
  const outArg        = args.find(a => a.startsWith('--out='))?.split('=')[1];
  const ciMode        = args.includes('--ci');
  const root          = findProjectRoot() ?? process.cwd();

  if (!ciMode) header('domain verify');

  // Load domain model
  const domainPath = domainFileArg ?? path.join(root, '.idd', 'domain', 'domain.intent.yaml');
  if (!fs.existsSync(domainPath)) {
    error(`Domain model não encontrado: ${domainPath}`);
    info('Execute "idd domain compile" primeiro para gerar o domain.intent.yaml.');
    process.exit(1);
  }

  const yaml = await import('js-yaml');
  let model: DomainModel;
  try {
    const raw = yaml.load(fs.readFileSync(domainPath, 'utf8')) as any;
    // Re-parse as domain YAML
    model = parseYamlDomain(fs.readFileSync(domainPath, 'utf8'));
    // Merge name/version from compiled model
    model.name    = raw.domain ?? model.name;
    model.version = raw.version ?? model.version;
  } catch (e: any) {
    error(`Erro ao carregar domain model: ${e.message}`); process.exit(1);
  }

  // Load SQL migrations
  const migrationDirs = [
    migrDir,
    path.join(root, 'migrations'),
    path.join(root, 'db', 'migrations'),
    path.join(root, 'prisma', 'migrations'),
    path.join(root, 'database', 'migrations'),
    path.join(root, '.idd', 'domain'),  // compiled schema.sql
  ].filter(Boolean) as string[];

  let sqlContent = '';
  for (const dir of migrationDirs) {
    const content = loadMigrationFiles(dir);
    if (content) { sqlContent += content + '\n'; break; }
  }

  // Also look for single schema.sql
  const schemaSqlPath = path.join(root, '.idd', 'domain', 'schema.sql');
  if (!sqlContent && fs.existsSync(schemaSqlPath)) {
    sqlContent = fs.readFileSync(schemaSqlPath, 'utf8');
  }

  if (!sqlContent) {
    warn('Nenhum arquivo SQL de migration encontrado.');
    info('Esperado em: migrations/, db/migrations/, .idd/domain/schema.sql');
    info('Execute "idd domain compile --format=sql" para gerar o schema.');
    process.exit(0);
  }

  const spin = spinner('Verificando conformidade...');
  const dbSchema = parseSqlMigration(sqlContent);
  const results  = verifySchema(model, dbSchema);
  spin.stop(true);

  const comment = formatVerificationComment(model, results);

  if (ciMode || outArg) {
    if (outArg) { writeOutput(outArg, comment); }
    else        { console.log(comment); }
  } else {
    console.log('');
    table(
      ['entidade', 'tabela', 'score', 'faltando', 'tipo ≠'],
      results.map(r => {
        const ent = model.entities.find(e => e.name === r.entity);
        const score = r.tableFound ? r.score : 0;
        const color = score === 100 ? GREEN : score >= 80 ? YELLOW : RED;
        return [
          r.entity,
          ent?.tableName ?? '?',
          `${color}${score}%${RESET}`,
          `${r.missingCols.length}`,
          `${r.typeMismatch.length}`,
        ];
      })
    );

    const failed = results.filter(r => r.score < 100);
    if (failed.length > 0) {
      console.log(`\n  ${BOLD}Divergências:${RESET}\n`);
      for (const r of failed) {
        console.log(`  ${RED}${BOLD}${r.entity}${RESET}`);
        r.missingCols.slice(0,3).forEach(c => console.log(`    ${RED}✗${RESET} coluna "${c}" ausente no schema`));
        r.typeMismatch.slice(0,3).forEach(t => console.log(`    ${YELLOW}⚠${RESET} "${t.col}": esperado ${t.expected}, encontrado ${t.actual}`));
        r.violations.slice(0,3).forEach(v => console.log(`    ${YELLOW}⚠${RESET} ${v}`));
      }
    }

    const allOk = results.every(r => r.score === 100);
    console.log('');
    console.log(`  ${allOk ? GREEN+'✓ Schema 100% conforme'+RESET : RED+'✗ Divergências encontradas'+RESET}`);

    footer([
      '"idd domain verify --migrations=./db"   → diretório customizado',
      '"idd domain verify --out=verify.md --ci" → modo CI/CD',
    ].join('\n  '));
  }

  const hasBlocking = results.some(r => !r.tableFound || r.score < 60);
  if (hasBlocking) process.exit(1);
}

// ── idd domain init ───────────────────────────────────────────────

async function domainInit(args: string[]): Promise<void> {
  const root = findProjectRoot() ?? process.cwd();
  header('domain init');

  const domainDir = path.join(root, '.idd', 'domain');
  const docsDir   = path.join(root, 'docs');
  fs.mkdirSync(domainDir, { recursive: true });
  fs.mkdirSync(docsDir,   { recursive: true });

  const EXAMPLE_MERMAID = `classDiagram
  %% title: MeuDominio
  %% Edite este arquivo e execute: idd domain compile

  class User {
    +uuid id PK
    +string email UK "Email único do usuário"
    +string password_hash "Nunca expor em APIs"
    +string name
    +boolean active "DEFAULT true"
    +timestamp created_at
    +timestamp updated_at
  }

  class Session {
    +uuid id PK
    +uuid user_id FK(User.id)
    +string token UK "JWT token"
    +timestamp expires_at
    +timestamp created_at
  }

  class Role {
    +uuid id PK
    +string name UK
    +string description?
  }

  User "1" --> "N" Session : has
  User "N" --> "M" Role : has_roles
`;

  const domainYamlPath = path.join(root, 'domain.mmd');
  const workflowPath   = path.join(root, '.github', 'workflows', 'idd-domain-verify.yml');

  if (!fs.existsSync(domainYamlPath)) {
    fs.writeFileSync(domainYamlPath, EXAMPLE_MERMAID, 'utf8');
    success(`domain.mmd criado — edite com seu modelo de classes`);
  } else {
    info(`domain.mmd já existe — mantendo`);
  }

  // GitHub Actions workflow
  fs.mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
  if (!fs.existsSync(workflowPath)) {
    const workflowContent = `name: IDD Domain Verify
on:
  pull_request:
    paths:
      - 'migrations/**'
      - 'db/migrations/**'
      - 'domain.mmd'
      - 'domain.yaml'

jobs:
  verify:
    name: Verifica conformidade schema vs Domain Model
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          cache-dependency-path: cli/package-lock.json
      - name: Instalar IDD CLI
        run: |
          cd cli && npm ci --ignore-scripts
          npx esbuild src/index.ts --bundle --platform=node \\
            --target=node20 --format=esm --outfile=dist/index.js \\
            --external:better-sqlite3
          npm link
      - name: Compilar domain model
        run: idd domain compile
      - name: Verificar conformidade
        id: verify
        run: idd domain verify --ci --out=/tmp/domain-report.md || true
      - name: Postar comentário no PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const body = fs.readFileSync('/tmp/domain-report.md', 'utf8');
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner, repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
            });
            const existing = comments.find(c =>
              c.body?.startsWith('## \u29c6 IDD Domain Verify') && c.user?.type === 'Bot'
            );
            const params = { owner: context.repo.owner, repo: context.repo.repo, body };
            if (existing) {
              await github.rest.issues.updateComment({ ...params, comment_id: existing.id });
            } else {
              await github.rest.issues.createComment({
                ...params, issue_number: context.payload.pull_request.number
              });
            }
`;
    fs.writeFileSync(workflowPath, workflowContent, 'utf8');
    success(`.github/workflows/idd-domain-verify.yml criado`);
  }

  console.log('');
  info('Próximos passos:');
  console.log(`    1. Edite ${CYAN}domain.mmd${RESET} com seu modelo de classes`);
  console.log(`    2. Execute ${CYAN}idd domain parse domain.mmd${RESET} para validar o parse`);
  console.log(`    3. Execute ${CYAN}idd domain normalize${RESET} para verificar formas normais`);
  console.log(`    4. Execute ${CYAN}idd domain compile${RESET} para gerar YAML + JSONB + SQL`);
  console.log(`    5. Execute ${CYAN}idd domain verify${RESET} para comparar com suas migrations`);

  footer('');
}

// ── idd domain help ───────────────────────────────────────────────

function domainHelp(): void {
  header('domain — Business Model Intent Layer');
  console.log('');
  console.log(`  ${CYAN}idd domain init${RESET}`);
  console.log(`    Cria domain.mmd de exemplo e o workflow de CI de verificação.`);
  console.log('');
  console.log(`  ${CYAN}idd domain parse <arquivo.mmd|.puml|.yaml>${RESET}`);
  console.log(`    Parseia UML em Domain Model AST. Suporta Mermaid, PlantUML, YAML nativo.`);
  console.log('');
  console.log(`  ${CYAN}idd domain normalize [--target=3NF|BCNF|4NF|5NF|DKNF]${RESET}`);
  console.log(`    Verifica formas normais 1NF→DKNF com sugestões de decomposição.`);
  console.log('');
  console.log(`  ${CYAN}idd domain compile [--format=yaml,jsonb,sql,er] [--out=dir]${RESET}`);
  console.log(`    Gera: domain.intent.yaml · schema.jsonb.json · schema.sql · er-diagram.md`);
  console.log('');
  console.log(`  ${CYAN}idd domain verify [--migrations=./migrations] [--out=report.md] [--ci]${RESET}`);
  console.log(`    Compara schema real (migrations SQL) vs Domain Model Intent.`);
  footer('');
}


// ── idd domain evolve ─────────────────────────────────────────────

async function domainEvolve(args: string[]): Promise<void> {
  const v1File = args[0];
  const v2File = args[1];
  const outArg = args.find(a => a.startsWith('--out='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');
  const root   = findProjectRoot() ?? process.cwd();

  header('domain evolve');

  if (!v1File || !v2File) {
    error('Uso: idd domain evolve <v1.mmd> <v2.mmd> [--out=migration.sql]');
    info('Compara dois snapshots do domain model e gera SQL de migração.');
    process.exit(1);
  }

  const spin = spinner('Comparando modelos...');
  const v1   = parseDomainFile(v1File);
  const v2   = parseDomainFile(v2File);
  const evo  = diffDomainModels(v1, v2);
  spin.stop(true);

  console.log('');
  row('versão origem', v1.version);
  row('versão destino', v2.version);
  row('mudanças safe',    `${GREEN}${evo.safeCount}${RESET}`);
  row('mudanças warn',    evo.warnCount > 0  ? `${YELLOW}${evo.warnCount}${RESET}`  : `${GREEN}0${RESET}`);
  row('mudanças breaking',evo.breakCount > 0 ? `${RED}${evo.breakCount}${RESET}`    : `${GREEN}0${RESET}`);
  row('requer downtime',  evo.requiresDowntime ? `${RED}Sim${RESET}` : `${GREEN}Não${RESET}`);

  if (evo.diffs.length === 0) {
    console.log(`\n  ${GREEN}✓ Nenhuma diferença estrutural encontrada.${RESET}\n`);
    footer('');
    return;
  }

  console.log('');
  for (const diff of evo.diffs) {
    const icon = diff.type === 'added'    ? `${GREEN}+${RESET}` :
                 diff.type === 'removed'  ? `${RED}-${RESET}`   : `${YELLOW}~${RESET}`;
    console.log(`  ${icon} ${BOLD}${diff.entity}${RESET} (${diff.table})`);
    diff.changes.forEach(c => {
      const c_icon = c.severity === 'breaking' ? RED : c.severity === 'warn' ? YELLOW : GREEN;
      console.log(`    ${c_icon}${c.type}${RESET}  ${c.attribute ?? ''}`);
    });
    diff.warnings.forEach(w => console.log(`    ${GRAY}⚠ ${w}${RESET}`));
  }

  if (!dryRun) {
    const outPath = outArg ?? path.join(root, '.idd', 'domain', 'evolution.sql');
    if (outArg || true) {
      writeOutput(outPath, evo.sql);
      console.log('');
      success(`Migração gerada: ${outPath}`);
    }
  } else {
    console.log('\n' + evo.sql.split('\n').map(l => '  ' + l).join('\n'));
  }

  footer([
    '"idd domain evolve v1.mmd v2.mmd --dry-run"      → mostrar SQL sem salvar',
    '"idd domain evolve v1.mmd v2.mmd --out=migr.sql"  → salvar em arquivo específico',
  ].join('\n  '));
}


// ── Router ────────────────────────────────────────────────────────

export async function cmdDomain(args: string[]): Promise<void> {
  switch (args[0]) {
    case 'init':      return domainInit(args.slice(1));
    case 'parse':     return domainParse(args.slice(1));
    case 'normalize': return domainNormalize(args.slice(1));
    case 'compile':   return domainCompile(args.slice(1));
    case 'verify':    return domainVerify(args.slice(1));
    case 'evolve':   return domainEvolve(args.slice(1));
    default:          return domainHelp();
  }
}
