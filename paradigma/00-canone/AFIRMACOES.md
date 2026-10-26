# Matriz de Afirmações — Afirmação → Evidência → Status

Referência para revisar vídeos, apresentações e textos. Levantada em 2026-10-26 cruzando o
acervo com o código (`cli/`, `packages/`, `40-evidencias/`). Atualize esta matriz quando algo
mudar de status.

| # | Afirmação pública | Status | Evidência / observação |
| --- | --- | --- | --- |
| A1 | Comando Epistêmico vs. Operacional orienta o trabalho com agentes | ✅ | Prática documentada (RVM, idd-ide, runbooks `.intent.md`) |
| A2 | DAV: LLM só produz `{ação, parâmetros}`; dados nunca passam pelo LLM; fast-path regex | ✅ | RVM Designações (9 handlers `QUERY_*`, 7 famílias de regex PT-BR, mai/2026). O código está no repo do RVM, não no acervo |
| A3 | Confirm-Once: aprovar o plano uma vez e o agente executa até o fim | ✅ | Prática de trabalho com agentes; registrado nas memórias e no veredito de set/2026 |
| A4 | Dicionário ubíquo verificável (termo fora do dicionário gera alerta) | ✅ | `idd dictionary check --strict`, LSP `idd.dictionary.*`, hard gate no CI do idd-ide |
| A5 | Contrato de intenção versionado com verificação de drift | ✅ (parcial) | `.intent.yaml` + Intent Store + `idd verify`; LSP detecta mutação fora de `state_mutation`. Sem circunscrição completa por método |
| A6 | Leiga criou um CRM com IA (Melissa / NexusLog) | ✅ | Código React/Supabase em `40-evidencias/nexuslog-crm-melissa` |
| A7 | Apps Barbearia, Cafeteria e Racha de Conta com invariantes | 🧪 | Protótipos: HTML + `domain_rules.ts` + `schema.sql`, com checagens em runtime (CHECK, trigger, `throw`). Não são apps em produção |
| A8 | "240 testes aprovados em < 1 s", "200 testes", "384 comandas, zero erros" | 🧪 | Terminais encenados nos vídeos; as suítes não existem no acervo |
| A9 | "Deploy em 4,2 s / 3,8 s em produção global" | 🧪 | Encenação; não há pipeline de deploy desses apps |
| A10 | App de Refrigeração (HVAC-R/PMOC) construído e implantado | 🧪 / 🔭 | Existem spec de domínio, MER, UML e apresentações. **Não há app**. `migration_001… APLICADO` é encenação. A proposta enxuta ao cliente removeu as travas termodinâmicas e o PMOC rígido |
| A11 | Laudo técnico assinado (CREA/CFT) no vídeo de Refrigeração | 🧪 | Elemento cênico; rotular como ilustrativo |
| A12 | Offline-first (IndexedDB/SQLite/CRDT) | 🔭 | Zero ocorrências nos protótipos |
| A13 | Invariantes "provadas matematicamente" por SMT (Z3/Dafny); "REJEIÇÃO FORMAL Z3" | 🔭 | Zero ocorrências de Z3/SMT/Dafny no código. Correção técnica: prova = negação **UNSAT**, não "satisfatível" |
| A14 | "Alucinação zero", "impossível de passar", "matematicamente inquebrável" | 🔭 (hipérbole) | Nenhum mecanismo garante isso. Formular como: *violação de invariante declarada é detectada pelo gate X* |
| A15 | Intent IR (AST do domínio com gramática) | 🔭 | Existe `.intent.yaml` com `constraints` em texto livre, validado por schema |
| A16 | Máquina de Diff Semântico de Intenções (Classes A/B/C) | 🔭 | `idd diff` atual faz checagens por regex |
| A17 | Sagas / Ação Atômica em 4 fases (Guarda, Mutação, Selagem, Compensação) | 🔭 (método) | Especificado em `40-evidencias/refrigeracao-hvacr/docs/bounded_contexts…`. Sem implementação de referência |
| A18 | "99% de redução de ambiguidade", "99,99% de eficiência" | ❌ remover | Números sem método |
| A19 | "O código-fonte morreu" / "fim da sintaxe manual" | 🔭 (visão) | Formular como tese de direção, não como fato |
| A20 | "Criador do paradigma IDD" | ❌ reformular | A **sigla** circulava antes (ebook de Stockley em 13/04/2026; intent-driven.dev), como metodologia documental. A **formulação como paradigma** (Comando Epistêmico, DAV, Confirm-Once, IDE) é independente e própria. Usar "IDD na formulação de Eliézer Rosa". Linha do tempo em [IDD-CANONE.md §8](IDD-CANONE.md) |
| A21 | 2PC (Ep3D) vs. "2PC não escala, use Sagas" (Ep08) | ⚠️ conciliar | Posição canônica: Sagas entre contextos; transação ACID local dentro de um contexto |
