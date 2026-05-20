# Contributing — IDD IDE

Obrigado por querer contribuir com o IDD IDE!

## Configuração do Ambiente

```bash
git clone https://github.com/EliezerRosa/idd-ide.git
cd idd-ide

# CLI
cd cli && npm install && npm run build && cd ..

# Extensão VS Code
cd extensions/idd-core && npm install && npm run compile && cd ../..

# Variáveis de ambiente
export ANTHROPIC_API_KEY=sk-ant-...
```

## Rodando os Testes

```bash
cd cli
npm test              # todos os testes
npm run test -- --watch   # modo watch
```

## Estrutura de um PR

1. **Um PR por mudança** — não misture features com bugfixes
2. **Testes obrigatórios** — toda mudança em `src/` precisa de testes em `src/__tests__/`
3. **Atualizar docs** — mudanças no CLI atualizam `docs/CLI.md`; mudanças de arquitetura atualizam `docs/ARCHITECTURE.md`

## Convenções de Código

- TypeScript strict mode (sem `any` sem justificativa)
- Nomes em inglês para código, português para mensagens de usuário e comentários
- Funções puras sempre que possível (facilita testes)
- Erros explícitos — nunca engolir exceptions silenciosamente

## Adicionando Suporte a uma Nova Linguagem

1. Adicione a entrada em `cli/src/lib/lang.ts`:

```typescript
const minhalang: LangConfig = {
  ext:         'ext',
  testExt:     'test.ext',
  testRunner:  'comando de testes',
  promptHints: ['dicas para o LLM sobre esta linguagem'],
  staticChecks: [
    { pattern: /padrão_proibido/i, message: 'mensagem', severity: 'critical' }
  ],
  testTemplate: (module, acceptance) => `scaffold de testes`,
};
```

2. Adicione ao `LANG_MAP`
3. Adicione testes em `src/__tests__/lang.test.ts`
4. Atualize a tabela em `README.md` e `docs/ARCHITECTURE.md`

## Adicionando um Novo Comando CLI

1. Crie `cli/src/commands/meucomando.ts` com a função `cmdMeuComando(args: string[])`
2. Importe e registre em `cli/src/index.ts`
3. Adicione ao help em `printHelp()`
4. Documente em `docs/CLI.md`
5. Adicione testes em `src/__tests__/`

## Issues e Features

- **Bug:** abra uma issue com o comando exato que falhou e a mensagem de erro
- **Feature:** descreva o caso de uso antes da implementação — pode ser um `.intent.yaml`!
- **Dúvida:** use Discussions no GitHub
