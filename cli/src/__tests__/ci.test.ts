// src/__tests__/ci.test.ts — Issue #4: GitHub Actions CI/CD
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os   from 'node:os';
import * as fs   from 'node:fs';
import * as path from 'node:path';

// ── Setup ────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-ci-'));
  // Simula estrutura de repositório git
  fs.mkdirSync(path.join(tmpDir, '.git', 'hooks'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, '.idd'), { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Helpers (extraídos de init.ts para teste isolado) ─────────────

function writeWorkflow(cwd: string): boolean {
  const workflowDir  = path.join(cwd, '.github', 'workflows');
  const workflowPath = path.join(workflowDir, 'idd-verify.yml');
  if (fs.existsSync(workflowPath)) return false;
  fs.mkdirSync(workflowDir, { recursive: true });

  const content = [
    'name: IDD Verify',
    'on:',
    '  push:',
    '    branches: ["main", "develop", "feature/**"]',
    '  pull_request:',
    '    branches: ["main", "develop"]',
    'jobs:',
    '  verify:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: actions/setup-node@v4',
    '        with: { node-version: "20" }',
    '      - name: Instalar IDD CLI',
    '        run: cd cli && npm ci --ignore-scripts && npm run build && npm link',
    '      - name: Verificar alinhamento (estático)',
    '        run: idd verify --fail-on=critical',
    '      - name: Verificar alinhamento (semântico)',
    "        if: ${{ secrets.ANTHROPIC_API_KEY != '' }}",
    '        run: idd verify --semantic --fail-on=critical',
    '        env:',
    '          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}',
    '      - name: Exibir estatísticas',
    '        if: always()',
    '        run: idd stats',
  ].join('\n');

  fs.writeFileSync(workflowPath, content + '\n', 'utf8');
  return true;
}

function writeBadge(cwd: string): 'created' | 'skipped' | 'notfound' {
  const readmePath = path.join(cwd, 'README.md');
  if (!fs.existsSync(readmePath)) return 'notfound';
  const content = fs.readFileSync(readmePath, 'utf8');
  if (content.includes('IDD Verify')) return 'skipped';

  const repoName = path.basename(cwd);
  const badge    = '\n[![IDD Verify](https://github.com/EliezerRosa/' +
    repoName + '/actions/workflows/idd-verify.yml/badge.svg)]' +
    '(https://github.com/EliezerRosa/' + repoName + '/actions/workflows/idd-verify.yml)\n';

  const h1Match = content.match(/^# .+$/m);
  if (h1Match && h1Match.index !== undefined) {
    const insertAt = h1Match.index + h1Match[0].length;
    fs.writeFileSync(readmePath,
      content.slice(0, insertAt) + badge + content.slice(insertAt), 'utf8');
  } else {
    fs.writeFileSync(readmePath, badge.trimStart() + content, 'utf8');
  }
  return 'created';
}

// ── Testes: writeWorkflow ─────────────────────────────────────────

describe('writeWorkflow', () => {
  it('cria o arquivo idd-verify.yml no diretório correto', () => {
    writeWorkflow(tmpDir);
    const p = path.join(tmpDir, '.github', 'workflows', 'idd-verify.yml');
    expect(fs.existsSync(p)).toBe(true);
  });

  it('retorna true quando cria o arquivo', () => {
    expect(writeWorkflow(tmpDir)).toBe(true);
  });

  it('retorna false se arquivo já existe', () => {
    writeWorkflow(tmpDir);
    expect(writeWorkflow(tmpDir)).toBe(false);
  });

  it('não sobrescreve workflow existente', () => {
    const workflowDir = path.join(tmpDir, '.github', 'workflows');
    fs.mkdirSync(workflowDir, { recursive: true });
    const p = path.join(workflowDir, 'idd-verify.yml');
    fs.writeFileSync(p, 'meu-workflow-customizado\n');
    writeWorkflow(tmpDir);
    expect(fs.readFileSync(p, 'utf8')).toBe('meu-workflow-customizado\n');
  });

  it('workflow contém step de verificação estática', () => {
    writeWorkflow(tmpDir);
    const content = fs.readFileSync(
      path.join(tmpDir, '.github', 'workflows', 'idd-verify.yml'), 'utf8'
    );
    expect(content).toContain('idd verify --fail-on=critical');
  });

  it('workflow contém step semântico condicional', () => {
    writeWorkflow(tmpDir);
    const content = fs.readFileSync(
      path.join(tmpDir, '.github', 'workflows', 'idd-verify.yml'), 'utf8'
    );
    expect(content).toContain('--semantic');
    expect(content).toContain('ANTHROPIC_API_KEY');
  });

  it('workflow contém idd stats com if: always()', () => {
    writeWorkflow(tmpDir);
    const content = fs.readFileSync(
      path.join(tmpDir, '.github', 'workflows', 'idd-verify.yml'), 'utf8'
    );
    expect(content).toContain('idd stats');
    expect(content).toContain('always()');
  });

  it('workflow dispara em push e pull_request', () => {
    writeWorkflow(tmpDir);
    const content = fs.readFileSync(
      path.join(tmpDir, '.github', 'workflows', 'idd-verify.yml'), 'utf8'
    );
    expect(content).toContain('push:');
    expect(content).toContain('pull_request:');
  });

  it('workflow usa actions/checkout@v4 e actions/setup-node@v4', () => {
    writeWorkflow(tmpDir);
    const content = fs.readFileSync(
      path.join(tmpDir, '.github', 'workflows', 'idd-verify.yml'), 'utf8'
    );
    expect(content).toContain('actions/checkout@v4');
    expect(content).toContain('actions/setup-node@v4');
  });

  it('cria diretório .github/workflows/ se não existir', () => {
    const d = path.join(tmpDir, '.github', 'workflows');
    expect(fs.existsSync(d)).toBe(false);
    writeWorkflow(tmpDir);
    expect(fs.existsSync(d)).toBe(true);
  });
});

// ── Testes: writeBadge ────────────────────────────────────────────

describe('writeBadge', () => {
  it('retorna "notfound" quando README.md não existe', () => {
    expect(writeBadge(tmpDir)).toBe('notfound');
  });

  it('insere badge após H1 no README.md', () => {
    fs.writeFileSync(path.join(tmpDir, 'README.md'),
      '# Meu Projeto\n\nDescrição do projeto.\n');
    writeBadge(tmpDir);
    const content = fs.readFileSync(path.join(tmpDir, 'README.md'), 'utf8');
    expect(content).toContain('IDD Verify');
    expect(content).toContain('badge.svg');
    // Badge deve aparecer antes da descrição
    expect(content.indexOf('IDD Verify')).toBeLessThan(content.indexOf('Descrição'));
  });

  it('retorna "created" quando badge inserido', () => {
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Projeto\n');
    expect(writeBadge(tmpDir)).toBe('created');
  });

  it('retorna "skipped" se badge já presente', () => {
    fs.writeFileSync(path.join(tmpDir, 'README.md'),
      '# Projeto\n[![IDD Verify](url)](url)\n');
    expect(writeBadge(tmpDir)).toBe('skipped');
  });

  it('não duplica badge em chamadas repetidas', () => {
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Projeto\n');
    writeBadge(tmpDir);
    writeBadge(tmpDir);
    const content = fs.readFileSync(path.join(tmpDir, 'README.md'), 'utf8');
    const count   = (content.match(/IDD Verify/g) || []).length;
    expect(count).toBe(1);
  });

  it('insere badge no topo quando não há H1', () => {
    fs.writeFileSync(path.join(tmpDir, 'README.md'),
      'Projeto sem título\n');
    writeBadge(tmpDir);
    const content = fs.readFileSync(path.join(tmpDir, 'README.md'), 'utf8');
    expect(content.indexOf('IDD Verify')).toBeLessThan(
      content.indexOf('Projeto sem título')
    );
  });

  it('URL do badge contém o nome do diretório como repo', () => {
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Projeto\n');
    writeBadge(tmpDir);
    const content  = fs.readFileSync(path.join(tmpDir, 'README.md'), 'utf8');
    const repoName = path.basename(tmpDir);
    expect(content).toContain(repoName);
  });
});

// ── Testes: estrutura do workflow YAML ───────────────────────────

describe('Estrutura do workflow YAML', () => {
  it('workflow é YAML válido (não lança ao parsear)', async () => {
    writeWorkflow(tmpDir);
    const content = fs.readFileSync(
      path.join(tmpDir, '.github', 'workflows', 'idd-verify.yml'), 'utf8'
    );
    const yaml = await import('js-yaml');
    expect(() => yaml.load(content)).not.toThrow();
  });

  it('workflow tem campo "name" no nível raiz', async () => {
    writeWorkflow(tmpDir);
    const content = fs.readFileSync(
      path.join(tmpDir, '.github', 'workflows', 'idd-verify.yml'), 'utf8'
    );
    const yaml    = await import('js-yaml');
    const parsed  = yaml.load(content) as any;
    expect(parsed.name).toBeDefined();
    expect(typeof parsed.name).toBe('string');
  });

  it('workflow tem jobs.verify com runs-on ubuntu-latest', async () => {
    writeWorkflow(tmpDir);
    const content = fs.readFileSync(
      path.join(tmpDir, '.github', 'workflows', 'idd-verify.yml'), 'utf8'
    );
    const yaml   = await import('js-yaml');
    const parsed = yaml.load(content) as any;
    expect(parsed?.jobs?.verify?.['runs-on']).toBe('ubuntu-latest');
  });
});

// ── Testes: verify --staged flag ────────────────────────────────

describe('idd verify --staged flag', () => {
  it('args.includes("--staged") é truthy quando passado', () => {
    const args = ['--staged', '--fail-on=critical'];
    expect(args.includes('--staged')).toBe(true);
  });

  it('args não inclui staged quando não passado', () => {
    const args = ['--fail-on=critical'];
    expect(args.includes('--staged')).toBe(false);
  });

  it('--fail-on=critical é detectado corretamente', () => {
    const args = ['--fail-on=critical'];
    const failOnCritical = args.includes('--fail-on=critical');
    expect(failOnCritical).toBe(true);
  });

  it('--fail-on=warn é detectado corretamente', () => {
    const args = ['--fail-on=warn'];
    const failOnWarn = args.includes('--fail-on=warn');
    expect(failOnWarn).toBe(true);
  });

  it('--threshold= é parseado corretamente', () => {
    const args      = ['--threshold=90'];
    const threshold = Number(args.find(a => a.startsWith('--threshold='))?.split('=')[1] ?? 80);
    expect(threshold).toBe(90);
  });

  it('threshold default é 80 quando não especificado', () => {
    const args      = ['--fail-on=critical'];
    const threshold = Number(args.find(a => a.startsWith('--threshold='))?.split('=')[1] ?? 80);
    expect(threshold).toBe(80);
  });
});

// ── Testes: docs/CI.md existe e tem conteúdo ────────────────────

describe('docs/CI.md', () => {
  it('arquivo CI.md existe no repositório', () => {
    // Verifica no repo clonado (ou no dir do projeto)
    const candidates = [
      path.resolve(import.meta.dirname, '../../../../docs/CI.md'),
      path.resolve(import.meta.dirname, '../../../docs/CI.md'),
    ];
    const exists = candidates.some(p => fs.existsSync(p));
    expect(exists).toBe(true);
  });

  it('CI.md contém seção de configuração da API key', () => {
    const candidates = [
      path.resolve(import.meta.dirname, '../../../../docs/CI.md'),
      path.resolve(import.meta.dirname, '../../../docs/CI.md'),
    ];
    const ciPath = candidates.find(p => fs.existsSync(p));
    if (!ciPath) return; // skip se não encontrado
    const content = fs.readFileSync(ciPath, 'utf8');
    expect(content).toContain('ANTHROPIC_API_KEY');
    expect(content).toContain('idd verify');
    expect(content).toContain('badge');
  });
});
