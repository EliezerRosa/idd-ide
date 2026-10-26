# MEMO & ESTADO ATUAL - Projeto IDD Refrigeração (HVAC-R) & Paradigma IDD

**Data da Última Atualização:** 2026-10-26  
**Fase Atual:** Paradigma IDD Consolidado, Especificações Canônicas de Domínio (HVAC-R & Casos de Uso), Produção e Publicação Multicanal no YouTube (Canais @eliezerjprosa e Zico Josias) e Arquitetura de Renderização Headless Estável.

---

## 📌 1. O Que Já Foi Construído, Validado e Publicado

### 1.1 Especificações Canônicas de Domínio e Fundamentação Teórica
- **Especificação Canônica de Domínio HVAC-R (`docs/refrigeracao_domain_spec.md`):** Mapeamento estrito das invariantes de climatização e refrigeração comercial/industrial, conformidade legal com **PMOC (Lei 13.589/2018 e Portaria MS 3.523/1998)**, balanço de fluidos refrigerantes, vácuo em mícrons, máquina de estados de OS e operação offline-first.
- **Especificação de Bounded Contexts & Transações Atômicas (`docs/bounded_contexts_transacoes_atomicas_spec.md`):** Definição formal dos contextos delimitados (Operações Técnicas, Auditoria Legal/PMOC, Contratos/Financeiro, Almoxarifado/Fluidos), entidades agregadas e **Protocolo Canônico da Ação Atômica em 4 Fases** (Guarda, Mutação, Selagem, Compensação).
- **Manifesto de Indexação Acadêmica & Engenharia de SEO do IDD (`docs/idd_seo_academic_keywords_manifest.md`):** Consolidação das **7 Perspectivas Teóricas & Acadêmicas** do Paradigma IDD (*Intent-Driven Development*), posicionando-o como Engenharia de Software 3.0 pós-sintaxe (IA Neuro-Simbólica, Compiladores Declarativos / Intent IR, SMT Solvers / Automated Reasoning, Engenharia Constitucional, Diff Semântico de Intenções e Sagas de Domínio).
- **Visualizadores Interativos de MER e UML (`docs/visualizar_*.html`):** Dashboards e esquemas visuais com diagramas Mermaid e Crow's Foot para HVAC-R Refrigeração, Barbearia, Cafeteria e Racha de Conta.

### 1.2 Apresentações Interativas de Zero-Rolagem e Demonstração UX
- **Apresentação Especial de Perspectiva Técnica (`apresentacao/apresentacao_idd_perspectiva_tecnica.html`):** Apresentação com 10 slides, 20 GIFs em alta resolução (10 reações de desenvolvedores + 10 reações de usuários reais) demonstrando a superação do "Vibe Coding" e os 5 pilares de formalização do IDD.
- **Apresentação Técnica do MER (`apresentacao/apresentacao_mer.html`):** 8 slides técnicos para desenvolvedores e equipe de manutenção, detalhando tabelas, chaves primárias/estrangeiras, regras de negócio e narração sintética.
- **Apresentação Bounded Contexts & Transações (`apresentacao/apresentacao_bounded_contexts_transacoes.html`):** Alinhamento visual e estrutural de segregação de contextos e isolamento transacional.
- **Proposta Simplificada & Alinhamento (`apresentacao/proposta_simplificada.html` e `apresentacao/index.html`):** Jornada de 5 passos do mecânico sem atrito e comparativo "Sai vs Fica" para clientes.

### 1.3 Aplicações de Referência com Regras e Schemas (`apps_exemplos/`)
- **App Barbearia & Salão (`apps_exemplos/barbearia_agendamento/`):** Interface `app_barbearia.html`, regras em TypeScript (`domain_rules.ts`) e banco de dados relacional (`schema.sql`).
- **App Cafeteria & Padaria (`apps_exemplos/cafeteria_comanda/`):** Interface de comandas e fichas técnicas (`app_cafeteria.html`), regras de invariantes (`domain_rules.ts`) e schema (`schema.sql`).
- **App Racha de Conta & Pix (`apps_exemplos/racha_conta_pix/`):** Interface de divisão justa de consumo (`app_racha_conta.html`), regras puras de cálculo (`domain_rules.ts`) e schema (`schema.sql`).

### 1.4 Motor de Renderização Motion Graphics (`motion_graphics_renderer/`)
- **Arquitetura Frame-Pipe Determinística:** Superação definitiva da falha de congelamento de tela via Chromium Playwright headless através do desacoplamento total entre `page.screenshot()` e `FFmpeg image2pipe CFR`.
- **Scripts de Renderização Automatizados:** Renderizadores dedicados para episódios 1B, 2B, 3, 3B, 3C, 3D, 4, 4B, 4C, 4D, 4E, 4F, 5 e Especial de Perspectiva Técnica.

### 1.5 Pipeline de Áudio Neural e Publicação YouTube (`producao_yt/`)
- **Síntese Neural de Alta Fidelidade:** Locução neural Edge-TTS multi-voz (Antônio, Francisca, Thalita, Brenda, Fábio) com controle de pausas, eliminação de ruído e masterização LUFS.
- **Gestão Automatizada de Canais e Playlists:** Uploads, legendas SRT e metadados sincronizados via YouTube Data API v3 (`upload_manifest.json`).

---

## 📺 2. Ecossistema Multicanal e Vídeos Publicados

