# Proposta — Fase 0: compilador de linguagem ubíqua (estudo de requisitos)

**Status:** 🔭 PROPOSTA, aguardando aprovação (Confirm-Once) de Eliézer Rosa
**Data:** 2026-10-27 · **Cânone:** v1.0-rc1
**Fontes:**
- [Ciclo de Vida — Nova proposta](../paradigma/20-metodo/ciclo-de-vida/IDD%20Paradigma%20Ciclo%20de%20Vida%20-%20Nova%20proposta.txt);
- [Complemento v2](../paradigma/20-metodo/ciclo-de-vida/IDD%20Paradigma%20Ciclo%20de%20Vida%20-%20Nova%20proposta%20v2%20-%20Complemento.txt);
- [Técnicas de Desambiguidade de LN](../paradigma/20-metodo/ciclo-de-vida/IDD%20Paradigma%20T%C3%A9cnicas%20de%20Desambiguidade%20de%20LN.txt);
- a decisão de 27/10 registrada em [PARECER-IDD-IDE-2026-10-27](PARECER-IDD-IDE-2026-10-27.md) §1.

---

## 1. Objetivo

**Começar pelo começo.** Antes de qualquer código, transformar o material bruto do negócio em
uma especificação em linguagem ubíqua, sem ambiguidades conhecidas, e dela derivar o modelo do
domínio até o nível de métodos circunscritos a classes.

```
 fontes brutas (docs, PDFs, .md, imagens, áudio, vídeo)
        │  L0 · normalização para LN
        ▼
 ┌─ LOOP 1 · INTENÇÃO ─────────────────────────────────────────┐
 │  IA livre, socrática: pergunta, propõe, contesta            │
 │  humano decide; cada decisão é registrada                    │
 │  saída: intenções e invariantes em LN assertiva + dicionário │
 └──────────────────────────────── gate de convergência 1 ─────┘
        ▼
 ┌─ LOOP 2 · MODELO ───────────────────────────────────────────┐
 │  MER normalizado → UML contexto/atores → casos de uso até a  │
 │  transação de negócio → atividades → estados → métodos       │
 │  circunscritos às classes usadas pelos UCs transacionais     │
 └──────────────────────────────── gate de convergência 2 ─────┘
        ▼
 contratos .intent.yaml v2 (target_class.target_method) + exportações
 (PlantUML/DBML para o Visual Paradigm; spec.md para Aider/Spec Kit; CI)
```

## 2. Princípios

1. **IA livre no diálogo, humano com a decisão.** No loop 1 a IA participa sem restrições:
   pergunta, propõe alternativas, aponta contradições. Mas **nenhum termo, invariante ou
   cardinalidade entra na especificação sem decisão humana registrada**. É o Comando Epistêmico
   (Cânone §3, princípio 2) aplicado ao estudo de requisitos.
2. **Texto versionado em git**, local e legível. Nada de banco obrigatório: cada artefato é um
   arquivo revisável em PR.
3. **Convergência medida por critérios verificáveis**, nunca por um "grau de certeza"
   autodeclarado pelo LLM.
4. **Reuso do que já existe:**
   - `@idd/core` (dicionário, contrato v2 com `target_class`/`target_method`);
   - `idd domain` (parser UML, compilador SQL, normalizador).
5. **Interoperar, não competir:** exportar para Visual Paradigm, Aider e Spec Kit em vez de
   reimplementá-los.

## 3. Artefatos (por caso de estudo)

```
fase0/<caso>/
├── fontes/            # originais (hash) + transcrição em LN (L0)
├── decisoes.md        # log: pergunta → opções → decisão humana → data → termos afetados
├── intencoes.md       # loop 1: intenções em LN controlada (padrões tipo EARS)
├── invariantes.md     # loop 1: invariantes com id, tipo, enunciado testável
├── dicionario.json    # loop 1: linguagem ubíqua (formato de @idd/core)
├── modelo/
│   ├── dominio.mmd     # loop 2: classes, atributos, dependências funcionais
│   ├── contexto.puml   # loop 2: sistema, atores externos
│   ├── casos-de-uso/   # loop 2: UC → transações de negócio (pré/pós, invariantes tocadas)
│   ├── atividades/     # loop 2: fluxos por UC
│   └── estados/        # loop 2: máquinas de estado das entidades com ciclo de vida
├── contratos/          # .intent.yaml v2, um por método circunscrito
└── rastreabilidade.md  # invariante → transação → método → (futuro) teste
```

## 4. Gates de convergência (verificáveis)

### Gate 1 (fim do loop 1)

| Critério | Verificação |
| --- | --- |
| Todo termo de domínio está no dicionário | `idd dictionary check --strict` sobre `intencoes.md` e `invariantes.md` |
| Lint de ambiguidade sem erros | Regras determinísticas: palavras vagas ("adequado", "rápido", "etc.", "e/ou"), passiva sem agente, pronome com referente ambíguo, quantificador sem escopo, "deve" sem condição de disparo |
| Toda invariante tem id, tipo e enunciado testável | Validação de esquema + padrão de frase |
| Nenhuma pergunta bloqueante em aberto | `decisoes.md` sem itens `aberta: bloqueante` |
| (Consultivo) dispersão de interpretações | N leituras independentes do LLM para cada frase, agrupadas por equivalência ("entropia semântica", Farquhar et al., *Nature* 2024). Alta dispersão vira pergunta, não reprovação |

