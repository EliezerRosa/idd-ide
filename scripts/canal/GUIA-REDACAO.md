# Guia de redação — apresentações e descrições do canal

Base obrigatória: [Cânone](../../paradigma/00-canone/IDD-CANONE.md) e
[Matriz de Afirmações](../../paradigma/00-canone/AFIRMACOES.md). Em caso de dúvida, a matriz
decide o status.

## Selos (usar exatamente estes textos)

- `✅ IMPLEMENTADO`: existe e funciona, com evidência verificável.
- `🧪 DEMONSTRAÇÃO`: protótipo didático. Terminais, contagens de testes, tempos de deploy,
  migrations "APLICADO" e laudos são ilustrativos.
- `🔭 PROPOSTA`: direção de projeto ou pesquisa, ainda não implementada.

## Status por série (padrão; a matriz pode refinar item a item)

| Série / peça | Selo principal | Observação |
| --- | --- | --- |
| Base de Conhecimento Ep01–03 (conceitos: intenção, comando epistêmico, genealogia) | ✅ conceitos / 🔭 onde citar ferramentas futuras | Filosofia e método; sem promessas técnicas |
| Base de Conhecimento Ep04–10 (neuro-simbólico, Intent IR, SMT/Z3/Dafny, constitucional, sagas, comparativos) | 🔭 PROPOSTA | Agenda de pesquisa. Nada disso está implementado. Ep06: provar uma invariante é mostrar que a negação é **UNSAT** |
| Perspectiva Técnica (5 pilares) | 🔭 PROPOSTA | A própria peça fala do "que falta". Manter esse tom |
| Manifesto | 🔭 visão + ✅ princípios | Tese de direção, não relato de fato |
| Refrigeração Ep1–5, 1B–4B, 3C–4F, Talk Show | 🧪 DEMONSTRAÇÃO | Não há app de refrigeração. Existem spec de domínio, MER e UML. Offline-first é 🔭 |
| Barbearia / Cafeteria / Racha (Ep1–5, 1B–4C, Talk Shows) | 🧪 DEMONSTRAÇÃO | Existem protótipos (HTML + `domain_rules.ts` + `schema.sql`). "240/200 testes", "deploy 4 s", "384 comandas, zero erros" são encenação |
| Melissa CRM | ✅ IMPLEMENTADO | Código real (React/Supabase) |
| Shorts de conceito (epistêmico, confirm-once, fé bayesiana, AF447, genealogia) | ✅ conceito | |
| DAV / RVM | ✅ IMPLEMENTADO | Em produção no RVM Designações |

## Regras de texto

1. **Primeira linha = selo** (ex.: `🧪 DEMONSTRAÇÃO — protótipo didático; números e terminais
   exibidos no vídeo são ilustrativos.`).
2. Tom **sóbrio e didático**. Sem hipérbole. Explicar *o que se aprende*, não vender.
3. Para 🧪 e 🔭, incluir uma seção curta **"⚠️ O que é real e o que é ilustrativo"** com 2 a 4
   bullets concretos.
4. **Preservar os capítulos (timestamps) exatamente.** Os títulos dos capítulos podem ser
   ajustados só para tirar afirmações falsas (ex.: "240 Passing" → "Terminal de testes
   (ilustrativo)").
5. **Frases proibidas** (reescrever):
   - "criador do paradigma", "paradigma cunhado";
   - "alucinação zero", "impossível", "matematicamente provado/inquebrável/inabalável",
     "garantia absoluta", "certeza absoluta", "blindado";
   - "a programação morreu", "morte do código/da sintaxe" (aceitável só como *pergunta* ou
     *tese* explícita, ex.: "a tese de que…");
   - "Intention-Driven Development";
   - números sem fonte ("99%", "99,99%").
6. **Rodapé padrão** (sempre igual):

   ```text
   IDD — Intent-Driven Development, na formulação de Eliézer Rosa.
   Selos: ✅ implementado · 🧪 demonstração · 🔭 proposta — Cânone v1.0-rc1
   Repositório: https://github.com/EliezerRosa/idd-ide
   ```

   Antes do rodapé, o link da playlist da série (manter o que já existe, se correto).
7. **Hashtags**: no máximo 8, ao final. Remover as de apelo à autoridade sem relação direta
   (#DeepMind, #AWSAutomatedReasoning, #StanfordDSPy, #Anthropic etc.). #Z3Solver e #Dafny só
   no episódio que trata disso, que é 🔭.
8. **Restrições técnicas da API do YouTube**: descrição ≤ 4900 caracteres; título ≤ 100;
   **proibido usar os caracteres `<` e `>`** em título e descrição (a API rejeita).
9. **Títulos**: só mudar quando o título afirma fato falso ou encenado ("240 Testes & Deploy
   4s", "384 Comandas, Zero Erros", "Software Blindado", "Paradigma Definitivo"). Mantenha a
   estrutura e o SEO do resto do título.
10. **Tags**: trocar "Intention-Driven Development" por "Intent-Driven Development"; remover as
    de autoridade irrelevante; no máximo 15.

## Formato de saída (descrições)

JSON (UTF-8), lista de objetos:

```json
[{"id": "VIDEO_ID", "title": "título final (igual ao atual se não mudou)",
  "title_changed": false, "description": "…", "tags": ["…"], "selo": "🧪",
  "nota": "o que mudou e por quê, em 1 linha"}]
```
