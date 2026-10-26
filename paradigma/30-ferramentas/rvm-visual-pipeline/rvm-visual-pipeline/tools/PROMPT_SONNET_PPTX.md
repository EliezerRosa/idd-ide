# Prompt para Claude Sonnet — gerar PPTX a partir do HTML interativo

> **Cole o conteúdo abaixo (entre as linhas `---`) no chat do Sonnet.**
> O Sonnet deve estar com acesso ao workspace
> `c:\Antigravity - RVM Designações\rvm-designacoes-unified` (ou versão equivalente)
> para conseguir ler o HTML fonte e os 4 SVGs.

---

# Tarefa

Gerar uma apresentação **PowerPoint (.pptx)** equivalente em conteúdo ao tour
interativo já existente. **A fonte de verdade é o HTML — NÃO use o MP4 nem
re-narre nada, apenas extraia textos do HTML.**

## Arquivo fonte (único)

`rvm-designacoes-unified/docs/graphs/visual/eleicao-candidatos-apresentacao-interativa.html`

Constantes JS a extrair (delimitadas por `/* EXTRACT_CONSTANTS_BEGIN */` ...
`/* EXTRACT_CONSTANTS_END */`):

- `INTRO_SCRIPT` — texto narrado de abertura (~5 parágrafos).
- `GRAPHS` — array com 4 grafos: `overview`, `generation`, `eligibility`, `uiAgent`.
  Cada item tem `id`, `title`, `file` (SVG Mermaid) e `intent` (1 linha).
- `GRAPH_INTENT` — texto narrado de abertura por aba (1 parágrafo por grafo).
- `FLOWS` — caminhos canônicos por grafo. Cada flow tem `name`, `description` e
  `indexes` (posições em `NARRATIVE_BY_INDEX[graphId]`).
- `NARRATIVE_BY_INDEX` — para cada grafo, array indexado pela ordem do SVG.
  Cada entrada: `{ label, explanation, aiComment }`.

Os 4 SVGs Mermaid de referência ficam em:
`rvm-designacoes-unified/docs/graphs/visual/svg/eleicao-candidatos-*.svg`
(filenames exatos estão em `GRAPHS[i].file`).

## Estrutura desejada do PPTX

Total estimado: **~70 slides**, 16:9, branding sóbrio (azul-marinho `#0b3b6f`
+ verde-azulado `#2dd4bf` para acentos, cinza neutro de fundo).

1. **Capa** (1 slide)
   - Título: "RVM Designações — Decisão de Candidatos"
   - Subtítulo: "Como o sistema decide quem faz o quê na reunião"
   - Crédito: autor + data + tag IDD/AEON
2. **Slide de introdução textual** (1 slide)
   - Render do `INTRO_SCRIPT` em bullets curtos (resumir; não copiar tudo).
3. **Sumário das 4 abas** (1 slide)
   - Lista numerada: `GRAPHS[i].title` + `GRAPHS[i].intent` (1 linha cada).
4. **Para cada grafo** (4 blocos × ~15 slides):
   - **Slide-divisor de grafo** (fundo escuro, título grande): `graph.title`
     + `GRAPH_INTENT[graphId]` como subtítulo.
   - **Slide de visão geral**: imagem do SVG (`graph.file`) centralizada
     (escalada para caber em 90% da área útil), legenda com `graph.intent`.
   - **Para cada flow em `FLOWS[graphId]`**:
     - **Slide de abertura do caminho**: título "Caminho N/M: `flow.name`"
       + `flow.description` como bullet único.
     - **1 slide por nó** em `flow.indexes`:
       - Header: `graph.title` › `flow.name` › nó `ni+1`/`length`.
       - Lado esquerdo (60%): a imagem do SVG com o nó N **destacado em
         vermelho** (stroke 3px, halo) — gere uma cópia do SVG por nó
         e marque o `g.node` cujo id começa com o índice canônico.
         Se for inviável marcar dinamicamente, use o SVG inteiro inalterado e
         posicione uma seta vermelha apontando para o nó.
       - Lado direito (40%):
         - **Título**: `narrative.label`.
         - **Descrição** (sob título "Descrição do vértice"):
           `narrative.explanation`.
         - **Comentário da IA** (caixa destacada com fundo claro):
           `narrative.aiComment`.
5. **Slide de fechamento** (1 slide)
   - Mensagem-síntese: "As quatro superfícies (motor, UI, diagnóstico, agente)
     chegam à mesma verdade porque compartilham a mesma cadeia de decisão".
   - Linha de chamada: link para o vídeo e para o HTML interativo.

## Restrições técnicas

- Use **python-pptx** (sem dependências exóticas).
- SVG → PNG: converta com **CairoSVG** ou **Inkscape CLI**
  (`inkscape --export-type=png --export-width=1600 file.svg`).
- Resolução das imagens: largura **1600 px** mínima.
- Não gere áudio. Não embuta vídeo. PPTX deve abrir limpo no PowerPoint 2016+
  e Google Slides.
- Encoding: workspace contém caractere `ç` no caminho raiz
  (`C:\Antigravity - RVM Designações\`) — use Python com `pathlib.Path`,
  evite `open(path)` sem `encoding='utf-8'`.

## Entregáveis

1. Script: `docs/graphs/visual/tools/build_pptx.py`
2. PPTX final: `public/videos/eleicao-candidatos-apresentacao.pptx`
3. (Opcional) PNGs intermediários em `tools/out/slides_png/`
4. Resumo no final do chat: contagem de slides por seção + caminho do PPTX.

## Critério de aceitação

- Sonnet roda o script ao final, abre o PPTX no PowerPoint (ou converte para
  PDF com LibreOffice/Inkscape para inspeção) e mostra 3 thumbnails:
  capa, 1 slide-nó típico, fechamento.
- Texto de cada nó-slide bate EXATO com `NARRATIVE_BY_INDEX[graphId][ni]`.
- Ordem dos slides respeita `FLOWS[graphId][f].indexes`.

## Permissões

Eliezer autoriza Sonnet a executar o pipeline até o PPTX final sem confirmar
passo a passo (confirm-once = "go"). Reportar apenas no fim, com tudo pronto.

---

## Notas para Eliezer (não copiar)

- O Sonnet vai consumir bem menos tokens que o Opus para esta tarefa de
  extração-estruturação. Estimo 50-100k tokens totais.
- Se o Sonnet falhar em renderizar SVG via CairoSVG (depende de DLLs no
  Windows), peça para ele cair para **Inkscape CLI** — você já tem Inkscape
  instalado? Se não: `winget install Inkscape.Inkscape`.
- O destaque-por-nó é o detalhe mais delicado. Plano B aceitável:
  setinha vermelha posicionada por coordenada `transform="translate(x,y)"`
  já presente em cada `g.node` do SVG.
