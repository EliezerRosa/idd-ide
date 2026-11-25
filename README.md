# ⬡ IDD — Intent-Driven Development

> Protótipo de pesquisa do **Paradigma IDD, na formulação de Eliézer Rosa**: a intenção humana,
> escrita em linguagem natural, é a fonte de autoridade do sistema. Ela é compilada em contratos
> estruturados que uma verificação determinística confere continuamente.

[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)
[![Status](https://img.shields.io/badge/Status-protótipo%20de%20pesquisa-orange)](./docs/ROADMAP.md)
[![Cânone](https://img.shields.io/badge/Cânone-v1.0--rc1-8B5CF6)](./paradigma/00-canone/IDD-CANONE.md)

**O IDD é uma tese de paradigma, não um produto acabado.** Este repositório reúne:

- o **acervo do paradigma**, com cânone, método, evidências e comunicação, em [`paradigma/`](./paradigma/README.md);
- as **ferramentas experimentais**: CLI `idd`, núcleo `@idd/core`, servidor LSP e extensão para VS Code.

Selos usados neste README (ver [Cânone §6](./paradigma/00-canone/IDD-CANONE.md)):
✅ **implementado** (código + testes) · 🧪 **demonstração** (protótipo didático) ·
🔭 **proposta** (projeto ou pesquisa, ainda não implementado).

---

## Direção atual: começar pelo começo

A **Fase 0 investigativa** ✅ (`idd fase0` + `idd lint-ln`) é um desambiguador e compilador de linguagem
ubíqua no nível de **estudo de requisitos**, antes de qualquer código.

1. **Loop 1, intenção.** A IA participa livremente, num diálogo socrático, até produzir, em
   linguagem natural mais assertiva e objetiva, as **intenções** e as **invariantes do negócio**,
   com cada termo fixado no dicionário ubíquo.
2. **Loop 2, modelo.** A partir do loop 1:
   - o **MER normalizado**;
   - o **UML** de contexto e atores;
   - os **casos de uso** decompostos até as transações do negócio;
   - as **atividades** e os **estados**;
   - os **métodos**, circunscritos às classes que os casos de uso transacionais usam.

Horizonte: CLI e extensão primeiro; o desenvolvimento de uma **IDE dedicada** é um **projeto futuro** de longo prazo.
Detalhes em [`docs/PROPOSTA-FASE0-COMPILADOR-LU.md`](./docs/PROPOSTA-FASE0-COMPILADOR-LU.md), na
avaliação técnica [`docs/PARECER-IDD-IDE-2026-10-27.md`](./docs/PARECER-IDD-IDE-2026-10-27.md) e no
parecer genealógico e de convergências [`docs/PARECER-GENEALOGIA-E-CONVERGENCIAS-2026-11-25.md`](./docs/PARECER-GENEALOGIA-E-CONVERGENCIAS-2026-11-25.md).

---

## O que existe hoje

| Peça | Status | Observação |
| --- | --- | --- |
| Contrato `.intent.yaml` (v1 e v2) e parser único `@idd/core` | ✅ | `packages/core` |
| **Dicionário ubíquo** (`idd dictionary`), offline e determinístico, usado como gate de CI | ✅ | Base da Fase 0 |
| **Fronteiras entre bounded contexts** (`idd verify --project`), gate de CI | ✅ | Lê imports por regex (só TS/JS) |
| Intent Store versionado (SQLite) | ✅ | Testado com uma simulação do banco; depende do módulo nativo `better-sqlite3` |
| Modelagem de domínio: UML (Mermaid/PlantUML) → YAML, JSON Schema e SQL (`idd domain`) | ✅ | Base do loop 2 |
| Checagem de normalização (`idd domain normalize`) | ✅ / 🧪 | **2NF–BCNF formais** (fecho de Armstrong, chaves candidatas e decomposição sem perda em `fds.ts`); **1NF, 4NF, 5NF e DKNF heurísticas** (`normalizer.ts`) |
| **Fase 0 — Compilador de Linguagem Ubíqua** (`idd fase0`, `idd lint-ln`) | ✅ | Loop 1 (intenção/invariantes/dicionário + integridade SHA-256 em `decisoes.md`), Loop 2 (MER/UCs/atividades/estados/métodos), TSDoc e exportações |
| **Cerca de mutação AST em TypeScript** (`idd verify` + `@idd/eslint-plugin`) | ✅ | Checa `allowed_fields`, `read_only_fields`, acessores `get`/`set` e mutação dinâmica em `this[expr]` (`INV-UI-05`) via TS Compiler API (`mutationFence.ts` + `astGraph.ts`) e ESLint. Limite: análise local TS-only, sujeita a contornos por aliasing interprocedural, `Object.assign`/`Reflect.set` indiretos e `any` |
| Verificação estática heurística de drift (`idd verify` regras `FORBIDDEN`/`CONSTRAINT_CHECKS`) | 🧪 | Regras por regex e palavras-chave; acerto ainda não medido |
| Verificação semântica (`idd verify --semantic`) | 🧪 | Uma única resposta de LLM (Anthropic, truncado em 16.000 chars); não trata o não-determinismo ([#30](https://github.com/EliezerRosa/idd-ide/issues/30)) |
| Suporte multi-linguagem (`cli/src/lib/lang.ts`) | 🧪 | Templates, *prompt hints* e regex estáticas para TS/JS/Python/Go/Rust/Java; **AST, LSP e `--project` são apenas TS/JS** |
| `generate`, `capture`, `migrate`, `suggest`, `review` | 🧪 | Chamadas ao LLM sem saída estruturada nem nova tentativa |
| LSP (`.intent.yaml` + `state_mutation` via AST TypeScript) | 🧪 | Só TypeScript e só o decorator `@Intent`; sem testes E2E do protocolo LSP |
| Extensão VS Code (árvore, captura, grafo) | 🧪 | Não publicada; o grafo carrega o Cytoscape de CDN |
| Servidor HTTP de sincronização (`idd server`) | 🧪 | Só `127.0.0.1` por padrão; outro host exige `IDD_SERVER_TOKEN` |
| `.intent.md` (Track Cognitivo), Sombra, waivers, Risk Dials | 🔭 | [ROADMAP](./docs/ROADMAP.md), Fase 9 |
| Anotações de drift inline no editor | 🔭 | Não implementado |
| **IDE dedicada (fork do Code-OSS)** | 🔭 | **Projeto futuro** (longo prazo); hoje existe só o `product.json` de marca |

---

## Exemplo de contrato

```yaml
# auth/login.intent.yaml
intent: "Autenticar usuário com e-mail e senha, retornando JWT válido por 24h"
module: auth/login

constraints:
  - "Senha deve ter mínimo 8 caracteres"
  - "Bloquear conta após 5 tentativas falhas por 15 minutos"
  - "Nunca registrar a senha em logs"

acceptance:
  - "Login válido retorna status 200 e token JWT"
  - "Senha incorreta retorna 401 sem vazar informações"

depends_on:
  - users/crud

language: typescript
```

---

## Início rápido (CLI)

Pré-requisitos: Node.js 22.12+ e Git. Uma chave da API Anthropic só é necessária para os
comandos que usam LLM.

```bash
git clone https://github.com/EliezerRosa/idd-ide.git
cd idd-ide/cli
npm install
npm run build
npm link            # disponibiliza o comando `idd`
```

> `better-sqlite3` é um módulo nativo. Se a instalação falhar, instale as ferramentas de build
> da sua plataforma.

```bash
cd meu-projeto
idd init                      # cria .idd/, hooks e exemplo
idd dictionary list           # vocabulário ubíquo do projeto
idd dictionary check --strict # termos fora do dicionário (offline)
idd verify --project          # fronteiras entre contextos
idd domain parse domain.mmd   # modelo de domínio a partir do UML
idd verify                    # drift estático (heurístico)
```

A lista completa dos 28 comandos (fora `help` e `version`) está em `idd --help` e em [docs/CLI.md](./docs/CLI.md).

---

## Estrutura

```
idd-ide/
├── paradigma/                    # acervo do paradigma: cânone, método, evidências, comunicação
├── packages/core/                # @idd/core: contrato, projeto, dicionário (parser único)
├── packages/eslint-plugin-idd/   # @idd/eslint-plugin: regras AST state-mutation e no-exposed-mutable-state
├── cli/                          # CLI `idd` (28 comandos, 40 suítes / 1.103 testes)
├── extensions/idd-core/          # extensão VS Code + servidor LSP (experimental)
├── packages/vscode-extension/    # protótipo alternativo de UI (experimental)
├── packages/idd-ui-pwa/          # maquete de UI (dados fixos)
├── schemas/                      # JSON Schema do .intent.yaml
└── docs/                         # arquitetura, roadmap, pareceres
```

---

## Variáveis de ambiente

| Variável | Descrição | Padrão |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Chave da API Anthropic (comandos com LLM) | — |
| `IDD_MODEL` | Modelo Claude | `claude-sonnet-5` |
| `IDD_SERVER_TOKEN` | Token Bearer do `idd server` (obrigatório fora de `127.0.0.1`) | — |

---

## Testes

```bash
cd cli && npm test
```

Os testes do CLI são unitários e de pipeline, com o SQLite substituído por uma simulação. Ainda não
há testes de ponta a ponta com banco real, LLM ou o protocolo LSP.

---

## Contribuindo e licença

Veja [CONTRIBUTING.md](./docs/CONTRIBUTING.md). Licença MIT, veja [LICENSE](./LICENSE).

IDD — Intent-Driven Development, na formulação de Eliézer Rosa · Cânone v1.0-rc1
