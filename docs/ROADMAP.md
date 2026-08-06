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

## 🔄 Fase 6 — Inteligência e Observabilidade (planejada)

| Issue | Feature | Descrição |
|---|---|---|
| #21 | `idd drift watch` — daemon de monitoramento contínuo | Escuta mudanças no filesystem e verifica drift em tempo real sem depender do git hook |
| #22 | `idd analytics` — painel de saúde do projeto | Evolução histórica de alignment scores, módulos mais instáveis, contribuidores por drift |
| #23 | Domain Model Evolution — migrações geradas automaticamente | Detecta diff entre versões do domain model e gera SQL de migração (ALTER TABLE, ADD COLUMN) |
| #24 | `idd suggest` — sugestões proativas de melhoria | LLM analisa o grafo de intenções e sugere refatorações, decomposições ou consolidações |

---

## 🔮 Fase 7 — Multi-repo e Federação (visão)

| Feature | Descrição |
|---|---|
| IDD Registry | Servidor central para compartilhar templates e domain models entre projetos |
| Cross-repo Context | Resolver `depends_on` de módulos em repositórios diferentes via IDD Registry |
| Team Playbooks | Skills pré-configuradas por organização (padrões de código, constraints corporativas) |
| IDD for APIs | `.intent.yaml` para contratos OpenAPI — gera, verifica e versiona specs REST/gRPC |

---

## Números cumulativos

| Métrica | v0.1.0 | v0.2.0 | v0.3.0 |
|---|---|---|---|
| Fases completas | 2, 3 | 4 | 5 |
| Issues fechadas | 12 | 16 | 20 |
| Testes passando | 544 | 669 | **730** |
| Suítes de teste | 17 | 21 | **22** |
| Comandos CLI | 11 | 15 | **16** (`idd domain`) |

---

## Princípios de design

1. **Intenção antes do código** — declare o quê, deixe o LLM decidir o como
2. **Drift detection é cidadão de primeira classe** — não é um lint tardio, é uma barreira
3. **Zero lock-in** — tudo é texto/YAML/SQL, sem banco proprietário ou serviço obrigatório
4. **Offline-first** — o CLI funciona 100% sem API key (modo estático)
5. **Composable** — cada componente é independente e testável isoladamente
