#!/usr/bin/env node
// src/index.ts — IDD CLI entry point

import { cmdInit }     from './commands/init.ts';
import { cmdGenerate } from './commands/generate.ts';
import { cmdVerify }   from './commands/verify.ts';
import { cmdGraph }    from './commands/graph.ts';
import { cmdStore }    from './commands/store.ts';
import { cmdDiff }     from './commands/diff.ts';
import { cmdNew }      from './commands/new.ts';
import { cmdStats }    from './commands/stats.ts';
import { cmdTemplate } from './commands/template.ts';
import { cmdBlame }    from './commands/blame.ts';
import { cmdExport }   from './commands/export.ts';
import { cmdCapture }  from './commands/capture.ts';
import { BOLD, RESET, PURPLE, GRAY, CYAN, GREEN } from './lib/ui.ts';

const args    = process.argv.slice(2);
const command = args[0];
const rest    = args.slice(1);

async function main(): Promise<void> {
  switch (command) {
    case 'init':     return cmdInit(rest);
    case 'generate':
    case 'gen':      return cmdGenerate(rest);
    case 'verify':
    case 'check':    return cmdVerify(rest);
    case 'graph':    return cmdGraph(rest);
    case 'store':    return cmdStore(rest);
    case 'diff':     return cmdDiff(rest);
    case 'new':      return cmdNew(rest);
    case 'stats':    return cmdStats(rest);
    case 'template': return cmdTemplate(rest);
    case 'blame':    return cmdBlame(rest);
    case 'export':   return cmdExport(rest);
    case 'capture':  return cmdCapture(rest);
    case 'version':
    case '--version':
    case '-v':       return printVersion();
    case 'help':
    case '--help':
    case '-h':
    case undefined:  return printHelp();
    default:
      console.error(`\n  Comando desconhecido: "${command}"\n`);
      printHelp();
      process.exit(1);
  }
}

function printVersion(): void {
  console.log(`\n  ${BOLD}${PURPLE}⬡ IDD CLI${RESET}  v0.1.0\n`);
}

function printHelp(): void {
  console.log(`
  ${BOLD}${PURPLE}⬡ IDD CLI${RESET}  —  Intent Driven Development
  ${GRAY}${'─'.repeat(50)}${RESET}

  ${BOLD}Comandos principais${RESET}

    ${CYAN}idd capture "descrição livre" [flags]${RESET}
      Expande uma frase solta em .intent.yaml completo via LLM.
      ${GRAY}--module=<mod/sub>${RESET}  força o módulo (senão o LLM sugere)
      ${GRAY}--dry-run${RESET}           mostra preview sem escrever
      ${GRAY}--yes${RESET}               pula confirmação interativa

    ${CYAN}idd new <modulo/sub>${RESET}
      Cria um novo .intent.yaml interativamente.

    ${CYAN}idd init${RESET}
      Inicializa IDD no projeto atual.
      Cria .idd/, instala Git hooks, gera exemplo.

    ${CYAN}idd generate [modulo/sub]${RESET}
      Gera código, testes e docs a partir do .intent.yaml.
      Sem argumento: processa todos os .intent.yaml do diretório.

    ${CYAN}idd verify [modulo/sub] [flags]${RESET}
      Verifica alinhamento entre código e intenções.
      ${GRAY}--fail-on=critical${RESET}  sai com erro se houver drift crítico
      ${GRAY}--semantic${RESET}          inclui análise via LLM (mais lenta)
      ${GRAY}--staged${RESET}            verifica apenas arquivos staged (git)

    ${CYAN}idd diff [modulo/sub] [flags]${RESET}
      Mostra diff lado a lado: intenção vs código atual.
      ${GRAY}--semantic${RESET}          inclui análise via LLM
      ${GRAY}--linear${RESET}            vista linear em vez de split

    ${CYAN}idd export [flags]${RESET}
      Exporta o grafo de intenções como documentação de arquitetura.
      ${GRAY}--format=md|json|mermaid|dot${RESET}  formato de saída (padrão: md)
      ${GRAY}--out=<arquivo>${RESET}                salva em arquivo (padrão: stdout)

    ${CYAN}idd blame <mod/sub> [--all]${RESET}
      Histórico de autoria das intenções (Intent Store + git log).

    ${CYAN}idd graph [flags]${RESET}
      Exibe o grafo de intenções no terminal.
      ${GRAY}--detailed${RESET}          tabela com todas as relações
      ${GRAY}--impact=<mod/sub>${RESET}  análise de impacto de uma mudança
      ${GRAY}--json${RESET}              exporta como JSON

  ${BOLD}Gerenciamento do store${RESET}

    ${CYAN}idd store list${RESET}               lista todas as intenções
    ${CYAN}idd store show <mod/sub>${RESET}      detalhes e constraints
    ${CYAN}idd store history <mod/sub>${RESET}   histórico de versões
    ${CYAN}idd store drift${RESET}               eventos de drift ativos
    ${CYAN}idd store snapshot --tag=v1.0${RESET} congela estado para release
    ${CYAN}idd store reset [--force]${RESET}     apaga o store (com backup)

  ${BOLD}Variáveis de ambiente${RESET}

    ${GRAY}ANTHROPIC_API_KEY${RESET}   chave de API (obrigatória para generate/verify --semantic)
    ${GRAY}IDD_MODEL${RESET}           modelo Claude (padrão: claude-sonnet-4-20250514)

  ${BOLD}Exemplos${RESET}

    ${GRAY}# Iniciar um projeto do zero${RESET}
    idd init
    idd generate auth/login

    ${GRAY}# Verificar antes de commitar${RESET}
    idd verify --fail-on=critical

    ${GRAY}# Ver impacto de mudar users/crud${RESET}
    idd graph --impact=users/crud

    ${GRAY}# Congelar estado no release${RESET}
    idd store snapshot --tag=v1.2.0

  ${GRAY}${'─'.repeat(50)}${RESET}
  ${GRAY}Documentação: https://idd-ide.dev/docs${RESET}
`);
}

main().catch(err => {
  console.error(`\n  ${BOLD}Erro fatal:${RESET} ${err.message}\n`);
  process.exit(1);
});
