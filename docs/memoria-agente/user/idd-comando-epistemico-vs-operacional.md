# IDD — Comando Epistêmico vs. Comando Operacional (2026-04-30)

Distinção fundacional cunhada por Eliezer, alinhada com Engelbart 1962
("Augmenting Human Intellect").

## Definições

- **Comando Epistêmico**: autoridade sobre o *quê* e o *porquê*. Define
  intenção, restrições, invariantes, critérios de sucesso, limites éticos.
  Permanece sempre com o humano.
- **Comando Operacional**: autoridade sobre o *como*. Escolhe ferramentas,
  sequência de passos, sintaxe, idiomas de execução. Pode ser delegado ao
  agente (LLM/IDD).

## Princípio
Augmenting ≠ Automating. A simbiose preserva o humano no comando epistêmico
*mesmo quando* delega o operacional. Perder essa fronteira = credulidade
(confiança sem conhecimento). Mantê-la = fé bayesiana (confiança escalada
por evidência auditável).

## Implicação prática para runbooks `.intent.md`
- Frontmatter declara explicitamente o que é epistêmico (invariantes,
  autorização) vs. operacional (adapters, fases técnicas).
- Confirm-once = transferência consciente do operacional, retenção do
  epistêmico via plano + relatório + trace.
- Invariantes (§5) são a salvaguarda epistêmica encarnada em código —
  o agente pode errar o caminho, mas não pode violar o invariante sem parar.

## Linhagem
Engelbart (1962) → Sutherland (Sketchpad) → Kay (Dynabook) → Brooks
("conceptual integrity") → Berners-Lee (semantic web) → Gruber (ontologias)
→ IDD (intenção como fonte primária, agente como executor operacional).

## Vocabulário a usar consistentemente
- "comando epistêmico" / "comando operacional" — em vez de "humano vs IA"
- "fé bayesiana" vs "credulidade" — em vez de "confia/não confia"
- "augmenting" — em vez de "automation" quando descrevendo IDD
