// src/commands/api.ts — Issue #25: idd api
import * as fs   from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { findProjectRoot } from '../lib/store.ts';
import {
  generateEndpoint, buildOpenApiSpec, specToYaml, specToJson,
  type IntentYaml, type OpenApiOperation,
} from '../lib/openapi.ts';
import {
  header, footer, success, error, info, warn, row, table, spinner,
  BOLD, RESET, GRAY, CYAN, GREEN, RED, YELLOW,
} from '../lib/ui.ts';

function findAllIntents(root: string): Array<{ path: string; intent: IntentYaml }> {
  const results: Array<{ path: string; intent: IntentYaml }> = [];
  const seen = new Set<string>();
  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !['node_modules','.git','dist','out'].includes(entry.name)) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.intent.yaml')) {
        if (seen.has(full)) continue; // evita duplicatas quando src/ é percorrido mais de uma vez
        seen.add(full);
        try {
          const parsed = yaml.load(fs.readFileSync(full, 'utf8')) as IntentYaml;
          if (parsed?.intent && parsed?.module) results.push({ path: full, intent: parsed });
        } catch { /* skip */ }
      }
    }
  }
  walk(path.join(root, 'src')); walk(root);
  return results;
}

function loadJsonbSchemas(root: string): Record<string, object> {
  const p = path.join(root, '.idd', 'domain', 'schema.jsonb.json');
  if (!fs.existsSync(p)) return {};
  try { return (JSON.parse(fs.readFileSync(p, 'utf8')) as any).$defs ?? {}; } catch { return {}; }
}

async function apiGenerate(args: string[]): Promise<void> {
  const target = args.find(a => !a.startsWith('--'));
  const outArg = args.find(a => a.startsWith('--out='))?.split('=')[1];
  const fmt    = args.find(a => a.startsWith('--format='))?.split('=')[1] ?? 'yaml';
  const root   = findProjectRoot() ?? process.cwd();
  header('api generate');
  if (!target) { error('Uso: idd api generate <mod/sub>'); process.exit(1); }
  const [mod, sub] = target.split('/');
  const candidates = [path.join(root,'src',mod,`${sub}.intent.yaml`), path.join(root,mod,`${sub}.intent.yaml`)];
  const yamlPath = candidates.find(p => fs.existsSync(p));
  if (!yamlPath) { error(`Intenção "${target}" não encontrada.`); process.exit(1); }
  const intent   = yaml.load(fs.readFileSync(yamlPath,'utf8')) as IntentYaml;
  const schemas  = loadJsonbSchemas(root);
  const endpoint = generateEndpoint(intent, schemas);
  const spec     = buildOpenApiSpec(path.basename(root), intent.version ?? '0.0.1', [endpoint], schemas);
  const output   = fmt === 'json' ? specToJson(spec) : specToYaml(spec);
  if (outArg) {
    const outPath = path.isAbsolute(outArg) ? outArg : path.join(root, outArg);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, output, 'utf8');
    console.log('');
    success(`OpenAPI gerado: ${outPath}`);
    row('método', endpoint.method.toUpperCase()); row('path', endpoint.path);
    row('responses', Object.keys(endpoint.operation.responses).join(', '));
  } else { console.log(output); }
  footer('"idd api build" → agrega todos os endpoints');
}

async function apiBuild(args: string[]): Promise<void> {
  const outArg = args.find(a => a.startsWith('--out='))?.split('=')[1] ?? '.idd/api/openapi.yaml';
  const fmt    = args.find(a => a.startsWith('--format='))?.split('=')[1] ?? 'yaml';
  const root   = findProjectRoot() ?? process.cwd();
  header('api build');
  const spin    = spinner('Carregando intenções...');
  const intents = findAllIntents(root);
  spin.stop(true);
  if (intents.length === 0) { warn('Nenhum .intent.yaml encontrado.'); footer(''); return; }
  const schemas   = loadJsonbSchemas(root);
  const endpoints = intents.map(({ intent }) => generateEndpoint(intent, schemas));
  const spec      = buildOpenApiSpec(path.basename(root), '1.0.0', endpoints, schemas);
  const output    = fmt === 'json' ? specToJson(spec) : specToYaml(spec);
  const outPath   = path.isAbsolute(outArg) ? outArg : path.join(root, outArg);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, output, 'utf8');
  console.log('');
  success(`openapi.yaml: ${outPath}`);
  row('endpoints', `${endpoints.length}`);
  row('tags', [...new Set(endpoints.flatMap(e => e.operation.tags))].join(', '));
  console.log('');
  table(['método','path','operationId'], endpoints.map(e => [
    `${CYAN}${e.method.toUpperCase()}${RESET}`, e.path, `${GRAY}${e.operation.operationId}${RESET}`
  ]));
  footer('"idd api verify" → verifica spec vs intenções atuais');
}

async function apiVerify(args: string[]): Promise<void> {
  const specArg = args.find(a => a.startsWith('--spec='))?.split('=')[1] ?? '.idd/api/openapi.yaml';
  const root    = findProjectRoot() ?? process.cwd();
  header('api verify');
  const specPath = path.isAbsolute(specArg) ? specArg : path.join(root, specArg);
  if (!fs.existsSync(specPath)) { error(`Spec não encontrada: ${specPath}`); info('Execute "idd api build" primeiro.'); process.exit(1); }
  const spec    = yaml.load(fs.readFileSync(specPath,'utf8')) as any;
  const intents = findAllIntents(root);
  if (intents.length === 0) { warn('Nenhuma intenção encontrada.'); footer(''); return; }
  const violations: Array<{ module: string; issue: string }> = [];
  let   aligned = 0;
  console.log('');
  for (const { intent } of intents) {
    const ep = generateEndpoint(intent);
    const pe = spec.paths?.[ep.path]?.[ep.method];
    if (!pe) {
      violations.push({ module: intent.module, issue: `${ep.method.toUpperCase()} ${ep.path} não na spec` });
    } else {
      const missing = Object.keys(ep.operation.responses).filter(c => !Object.keys(pe.responses ?? {}).includes(c) && c !== '500');
      if (missing.length > 0) violations.push({ module: intent.module, issue: `Respostas faltando: ${missing.join(', ')}` });
      else aligned++;
    }
  }
  if (violations.length === 0) {
    console.log(`  ${GREEN}✓ Spec alinhada (${aligned} endpoints).${RESET}\n`);
  } else {
    table(['módulo','problema'], violations.map(v => [v.module, `${YELLOW}${v.issue}${RESET}`]));
    console.log(''); warn(`${violations.length} divergência(s). Execute "idd api build" para regenerar.`);
    process.exit(1);
  }
  footer('"idd api build" → regenerar spec');
}

export async function cmdApi(args: string[]): Promise<void> {
  switch (args[0]) {
    case 'generate': return apiGenerate(args.slice(1));
    case 'build':    return apiBuild(args.slice(1));
    case 'verify':   return apiVerify(args.slice(1));
    default:
      header('api — OpenAPI 3.1 a partir de intenções');
      console.log(`\n  ${CYAN}idd api generate <mod/sub> [--out=file] [--format=yaml|json]${RESET}`);
      console.log(`  ${CYAN}idd api build [--out=file] [--format=yaml|json]${RESET}`);
      console.log(`  ${CYAN}idd api verify [--spec=file]${RESET}`);
      footer('');
  }
}
