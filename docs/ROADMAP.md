# Roadmap — IDD IDE

## Visão de Produto

Criar uma IDE onde o desenvolvedor nunca começa pelo código — começa pela intenção. O código é um artefato derivado, rastreável e verificável em relação à intenção que o originou.

---

## Fase 1 — MVP ✅ (Concluída)

**Objetivo:** Provar o ciclo básico captura → geração → armazenamento.

| Entrega | Status | Descrição |
|---|---|---|
| Fork do Code-OSS | ✅ | Base `extensions/idd-core` sobre Code-OSS |
| JSON Schema `.intent.yaml` | ✅ | Validação completa com autocomplete no editor |
| Intent Capture UI | ✅ | Painel webview com 4 passos, preview YAML em tempo real |
| Intent Engine (básico) | ✅ | Parser + Claude API + Output Formatter |
| Intent Store (SQLite) | ✅ | 4 tabelas, versionamento semântico automático |
| CLI — `idd init` | ✅ | Inicializa projeto, hooks, schema, exemplo |
| CLI — `idd new` | ✅ | Assistente interativo de criação de intenção |
| CLI — `idd generate` | ✅ | Geração de código + testes + docs via LLM |
| CLI — `idd verify` | ✅ | Verificação estática de drift |
| CLI — `idd graph` | ✅ | Grafo no terminal (árvore, tabela, JSON, impacto) |
| CLI — `idd diff` | ✅ | Vista split: intenção vs código atual |
| CLI — `idd store` | ✅ | Subcomandos: list, show, history, drift, snapshot |
| Multi-linguagem | ✅ | TS, Python, Go, JavaScript, Rust, Java |
| Suite de testes | ✅ | 151 testes com Vitest (engine, verifier, store, lang, integration) |

---

## Fase 2 — Core IDD 🔄 (Em andamento)

**Objetivo:** Fechar o ciclo de feedback — o sistema aprende com o projeto e propaga alertas automaticamente.

### 2.1 Context Manager completo
- [ ] Resolução transitiva de dependências (deps de deps)
- [ ] Cache inteligente: não rebusca dependência não modificada
- [ ] Detecção de conflito de contratos entre intenções

### 2.2 Intent Verifier — análise semântica
- [ ] Integração `--semantic` no fluxo automático (não só manual)
- [ ] Threshold configurável por projeto (`.idd/config.yaml`)
- [ ] Histórico de scores de alinhamento por intenção

### 2.3 Intent Graph — painel completo
- [ ] Painel VS Code com Cytoscape.js integrado
- [ ] Filtros por status, módulo, linguagem
- [ ] Exportação como SVG/PNG para documentação
- [ ] Animação de propagação de drift

### 2.4 Git hooks — CI/CD
- [ ] GitHub Actions workflow gerado por `idd init`
- [ ] `idd verify` no pipeline de PR
- [ ] Badge de alinhamento no README (gerado automaticamente)

### 2.5 Testes de integração
- [ ] Resolver os 6 testes de integração pendentes (mock SQLite sincrono)
- [ ] Testes end-to-end do CLI com projeto fixture completo
- [ ] Cobertura mínima de 80%

---

## Fase 3 — Produto 📋 (Planejada)

**Objetivo:** Experiência de produto polida, colaboração e ecossistema.

### 3.1 `idd diff` aprimorado
- [ ] Diff real entre código gerado (v1.0) e código atual usando LCS
- [ ] Anotações semânticas por hunk (não só por linha)
- [ ] Modo `idd diff --since=v1.0` (comparar com versão específica)

### 3.2 Intent Templates
- [ ] Marketplace local de templates: `idd template list`
- [ ] Templates para padrões comuns: CRUD, auth JWT, webhook handler, etc.
- [ ] Publicação de templates: `idd template publish`

### 3.3 Colaboração multi-dev
- [ ] Resolução de conflitos de intenção no merge (`.idd/merge-strategy.yaml`)
- [ ] Comentários em intenções (como code review, mas em declarações)
- [ ] `idd blame <mod/sub>` — quem criou / modificou cada intenção

### 3.4 IDE completa (produto distribuível)
- [ ] `product.json` com branding IDD
- [ ] Ícone e tema customizados
- [ ] Marketplace próprio com Open VSX Registry
- [ ] Build para Linux, macOS, Windows (`npm run gulp vscode-*`)
- [ ] Auto-update via GitHub Releases

### 3.5 Analytics de intenções
- [ ] `idd stats` — métricas do projeto: drift rate, coverage, languages
- [ ] Dashboard de saúde do projeto (webview)
- [ ] Relatório de evolução: como as intenções mudaram ao longo do tempo

---

## Fase 4 — Ecossistema 🔮 (Visão de longo prazo)

- **IDD Server** — servidor de intenções compartilhado para equipes (tipo GitHub para `.intent.yaml`)
- **IDD Review** — processo de code review baseado em intenções: "este PR viola alguma intenção?"
- **IDD Docs** — geração automática de documentação de arquitetura a partir do grafo de intenções
- **Plugins de linguagem** — LSP dedicado para `.intent.yaml` (go-to-definition, hover, rename)
- **IDD Mobile** — captura de intenções via mobile (voz → `.intent.yaml`)

---

## Decisões de Design Pendentes

| Decisão | Opções | Status |
|---|---|---|
| Armazenamento do store em times | SQLite por dev vs. servidor central | Em avaliação |
| Estratégia de merge de intenções | Latest wins vs. manual | Pendente |
| Threshold de drift padrão | 70%, 80%, 90% | A definir |
| Política de deprecação | Soft delete vs. arquivamento | A definir |
| Modo offline do Verifier | Apenas estático vs. LLM cacheado | A definir |

---

## Métricas de Sucesso

| Métrica | Meta Fase 2 | Meta Fase 3 |
|---|---|---|
| Cobertura de testes | 80% | 90% |
| Tempo de geração (idd generate) | < 15s | < 8s |
| Taxa de drift não detectado | < 5% | < 2% |
| Linguagens suportadas | 4 | 6+ |
| Comandos CLI | 8 | 12+ |