### Canal Eliézer Rosa (`@eliezerjprosa`)
- **Playlist Principal IDD Refrigeração & Metodologia:** `https://www.youtube.com/playlist?list=PLNkRuKhFHiBs` (ID: `PLNkRuKhFHiBs`)
  - Vídeo Manifesto Oficial: `uaUKrnagVb4` | Short Vertical: `r2hTBA9f6DA`
  - Refrigeração Ep 1 a Ep 4 (Originais e Remasterizados): `GKzaXOfl_0E`, `0Kw7L_0wbdI`, `Q-dhHSxxIJ0`, `K__7BKaaclU`
  - Metodologia Ep 1B (Requisitos): `DiOLR6G_I20` | Ep 2B (MER): `pfRvCRqG-rs` | Ep 3B (UML): `0IAil4qzCUg` | Ep 4B (Governança): `GtZmMaE7Nyk` | Ep 5 (Futuro): `ZDduoIZdZ6I`
  - Teoria Avançada: Ep 3C (Bounded Contexts: `qiIuQaiyejY`) | Ep 3D (Transações Atômicas: `H20yVSuyCdg`) | Ep 4C (Diff de Intenções: `v2JFTd3KJqs`) | Ep 4D (Invariantes Temporizadas: `dNAq3rsaptQ`) | Ep 4E (Ergonomia Industrial: `GIvXYuVpDOU`) | Ep 4F (Offline First: `oM-VEojObi4`)
  - Talk Show de Homologação MER & UML Completo: `Z8vzxfNrAwE`
- **Playlist Especial Perspectiva Técnica:** `https://www.youtube.com/playlist?list=PLW-P0rMNaKDs` (ID: `PLW-P0rMNaKDs`)
  - Vídeo Especial dos 5 Pilares: `sIN3nMc7Nhw`
- **Playlist Casos de Uso IDD:** `https://www.youtube.com/playlist?list=PLAyb9-CLqwPA` (ID: `PLAyb9-CLqwPA`)
- **Playlists de Casos de Uso para Leigos:**
  - Barbearia & Salão: `https://www.youtube.com/playlist?list=PLHCqwtNiGbt8` (Episódios 2, 2B, 2C, 3, 3B, 3C, 4, 4B, 4C, 5)
  - Cafeteria & Padaria: `https://www.youtube.com/playlist?list=PLLfynRT3_DJs` (Episódios 1, 1B, 2, 2B, 2C, 3, 3B, 3C, 4, 4B, 4C, 5)
  - Racha de Conta & Pix: `https://www.youtube.com/playlist?list=PLdaNms3TnbXA` (Episódios 1, 1B, 2, 2B, 2C, 3, 3B, 3C, 4, 4B, 4C, 5)

### Canal Zico Josias
- **Playlist de Apresentação:** `https://www.youtube.com/playlist?list=PLMWN1EWhq5tM` (ID: `PLMWN1EWhq5tM`)
  - Melissa CRM (`oPcNC5FXnHY`) + Episódios Refrigeração 1 a 4 + Shorts Técnicos

---

## 🛠 3. Decisões Arquiteturais e Invariantes Registradas

1. **Soberania da Intenção vs. Epifenômeno Sintático:** O código em TypeScript, Python ou SQL é um meio efêmero. O patrimônio perene da empresa é a **Intent IR (Intermediate Representation)** e suas invariantes declaradas.
2. **Tribunal Simbólico Determinístico:** Superação do modelo probabilístico dos LLMs. Mutações e código gerado precisam ser aprovados por verificação lógica formal e SMT Solvers antes de entrar em compilação ou deploy.
3. **Máquina de Diff de Intenções (Classificação Tripartida):**
   - *Classe A (Aditiva):* Novos campos opcionais ou tabelas independentes (aprovação automática por agentes).
   - *Classe B (Restritiva):* Enrijecimento de tipos e novas invariantes com raio de alcance calculado.
   - *Classe C (Ruptura):* Exige padrão *Expand and Contract* e aprovação humana soberana inegociável.
4. **Protocolo Canônico da Ação Atômica em 4 Fases:**
   - *Fase 1 (Guarda):* Validação estrita de pré-condições com fail-fast.
   - *Fase 2 (Mutação):* Execução isolada e idempotente.
   - *Fase 3 (Selagem):* Validação de pós-condições, integridade relacional e emissão do Domain Event append-only.
   - *Fase 4 (Compensação):* Ação compensatória simétrica pré-declarada.
5. **Arquitetura de Dados HVAC-R (Foco na Máquina):** A entidade central é o Equipamento (`qr_code_id`). O laudo legal (`LAUDO_PMOC`) é estritamente segregado das medições de ciclo frigorífico (`MEDICAO_TECNICA`).
6. **Premissa Offline-First:** Operação garantida para mecânicos em campo sem conectividade (casas de máquinas, subsolos e câmaras frigoríficas), com sincronização determinística por eventos de domínio.
7. **Frame-Pipe Determinístico para Renderização:** Gravação headless desacoplada em tempo discreto via `page.screenshot()` sequencial e FFmpeg CFR, eliminando congelamentos de tela e garantindo sincronia perfeita com o áudio.

---

## 🚧 4. Próximos Passos (Pendências Ativas)

1. **Deploy da Base Supabase (Schema Canônico HVAC-R):** Subir as tabelas e políticas de RLS (*Row Level Security*) multi-tenant para `Equipamento`, `Laudo_PMOC`, `Ordem_Servico` e `Medicao_Tecnica`.
2. **Interface do App de Campo (Offline-First):** Implementar o client em React/Vite com PWA, SQLite/IndexedDB local e sincronização transparente ao restabelecer conexão.
3. **Integração com Mecanismo de Assinatura Digital e Geração de PDF do PMOC:** Automação da emissão de laudo em conformidade com as exigências de auditoria da ANVISA e Lei 13.589/2018.
