# Paradigma IDD — acervo

Todo o material do **IDD — Intent-Driven Development, na formulação de Eliézer Rosa**: textos,
especificações, código, apresentações, roteiros, áudio e vídeo. Ele estava espalhado pelo disco e
foi consolidado e organizado **pelo papel de cada artefato** (reorganização de 2026-10-26, ver
[PROPOSTA-REORGANIZACAO.md](PROPOSTA-REORGANIZACAO.md)).

**Comece por [`00-canone/`](00-canone/IDD-CANONE.md).** Toda afirmação pública tem selo:
✅ implementado · 🧪 demonstração · 🔭 proposta ([matriz](00-canone/AFIRMACOES.md)).

## Mapa

| Pasta | Pergunta | Conteúdo |
| --- | --- | --- |
| [00-canone](00-canone) | **O que o IDD é?** | Cânone (definição, 4 camadas, 6 princípios, linhagem, agenda de pesquisa), matriz de afirmações, glossário verificável. *Escrito à mão; o script nunca toca.* |
| [10-fundamentos](10-fundamentos) | De onde vem? | Documento mestre, knowledge base e linhagem, 7 perspectivas (🔭), desambiguação de LN, precursores próprios (ALMA/OOI, DDD-IA), estudos |
| [20-metodo](20-metodo) | Como se pratica? | Ciclo de vida e Fase 0, runbooks `.intent.md` |
| [30-ferramentas](30-ferramentas) | Com o quê? | Specs do IDD-IDE, motion graphics renderer, pipeline de produção (TTS, legendas, upload), API do canal, Umbiguidade-Ubiquidada, RVM visual pipeline |
| [40-evidencias](40-evidencias) | Funciona? | RVM Designações ✅ · NexusLog CRM/Melissa ✅ · Refrigeração 🧪 · apps de exemplo 🧪. Cada um com `STATUS.md` |
| [50-comunicacao](50-comunicacao) | Como é ensinado? | Uma pasta por série/episódio (roteiro, narração, legendas, assets, render juntos): `serie-base-conhecimento/ep01…ep10`, `serie-refrigeracao/ep1…ep5, ep1b…ep4f`, `serie-casos-de-uso/`, `especiais/`, `shorts/`, `apresentacoes/`, `canal/` ([CANAIS-YOUTUBE.md](50-comunicacao/canal/CANAIS-YOUTUBE.md)) |
| [60-referencias-externas](60-referencias-externas) | Quem mais pensa isso? | Trabalho de terceiros: ebook *Intent-Driven Development* (Stockley), intent-driven.dev, pesquisa Unisys |
| [90-arquivo](90-arquivo) | — | Diagnósticos de produção, capturas, dúvidas antigas, checkpoints, sobras |

## Como funciona o armazenamento

| Tipo | Onde fica | No git? |
| --- | --- | --- |
| Texto, código, Markdown, HTML, PDF, JSON (≤ 5 MB) | cópia nesta árvore | **sim** |
| Vídeo, áudio, imagem, PPTX, fontes, `.db` | **hard link** (0 bytes extras; mesmo arquivo da origem) | não (`.gitignore`) |
| Arquivos em nuvem (OneDrive) | só no [catálogo](catalogo.csv) | não |

- **As origens não foram alteradas.** Editar uma *mídia* aqui altera a origem, porque é o mesmo
  arquivo físico. Editar um *texto* aqui não altera a origem, porque é uma cópia.
- [`catalogo.csv`](catalogo.csv) lista cada arquivo com tamanho, SHA-256, armazenamento e todas as
  origens. As duplicatas idênticas foram removidas.
- **Ficaram de fora de propósito:** segredos (tokens, `.env`, chaves em código), dados pessoais
  (congregação, publicadores, backups do RVM), `.git`, `node_modules` e `.venv`. A lista está em
  `_local/exclusoes.csv`, que não é versionado.
- **Os renderizadores rodam na origem** (`C:\Antigravity - IDD Refrigeração`). Aqui o código fica
  em `30-ferramentas` e os assets de cada episódio ficam em `50-comunicacao`.
- **Atualizar:** `python -I scripts/acervo/organizar_acervo.py --aplicar`. O script é
  idempotente, preserva textos editados aqui (quando são mais novos que a origem) e nunca remove
  `00-canone/`, `STATUS.md` nem `CANAIS-YOUTUBE.md`.

## Fontes varridas

`C:\IDE IDD Claude-VS Code\IDD Paradigma` · `C:\IDE IDD Claude-VS Code` (raiz) ·
`C:\IDE IDD Claude` · `C:\Antigravity - IDD Refrigeração` · `C:\Antigravity - RVM Designações`
(só artefatos IDD) · `Downloads` · `OneDrive\Aprenda Fazendo - Treinamento em TI`.

As versões antigas do app RVM (`C:\app-rvm-*`, cópias no Google Drive) não foram incluídas.
