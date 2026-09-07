# Eliezer — perfil & trajetória (registrado 2026-04-28)

- Voltou à área de software após **pausa >30 anos**.
- Preferência histórica: **conceitos, princípios, abstração** — a parte mais abstrata da construção de software.
- Reentrada coincide com convergência atual: LLMs + IDD permitem que a visão arquitetural-semântica do humano seja executada pela IA. Linhagem: Bush → Engelbart → Sutherland → Kay → Brooks → Nielsen → Raskin → Berners-Lee → Gruber.
- Modelo de colaboração assumido: **"Eliezer pensa, IA constrói"** (slide meta-narrativo da apresentação YouTube).
- Estado emocional ao ver materializado: "stupefado e profundamente encantado" — pelo poder de compartilhar sua visão enquanto aprende fazendo.
- Implicação para o agente: priorizar diálogo conceitual, expor decisões arquiteturais antes de implementar, respeitar abstrações que ele propõe — ele é o arquiteto, não o copiloto.

## Perfil consolidado (versão Gemini, ratificada pelo Eliezer)

### Origens & liderança técnica
- 1976 — treinamento IBM Brasil em **RPG II**; também trabalhou com **Cobol** e **DCAlgol**.
- Carreira em médias/grandes empresas: programador → analista de sistemas → líder de divisões de suporte e metodologias.
- Década de 1990 (1990-1999): pesquisas e palestras sobre **OO e IA** em UFBA, Telemar, Grupo Paes Mendonça.
- Identidade pública dos repos/projetos: **Eliezer Rosa**.

### Marco técnico — Two-Phase Commit no Paes Mendonça
- DBA em ecossistema **UNISYS / SGBD DASL**.
- Arquitetou **2PC customizado** quando isso era raro/complexo: **DCAlgol** (controle de baixo nível + comunicação) + **Cobol** (regras de negócio) suprindo lacunas nativas do SGBD.
- Mecanismo próprio de **Rollback** (desfaz transações incompletas em falha) e **Forward** (reaplica a partir de logs de auditoria) — resiliência e atomicidade em missão crítica online tempo real.

### Evolução metodológica
- **Antes da UML virar padrão**, idealizou e implementou padrão próprio de modelagem.
- Transitou por todos paradigmas da época: Análise Estruturada → OO → Arquitetura Orientada a Eventos.
- Resultado: representação visual+semântica que antecipou clareza de domínio que a indústria só formalizou depois.

### Salto atual — Engenharia de IA autônoma
- **IDD (Intent-Driven Development)**: linguagem natural estruturada como fonte primária de especificação e governança.
- **Projeto AEON**: materialização do IDD — orquestrador semântico que traduz intenções em arquiteturas.
- **Ferramental**: Antigravity, Cline, CrewAI, MCPs, VS Code, Supabase.
- **Prática viva**: aplica em **RVM Designações** e **TJ**, com disciplina DDD (Bounded Contexts, linguagem ubíqua).

### Filosofia
- Princípio: **"Aprender Fazendo"**.
- Engenheiro **autodidata e multidisciplinar**.
- Une rigor algorítmico de mainframe à agilidade da era IA — ponte entre teoria arquitetural de ponta e implementação resolutiva.
