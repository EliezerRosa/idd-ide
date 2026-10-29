# Livro de Recusas

Regras deste registro:

- Uma linha conta como **"cercou"** só se o recusador **não for um LLM** e o `exit` for reproduzível por um comando copiável.
- `idd verify --semantic` e revisão por modelo são **segunda opinião**: podem ser registradas como histórico ou falso negativo, mas não entram na meta.
- **Meta:** vinte cercas em que o gate determinístico pegou o que ninguém tinha marcado à mão (`Humano viu antes? = não`). Meta não é cota: zero linhas verdadeiras é melhor do que uma linha inventada. Fixtures de teste (`Humano viu antes? = sim (fixture)`) demonstram o funcionamento mecânico do recusador, mas não abatem a meta de 20 cercas espontâneas.
- É proibido colar a mensagem do commit `4d78025` como se uma suíte semeada de 3.000 mesas estivesse no tree (o teste determinístico real no tree exercita 50 mesas com semente fixa `0x20261029` em `cli/src/__tests__/livro-de-recusas.test.ts`).

| Data | Fase | Proposta | Recusador | Exit | Humano viu antes? | Comando | Cercou |
|---|---|---|---|---|---|---|---|
| 2026-10-26 | Fase 1 (`verify --semantic`) | `cli/src/lib/domain/evolver.ts` com divergência real perante `evolver.intent.yaml` e o arquivo inteiro visível (issue [#30](https://github.com/EliezerRosa/idd-ide/issues/30)) | nenhum (`verify --semantic` deu `92/100 ALIGNED`) | `0` | sim | `cd cli && node dist/index.js verify domain/evolver --semantic` | não (segunda opinião) |
| 2026-10-29 | Fase 0 (Loop 2 · `metodos`) | Oito contratos `fase0/racha-conta/contratos/*.intent.yaml` gerados a partir de `metodos.yaml` usando termos do domínio do caso (`Mesa`, `Participante`, `ItemConsumido`, `Cota`, `TaxaServico`, `ChavePix`, `Pagamento`) sem resolução do `dicionario.json` local do caso | `idd dictionary check --strict` | `1` | não | `cd cli && npx vitest run src/__tests__/livro-de-recusas.test.ts -t "Recusa #1"` | sim (1/20 da meta) |
| 2026-10-29 | Fase 0 / CI (fixture) | Contrato `.intent.yaml` mínimo com termo PascalCase fora do dicionário (`GhostToken`) e sinônimo proibido (`usuario` no lugar de `UserAccount`) | `idd dictionary check --strict` | `1` | sim (fixture) | `cd cli && npx vitest run src/__tests__/livro-de-recusas.test.ts -t "Recusa #1"` | sim (fixture; fora da meta) |
| 2026-10-29 | Fase 0 / CI (fixture) | Importação ilegal entre bounded contexts (`packages/core/src/leak.ts` importando `cli/src/index.js` contra `allowed_dependencies: []` em `project.intent.yaml`) | `idd verify --project` | `1` | sim (fixture) | `cd cli && npx vitest run src/__tests__/livro-de-recusas.test.ts -t "Recusa #2"` | sim (fixture; fora da meta) |
| 2026-10-29 | Fase 0 · Loop 1 (fixture) | Intenção com adjetivo vago (`"rápida"`) e termo entre colchetes duplos ausente do dicionário (`[[TaxaGarcom]]`) | `idd lint-ln` | `1` | sim (fixture) | `cd cli && npx vitest run src/__tests__/livro-de-recusas.test.ts -t "Recusa #3"` | sim (fixture; fora da meta) |
| 2026-10-29 | Fase 0 · Loop 2 (fixture) | Modelo `dominio.mmd` com dependência funcional transitiva (`%% DF Participante: cep -> cidade`) violando 3NF/BCNF | `idd fase0 gate2` | `1` | sim (fixture) | `cd cli && npx vitest run src/__tests__/livro-de-recusas.test.ts -t "Recusa #4"` | sim (fixture; fora da meta) |

