// src/__tests__/livro-de-recusas.test.ts — Fixtures reprodutíveis do Livro de Recusas + teste semeado da Soma Zero
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { MesaRachaDominio } from '../../../paradigma/40-evidencias/apps-exemplos/racha_conta_pix/domain_rules.ts';

const CLI_DIST = path.resolve(__dirname, '../../dist/index.js');

function runCli(cwd: string, args: string[]) {
  return spawnSync(process.execPath, [CLI_DIST, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
}

describe('Livro de Recusas — gates determinísticos (sem LLM, exit code != 0)', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'idd-recusa-'));
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('Recusa #1: idd dictionary check --strict recusa contrato com termo fora do dicionário e sinônimo proibido (exit 1)', () => {
    fs.mkdirSync(path.join(tmp, '.intent'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.intent', 'ubiquitous-dictionary.json'),
      JSON.stringify({
        version: '1.0',
        terms: [
          {
            term: 'UserAccount',
            definition: 'Conta de acesso autenticada de um titular no sistema',
            kind: 'entity',
            aliases: ['Conta'],
            forbidden: ['usuario', 'user'],
          },
        ],
      }),
    );
    fs.writeFileSync(
      path.join(tmp, 'auth.intent.yaml'),
      [
        'version: "2.0"',
        'intent: "Bloquear o usuario após 5 falhas em GhostToken"',
        'module: auth/lockout',
        'target_class: UserAccount',
        'target_method: lock',
        'constraints:',
        '  - id: C-01',
        '    type: invariant',
        '    severity: critical',
        '    description: "UserAccount permanece bloqueada por 15 minutos"',
        'acceptance:',
        '  - given: "UserAccount ativa"',
        '    when: "5 falhas consecutivas"',
        '    then: "bloqueia a Conta"',
      ].join('\n'),
    );

    const res = runCli(tmp, ['dictionary', 'check', '--strict']);
    expect(res.status).toBe(1);
    expect(res.stdout + res.stderr).toMatch(/GhostToken|usuario/);
  });

  it('Recusa #2: idd verify --project recusa importação ilegal entre bounded contexts (exit 1)', () => {
    fs.writeFileSync(
      path.join(tmp, 'project.intent.yaml'),
      [
        'version: "2.0"',
        'name: demo',
        'bounded_contexts:',
        '  - name: core',
        '    path: packages/core/src',
        '    package: "@demo/core"',
        '    allowed_dependencies: []',
        '  - name: cli',
        '    path: cli/src',
        '    allowed_dependencies: [core]',
      ].join('\n'),
    );
    fs.mkdirSync(path.join(tmp, 'packages/core/src'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'cli/src'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'cli/src/index.ts'), 'export const cliHelper = 1;\n');
    // Violação: core (allowed_dependencies: []) importando cli
    fs.writeFileSync(
      path.join(tmp, 'packages/core/src/leak.ts'),
      'import { cliHelper } from "../../../cli/src/index.js";\nexport const v = cliHelper;\n',
    );

    const res = runCli(tmp, ['verify', '--project']);
    expect(res.status).toBe(1);
    expect(res.stdout + res.stderr).toMatch(/core.*cli/i);
  });

  it('Recusa #3: idd lint-ln recusa intenção com termo vago e termo ausente do dicionário (exit 1)', () => {
    const dicPath = path.join(tmp, 'dicionario.json');
    const intPath = path.join(tmp, 'intencoes.md');
    fs.writeFileSync(
      dicPath,
      JSON.stringify({
        version: '1.0',
        terms: [
          {
            term: 'Mesa',
            definition: 'Encontro de consumo cuja conta é dividida entre os participantes',
            kind: 'aggregate',
            aliases: [],
            forbidden: [],
          },
        ],
      }),
    );
    fs.writeFileSync(
      intPath,
      '# Intenções\n\n- **INT-001** O sistema deve fechar a [[Mesa]] de forma rápida com [[TaxaGarcom]].\n',
    );

    const res = runCli(tmp, ['lint-ln', intPath, `--dicionario=${dicPath}`]);
    expect(res.status).toBe(1);
    expect(res.stdout + res.stderr).toMatch(/TaxaGarcom|rápida/i);
  });

  it('Recusa #4: idd fase0 gate2 recusa modelo Mermaid com dependência transitiva que viola 3NF/BCNF (exit 1)', () => {
    const init = runCli(tmp, ['fase0', 'init', 'c']);
    expect(init.status).toBe(0);
    const casoDir = path.join(tmp, 'fase0', 'c');
    fs.writeFileSync(
      path.join(casoDir, 'dicionario.json'),
      JSON.stringify({
        version: '1.0',
        terms: [
          { term: 'Mesa', definition: 'Encontro de consumo com participantes e itens', kind: 'aggregate', aliases: [], forbidden: [] },
          { term: 'Participante', definition: 'Pessoa que integra uma mesa e paga a própria cota', kind: 'entity', aliases: [], forbidden: [] },
        ],
      }),
    );
    fs.appendFileSync(path.join(casoDir, 'intencoes.md'), '- **INT-001** O aplicativo deve exibir a [[Mesa]] ao [[Participante]].\n');
    fs.appendFileSync(path.join(casoDir, 'invariantes.md'), '- **INV-001** [integridade] Todo [[Participante]] sempre pertence a uma [[Mesa]].\n');
    fs.mkdirSync(path.join(casoDir, 'modelo'), { recursive: true });
    // Violação de 3NF: cep -> cidade em Participante (chave: id)
    fs.writeFileSync(
      path.join(casoDir, 'modelo', 'dominio.mmd'),
      [
        'classDiagram',
        '  class Mesa {',
        '    +uuid id PK',
        '  }',
        '  class Participante {',
        '    +uuid id PK',
        '    +uuid mesa_id FK(Mesa.id)',
        '    +string cep',
        '    +string cidade',
        '  }',
        '  Mesa "1" --> "N" Participante : reune',
        '  %% DF Participante: cep -> cidade',
      ].join('\n'),
    );

    const res = runCli(tmp, ['fase0', 'gate2', 'c']);
    expect(res.status).toBe(1);
    expect(res.stdout + res.stderr).toMatch(/2NF|3NF|BCNF|Participante/);
  });

  it('Recusa #5: idd verify --fail-on=critical recusa contrato v2 cujo critério A-02 não tem referência formal no teste (exit 1)', () => {
    fs.mkdirSync(path.join(tmp, 'src', 'billing'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'src', '__tests__'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, 'src', 'billing', 'calc.intent.yaml'),
      [
        'version: "2.0"',
        'module: billing/calc',
        'target_class: Mesa',
        'target_method: calcularCota',
        'intent: "Calcular a cota de cada participante em centavos inteiros sem sobra"',
        'constraints:',
        '  - id: INV-001',
        '    type: invariant',
        '    severity: critical',
        '    description: "A soma das cotas deve ser igual ao total da mesa"',
        'acceptance:',
        '  - id: A-01',
        '    given: "Mesa com 3 participantes"',
        '    when: "calcularCota é executado"',
        '    then: "soma das cotas bate no centavo"',
        '  - id: A-02',
        '    given: "Divisão com dízima"',
        '    when: "calcularCota distribui o resto"',
        '    then: "retorna cota em centavos inteiros"',
      ].join('\n'),
    );
    fs.writeFileSync(
      path.join(tmp, 'src', 'billing', 'calc.ts'),
      'export function calcularCota(): number { return 100; }\n',
    );
    // O teste referencia [A-01] e até contém as palavras de A-02 ("retorna cota em centavos inteiros"),
    // mas omite o identificador formal A-02 — a cerca v2 não aceita coincidência lexical.
    fs.writeFileSync(
      path.join(tmp, 'src', '__tests__', 'calc.test.ts'),
      'it("[A-01] soma das cotas bate no centavo e retorna cota em centavos inteiros", () => {});\n',
    );

    const res = runCli(tmp, ['verify', '--fail-on=critical']);
    expect(res.status).toBe(1);
    expect(res.stdout + res.stderr).toMatch(/\[A-02\]/);
  });
});

