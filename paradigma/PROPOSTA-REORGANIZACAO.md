# Reorganização do acervo — ✅ aplicada em 2026-10-26

> Aplicada como descrito abaixo, com uma diferença: a série "Teoria Ep04–10" é a continuação da
> **Base de Conhecimento** (mesma playlist) e ficou em `50-comunicacao/serie-base-conhecimento/`.

Contexto: [parecer de 2026-10-26](../docs/PARECER-PARADIGMA-2026-10-26.md), §5.

## Problema da estrutura atual

A estrutura atual agrupa os arquivos pela **origem** e pelo **tipo de mídia**. Para quem quer
entender ou auditar o paradigma, isso gera quatro problemas:

- **Não há um lugar que diga o que o IDD *é*.** A definição está espalhada por
  `01-fundamentos/` em seis versões que não concordam entre si (ver parecer §3.2).
- **Material de terceiros aparece como fundamento próprio.** O ebook *Intent-Driven Development*
  (Stockley) e o site intent-driven.dev estão em `01-fundamentos/` e `06-biblioteca/`
  misturados com textos do autor.
- **Um episódio fica espalhado em até 4 pastas:**
  - roteiro em `04-canal-youtube/planejamento-editorial`;
  - assets e render em `05-software/motion-graphics-renderer/idd_video_*_assets`;
  - áudio em `04-canal-youtube/producao-yt`;
  - IDs de publicação em `CANAIS-YOUTUBE.md`.
- **Código e mídia se misturam.** `producao-yt/` (12 GB) tem scripts Python junto de milhares
  de segmentos `.wav`, e `05-software/` mistura ferramentas com renders.

## Estrutura proposta: por papel epistêmico

```text
paradigma/
├── 00-canone/            O QUE O IDD É — fonte única de verdade, versionada
│   ├── IDD-CANONE.md         definição, princípios (número único), escopo das 4 camadas
│   ├── glossario.json        dicionário ubíquo DO PARADIGMA (checado por `idd dictionary`)
│   ├── AFIRMACOES.md         matriz afirmação → evidência → status
│   └── CHANGELOG.md          v0.x… — o que mudou e por quê
│
├── 10-fundamentos/       DE ONDE VEM — textos do autor sobre a base teórica
│   ├── linhagem/             knowledge base, genealogia, 7 perspectivas (marcadas como visão)
│   ├── comando-epistemico/   Ep02, Fé Bayesiana, Confirm-Once
│   ├── desambiguacao-ln/     Compilar LN, técnicas de desambiguação, SHALA
│   └── precursores-proprios/ ALMA/OOI, DDD-IA-Intencional
│
├── 20-metodo/            COMO SE PRATICA
│   ├── ciclo-de-vida/        Fase 0, ciclo de N etapas (um só, após o cânone)
│   ├── dav/                  Deterministic Action Vocabulary (spec + implementação de referência)
│   ├── runbooks/             padrão .intent.md, rotate-secrets.intent.md
│   └── acao-atomica/         protocolo de 4 fases, bounded contexts
│
├── 30-ferramentas/       SOFTWARE QUE MATERIALIZA O MÉTODO
│   ├── idd-ide/              specs e propostas da IDE (o código vive na raiz do repo)
│   ├── umbiguidade-ubiquidada/
│   ├── motion-graphics-renderer/   só código (renders vão para 50-comunicacao)
│   └── pipeline-producao/          scripts TTS/legendas/upload (sem .wav)
│
├── 40-evidencias/        ONDE FOI APLICADO — cada caso com STATUS.md (implementado / simulado)
│   ├── rvm-designacoes/      produção (DAV real) · teste Motor vs Agente
│   ├── nexuslog-crm-melissa/ código real
│   ├── refrigeracao-hvacr/   specs + MER/UML (sem app: STATUS.md diz isso)
│   └── apps-exemplos/        barbearia · cafeteria · racha-conta
│
├── 50-comunicacao/       COMO É ENSINADO — uma pasta por série, cada episódio autocontido
│   ├── serie-base/ep01-o-que-e-idd/{roteiro, legenda.srt, render.mp4, assets/, publicacao.json}
│   ├── serie-refrigeracao/   ep1…ep5, 1b…4f
│   ├── serie-teoria/         ep04…ep10 (selo "Visão")
│   ├── serie-casos-de-uso/   barbearia · cafeteria · racha
│   ├── especiais/            manifesto · perspectiva técnica · talk shows
│   ├── shorts/
│   ├── apresentacoes/        decks HTML, cada um com data e versão do cânone citada
│   └── canal/                CANAIS-YOUTUBE.md, planejamento editorial, operação, SEO
│
├── 60-referencias-externas/   TRABALHO DE TERCEIROS (nunca misturado com o do autor)
│   ├── stockley-intent-driven-development-v0.2.pdf
│   ├── intent-driven.dev.mht
│   └── papers/ · research_idd_unisys.md
│
└── 90-arquivo/           SUPERADO / RASCUNHO / HISTÓRICO
    ├── rascunhos-apresentacoes/ · duvidas-resolvidas/ · checkpoints/
    └── refrigeracao-raiz/
```

### Princípios da nova estrutura

1. **Uma pergunta por pasta:** *o que é* (00), *de onde vem* (10), *como se faz* (20),
   *com o quê* (30), *funciona?* (40), *como se ensina* (50), *quem mais pensa isso* (60).
2. **Episódio autocontido:** roteiro, legenda, render e metadados de publicação ficam juntos.
   Quem quiser auditar o que foi dito no Ep06 abre uma única pasta.
3. **Código separado de mídia:** pastas `30-` só têm código; `.wav`, `.mp4` e `.png` gerados
   vão para o episódio a que pertencem.
4. **Autoria explícita:** o que é de terceiros fica em `60-`, e o que é do autor em `00`–`50`.
5. **Status visível:** todo caso em `40-` e toda série de visão em `50-` declaram o que é real
   e o que é simulação.

## Como aplicar

1. Ajustar as `Rule(...)` em [`scripts/acervo/organizar_acervo.py`](../scripts/acervo/organizar_acervo.py)
   para a nova taxonomia. O mapeamento de episódio para pasta usa os prefixos `idd_video_*`,
   `idd_teoria_ep*` e `*_assets`, que já seguem um padrão.
2. Apagar a árvore atual. Basta remover as subpastas: as origens e os hard links não são
   afetados, porque só o link sai.
3. Rodar `--aplicar` para regenerar tudo na nova estrutura, com catálogo atualizado.
4. Escrever à mão `00-canone/`. Essa é a parte que exige **comando epistêmico do autor**, e
   nenhum script deve fazê-la.

Os passos 1–3 levam minutos e são reversíveis (basta reverter o script e rodar de novo).
