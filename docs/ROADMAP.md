# IDD IDE — Roadmap

## Paradigma
O IDD IDE parte de um princípio central: **a intenção é a fonte de verdade**, não o código.
Código é derivado. Testes são derivados. Documentação é derivada. A intenção é permanente.

---

## ✅ Fase 2 — MVP Funcional (concluída)

| Issue | Feature | Status |
|---|---|---|
| #1 | Context Manager — resolução transitiva de dependências | ✅ |
| #2 | Intent Verifier — análise semântica + alignment scores | ✅ |
| #3 | Intent Graph — painel VS Code com Cytoscape.js | ✅ |
| #4 | GitHub Actions CI/CD automático | ✅ |
| #5 | Testes de integração | ✅ |
| #6 | Multi-linguagem: TypeScript, Python, Go, JavaScript, Rust, Java | ✅ |
| #7 | `idd diff` com algoritmo LCS real | ✅ |
| #8 | Segurança: schema validation, dry-run, rate limit, .env | ✅ |

**Release:** v0.1.0 · 544 testes

---

## ✅ Fase 3 — Produto (concluída)

| Issue | Feature | Status |
|---|---|---|
| #9  | Intent Templates — marketplace local (crud, auth-jwt, webhook...) | ✅ |
| #10 | `idd blame` — histórico de autoria git integrado | ✅ |
| #11 | Branding: product.json, tema IDD Dark, scripts de build | ✅ |
| #12 | `idd export` — md / json / mermaid / dot | ✅ |

**Release:** v0.1.0 → v0.2.0 · 669 testes

---

## ✅ Fase 4 — Ecossistema (concluída)

| Issue | Feature | Status |
|---|---|---|
| #13 | IDD Server HTTP — sincronização de Intent Store entre equipes | ✅ |
| #14 | IDD Review — análise de PR via GitHub Actions | ✅ |
| #15 | LSP para .intent.yaml — diagnostics, hover, go-to-def, rename | ✅ |
| #16 | `idd capture` — expansão de intenção via LLM em uma linha | ✅ |

**Release:** v0.2.0 · 669 testes

---

## ✅ Fase 5 — Business Model Intent Layer (concluída)

A camada de intenções do **modelo de negócio**: o domínio é modelado em UML,
compilado em artefatos verificáveis e o schema de banco é validado automaticamente.

| Issue | Feature | Status |
|---|---|---|
| #17 | Domain UML Parser — Mermaid/PlantUML/YAML → Domain AST | ✅ |
| #18 | Domain Compiler — AST → YAML intent + JSONB Schema + SQL + erDiagram | ✅ |
| #19 | Normalization Engine — verificação 1NF → DKNF (Domain-Key Normal Form) | ✅ |
| #20 | Schema Verifier — CI/CD de conformidade migrations vs domain model | ✅ |

**Release:** v0.3.0 · 730 testes

### Fluxo da Fase 5

```
classDiagram UML          domain.mmd / .puml / .yaml
      │
      │ idd domain parse
      ▼
Domain Model AST           Entidades · Atributos · FDs · Cardinalidades
      │
      │ idd domain normalize
      ▼
Verificação 1NF→DKNF       Dependências parciais · Transitivas · MVDs · JDs
      │
      │ idd domain compile
      ▼
Artefatos verificáveis     domain.intent.yaml · schema.jsonb.json · schema.sql · er-diagram.md
      │
      │ idd domain verify
      ▼
CI/CD no PR                Score 0-100% por entidade · Comentário automático
```

---

## ✅ Fase 6 — Inteligência e Observabilidade (concluída)

O projeto passa a se auto-monitorar e se auto-analisar continuamente.

| Issue | Feature | Status |
|---|---|---|
| #21 | `idd drift watch` — daemon de monitoramento contínuo (fs.watch, debounce, status em tempo real) | ✅ |
| #22 | `idd analytics` — sparklines de alignment score, módulos instáveis, velocity | ✅ |
| #23 | `idd domain evolve` — diff entre domain models, SQL de migração classificado safe/warn/breaking | ✅ |
| #24 | `idd suggest` — análise estática do grafo (circular, ghost, orphan, overspecified) + LLM opcional | ✅ |

**Release:** v0.4.0 · 766 testes

---

## ✅ Fase 7 — Multi-repo e Federação (concluída)

| Issue | Feature | Status |
|---|---|---|
| #25 | `idd api` — geração de OpenAPI 3.1 a partir de .intent.yaml, com verificação de drift | ✅ |
| #26 | Team Playbooks — constraints obrigatórias e lint rules por organização | ✅ |
| #27 | IDD Registry — push/pull/search de templates, domain models e playbooks | ✅ |
| #28 | `idd migrate` — inferência de intenções a partir de codebase existente via LLM | ✅ |

**Release:** v0.5.0 · 830 testes

---

## 🔄 Fase 8 — Dogfooding e Maturidade (proposta)

Antes de expandir mais o escopo, o próximo passo natural é o projeto praticar
o próprio paradigma e amadurecer a base existente.

| Feature | Descrição |
|---|---|
| Dogfooding do CLI | Criar `.intent.yaml` para os próprios comandos do IDD CLI (30+ módulos) |
| Publicação real no Open VSX | `vsce package && npx ovsx publish` — hoje documentado mas nunca executado |
| Prebuilds de `better-sqlite3` | Empacotar binários nativos pré-compilados por plataforma no release, evitando build-from-source |
| Auditoria de segurança | `npm audit fix` nas 8 vulnerabilidades conhecidas nas dependências |
| Testes de integração real | Testes que rodam o binário compilado de ponta a ponta, não apenas lógica mockada |

---

## Números cumulativos

| Métrica | v0.1.0 | v0.2.0 | v0.3.0 | v0.4.0 | v0.5.0 |
|---|---|---|---|---|---|
| Fases completas | 2, 3 | 4 | 5 | 6 | 7 |
| Issues fechadas | 12 | 16 | 20 | 24 | **28** |
| Testes passando | 544 | 669 | 730 | 766 | **830** |
| Suítes de teste | 17 | 21 | 22 | 23 | **24** |
| Comandos CLI | 11 | 15 | 16 | 20 | **24** |

---

## Princípios de design

1. **Intenção antes do código** — declare o quê, deixe o LLM decidir o como
2. **Drift detection é cidadão de primeira classe** — não é um lint tardio, é uma barreira
3. **Zero lock-in** — tudo é texto/YAML/SQL, sem banco proprietário ou serviço obrigatório
4. **Offline-first** — o CLI funciona 100% sem API key (modo estático)
5. **Composable** — cada componente é independente e testável isoladamente

## Limitações conhecidas

- `better-sqlite3` requer compilação nativa (node-gyp) — ambientes sem toolchain de
  build (gcc/Xcode/MSVC) ou sem acesso à rede para baixar headers do Node.js
  falharão na instalação. Prebuilds por plataforma estão na Fase 8.
- O próprio projeto IDD IDE ainda não pratica seu paradigma sobre si mesmo —
  não há `.intent.yaml` para os comandos do CLI. Isso está na Fase 8.
- A extensão VS Code nunca foi publicada no Open VSX Registry — apenas
  documentada e testada localmente via `tsc -p ./`.