/** PRNG determinístico (mulberry32) — sem relógio, sem rede. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('racha_conta_pix — Soma Zero determinística com semente fixa (Tarefa 4)', () => {
  it('mantém soma(cotas) === totalComTaxaCentavos() em 50 mesas semeadas com centavos inteiros', () => {
    const rand = mulberry32(0x20261029);
    const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
    const taxas = [0, 7, 10, 12.5, 13];

    for (let m = 1; m <= 50; m++) {
      const taxa = taxas[m % taxas.length];
      const mesa = new MesaRachaDominio(`mesa-${m}`, `Mesa ${m}`, taxa);

      const numParticipantes = randInt(2, 11);
      const ids: string[] = [];
      for (let p = 1; p <= numParticipantes; p++) {
        const id = `p-${String(p).padStart(2, '0')}`;
        ids.push(id);
        mesa.adicionarParticipante(id, `Participante ${p}`);
      }

      const numItens = randInt(1, 15);
      for (let i = 1; i <= numItens; i++) {
        const precoCentavos = randInt(1, 50_000);
        // Subconjunto determinístico de pelo menos 1 consumidor
        const qtdConsumidores = randInt(1, numParticipantes);
        const consumidores = ids.slice(0, qtdConsumidores);
        mesa.adicionarItem(`item-${i}`, `Item ${i}`, precoCentavos, consumidores);
      }

      mesa.calcularRateioJusto();

      const totalEsperado = mesa.totalComTaxaCentavos();
      const cotas = Array.from(mesa.participantes.values()).map(p => p.valorAPagarCentavos);
      for (const c of cotas) {
        expect(Number.isInteger(c)).toBe(true);
        expect(c).toBeGreaterThanOrEqual(0);
      }
      const soma = cotas.reduce((a, b) => a + b, 0);
      expect(soma).toBe(totalEsperado);
      expect(mesa.validarInvarianteSomaZero(totalEsperado)).toBe(true);
    }
  });

  it('recusa divergência de 1 centavo em validarInvarianteSomaZero', () => {
    const mesa = new MesaRachaDominio('m-1', 'Mesa Três Terços', 10);
    mesa.adicionarParticipante('p1', 'Ana');
    mesa.adicionarParticipante('p2', 'Bruno');
    mesa.adicionarParticipante('p3', 'Carla');
    mesa.adicionarItem('i1', 'Porção', 1000, ['p1', 'p2', 'p3']);
    mesa.calcularRateioJusto();

    expect(mesa.totalComTaxaCentavos()).toBe(1100);
    expect(mesa.validarInvarianteSomaZero(1100)).toBe(true);
    expect(() => mesa.validarInvarianteSomaZero(1101)).toThrow(/INVARIANTE DA SOMA ZERO VIOLADA/);
  });
});

