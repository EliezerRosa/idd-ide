# Gestão de Refrigeração (HVAC-R) & Paradigma IDD (Intent-Driven Development)

Sistema avançado de gestão técnica e operacional de **Refrigeração Comercial, Industrial e Climatização (HVAC-R)**, estruturado em estrita conformidade com as normas regulatórias (**PMOC - Lei 13.589/2018** e **Portaria MS 3.523/1998**), construído sob os pilares do **Paradigma IDD (Intent-Driven Development)** — a disciplina formal de Engenharia de Software pós-sintaxe.

---

## 📂 Estrutura do Repositório

### 1. Especificações Canônicas de Domínio & Métodos Formais (`docs/`)
* 📄 **[`docs/refrigeracao_domain_spec.md`](docs/refrigeracao_domain_spec.md)**  
  Especificação canônica de HVAC-R:
  - Invariantes de negócio (vácuo em mícrons, balanço estequiométrico de fluidos, trava PMOC, máquina de estados de OS).
  - Modelo relacional (Contratos, Equipamentos, Ordens de Serviço, Laudos, Medições).
  - Operação híbrida Online / Offline First para técnicos em campo.
* 📄 **[`docs/bounded_contexts_transacoes_atomicas_spec.md`](docs/bounded_contexts_transacoes_atomicas_spec.md)**  
  Arquitetura de contextos delimitados e o **Protocolo Canônico da Ação Atômica em 4 Fases** (Guarda, Mutação, Selagem, Compensação).
* 📄 **[`docs/idd_seo_academic_keywords_manifest.md`](docs/idd_seo_academic_keywords_manifest.md)**  
  Manifesto acadêmico com as 7 perspectivas teóricas do Paradigma IDD: Ontologia da Intenção, IA Neuro-Simbólica, Compiladores Declarativos (Intent IR), Métodos Formais (SMT Solvers), Engenharia Constitucional, Diff Semântico de Intenções e Sagas de Domínio.
* 🌐 **Visualizadores de Diagramas MER e UML:**
  - MER HVAC-R: [`docs/visualizar_mer_Refrigeração.html`](docs/visualizar_mer_Refrigeração.html)
  - UML HVAC-R: [`docs/visualizar_uml_Refrigeração.html`](docs/visualizar_uml_Refrigeraçã.html)
  - Casos de Uso: Barbearia, Cafeteria e Racha de Conta.

### 2. Apresentações Interativas com Zero Rolagem (`apresentacao/`)
* 🌐 **[`apresentacao/apresentacao_idd_perspectiva_tecnica.html`](apresentacao/apresentacao_idd_perspectiva_tecnica.html)** ⭐ **[DESTAQUE]**  
  Apresentação técnica com 10 slides e 20 GIFs em alta resolução (10 reações de desenvolvedores + 10 reações de usuários reais) demonstrando os 5 pilares do IDD frente ao "Vibe Coding".
* 🌐 **[`apresentacao/apresentacao_mer.html`](apresentacao/apresentacao_mer.html)**  
  Apresentação técnica do MER para desenvolvedores e manutenção HVAC-R com narração sintética e atalhos de navegação.
* 🌐 **[`apresentacao/apresentacao_bounded_contexts_transacoes.html`](apresentacao/apresentacao_bounded_contexts_transacoes.html)**  
  Visualização de segregação de contextos, limites de consistência e sagas de transações.
* 🌐 **[`apresentacao/proposta_simplificada.html`](apresentacao/proposta_simplificada.html)**  
  Proposta ágil da jornada de 5 passos do mecânico sem atrito (zero rolagem).

### 3. Aplicações de Referência (`apps_exemplos/`)
* 💈 **[`apps_exemplos/barbearia_agendamento/`](apps_exemplos/barbearia_agendamento/)**: App, regras em TypeScript e schema SQL para agendamentos e cancelamentos.
* ☕ **[`apps_exemplos/cafeteria_comanda/`](apps_exemplos/cafeteria_comanda/)**: Gestão de comandas, fichas técnicas e consumo em tempo real.
* 🍕 **[`apps_exemplos/racha_conta_pix/`](apps_exemplos/racha_conta_pix/)**: Divisão de despesas de mesa com rateio individual e geração de Pix.

### 4. Motor de Renderização Motion Graphics (`motion_graphics_renderer/`)
Pipeline determinístico desacoplado (**Frame-Pipe**) com Playwright Chromium headless e FFmpeg CFR para geração de vídeo com zero travamento e sincronismo labial e de slides.

### 5. Pipeline de Produção & Automação YouTube (`producao_yt/`)
Scripts de síntese neural multi-voz (Edge-TTS), mixagem, geração de legendas SRT e integração com a YouTube Data API v3 para publicação e gestão de playlists nos canais **`@eliezerjprosa`** e **`Zico Josias`**.

---

## 🚀 Como Executar as Apresentações Localmente

Inicie o servidor HTTP local:
```powershell
python -m http.server 8085
```
E acesse no navegador:
- Especial Perspectiva Técnica: **`http://localhost:8085/apresentacao/apresentacao_idd_perspectiva_tecnica.html`**
- Apresentação Técnica do MER: **`http://localhost:8085/apresentacao/apresentacao_mer.html`**
- Bounded Contexts & Transações: **`http://localhost:8085/apresentacao/apresentacao_bounded_contexts_transacoes.html`**
- Nova Proposta Simplificada: **`http://localhost:8085/apresentacao/proposta_simplificada.html`**