### Gate 2 (fim do loop 2)

| Critério | Verificação |
| --- | --- |
| MER na forma normal alvo (BCNF por padrão) | `idd domain normalize`, **evoluído para fecho de atributos e chaves candidatas** (Armstrong); hoje é heurístico |
| Toda transação de negócio pertence a um UC e tem pré e pós-condições | Esquema do UC |
| Toda transação mapeia para ≥ 1 método de uma classe do modelo | Matriz de rastreabilidade |
| Todo atributo alterado por uma transação está em `allowed_fields` do método | Coerência contrato × modelo |
| Toda transição de estado é disparada por alguma transação | Coerência estados × UCs |
| Nenhuma invariante órfã (sem transação que a preserve ou verifique) | Matriz de rastreabilidade |

## 5. Papel da IA, por etapa

| Etapa | IA | Humano |
| --- | --- | --- |
| L0 ingestão | Transcreve e extrai: entidades, ações, restrições, suposições não confirmadas | Confere a transcrição |
| Loop 1 | Pergunta (2–3 por rodada, sobre as lacunas), propõe redações assertivas, detecta contradições | Decide cada termo, invariante e exceção |
| Loop 2 | Propõe MER, UCs, estados e métodos a partir do loop 1 | Aprova o modelo (Confirm-Once por etapa) |
| Gates | — | Os gates são determinísticos; a IA não aprova a própria saída |

## 6. Entregas incrementais

| # | Entrega | Gate de saída |
| --- | --- | --- |
| 0 | **Camada de LLM única** (vários provedores, saída estruturada, novas tentativas) | Testes com respostas gravadas |
| 1 | **Lint de ambiguidade** determinístico (`idd lint-ln`) + `decisoes.md` | Lint roda offline sobre os textos do loop 1 |
| 2 | **Loop 1 no terminal** (`idd fase0 loop1 <caso>`): diálogo socrático, registro de decisões, atualização do dicionário | Gate 1 verde num caso real pequeno (Racha de Conta) |
| 3 | **Normalizador com fecho de atributos** (Armstrong, chaves candidatas, BCNF) | Testes com exemplos clássicos de livro-texto |
| 4 | **Loop 2** (`idd fase0 loop2 <caso>`): MER → contexto → UCs → atividades → estados → métodos → contratos v2 | Gate 2 verde no mesmo caso |
| 5 | **Exportações:** PlantUML/DBML (Visual Paradigm), `spec.md` (Aider/Spec Kit), matriz de rastreabilidade | Importação no VP testada |
| 6 | **Avaliação em casos reais** (Refrigeração, RVM): perguntas até convergir, defeitos encontrados depois, estabilidade entre execuções | Relatório com método e números |
| 7 | **Extensão VS Code:** chat da Fase 0 + inspetor de artefatos (substitui as duas extensões atuais) | Ciclo completo na UI |
| 8 | **IDE dedicada** | Só se a adoção da proposta justificar (critério bayesiano) |

## 7. Posição no mercado

- **Sobreposição:**
  - Spec Kit (`/clarify`) e Kiro (requisitos no padrão EARS) já fazem esclarecimento de requisitos com IA;
  - a IA do Visual Paradigm desenha a partir de texto pronto.
- **Diferença proposta:** a **cadeia completa e verificada**:
  - dicionário ubíquo como gate;
  - MER normalizado com prova de forma normal;
  - casos de uso decompostos até a transação;
  - métodos circunscritos;
  - rastreabilidade de invariante a método.

  Não encontrei ferramenta que faça essa cadeia (pesquisa de out/2026, não exaustiva).

## 8. Decisões que retornam ao comando epistêmico

| Decisão | Opções | Recomendação |
| --- | --- | --- |
| Nome do agente socrático | Manter **SHADA** para o agente (e retirar "SHADA" dos termos proibidos do glossário, que hoje o trata como grafia errada de SHALA) · outro nome | **SHADA = agente, SHALA = medida.** Atualizar o glossário |
| Primeiro caso de estudo | Racha de Conta (pequeno) · Refrigeração · RVM | Racha de Conta, para validar a mecânica; depois Refrigeração |
| Padrão de LN controlada para intenções | EARS (Mavin, 2009) · padrão próprio | EARS adaptado ao português |
| Forma normal alvo padrão | 3NF · BCNF | BCNF, com exceções justificadas em `decisoes.md` |
| Stack da UIX | Supabase + React (como no anexo v2) · local-first (CLI + extensão) | Local-first; Supabase só se houver colaboração multiusuário |

## 9. Ajustes de nomenclatura nos anexos

Os textos-fonte em `paradigma/20-metodo/ciclo-de-vida/` são registros históricos e não foram
editados. Ao derivar documentos novos deles, aplicar o Cânone:

- "Intent-Driven", não "Intention-Driven";
- sem "blindada" nem "provado" para o que é proposta;
- convergência por gates verificáveis, não "≥ 95% de certeza".
