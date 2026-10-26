# RVM Designações (Antigravity)

**Sistema Unificado de Gestão de Designações para Reuniões Cristãs**

## 📋 Sinopse
Plataforma web para coordenadores e secretários gerenciarem de forma automatizada as designações semanais de reuniões, com geração inteligente baseada em rodízio justo e elegibilidade.

## ✨ Funcionalidades

### 📖 Apostila (WorkbookManager)
- Importação de apostilas via Excel/PDF.
- Visualização e edição de partes por semana.
- Geração automática de designações com motor de rodízio unificado.
- Geração de formulários S-140 (Room B A4) e S-89.

### 🤖 Agente RVM
- Chat com IA (Gemini) contextualizado com dados reais.
- Preview S-140 integrado com navegação por semana.
- Painel de controle com análise de scores e explicações.
- Ações ativas: designar, simular, limpar, navegar.

### 🎯 Agente Curador IA & Base de Conhecimento Permanente
- Botão flutuante retrátil ergonômico posicionado no rodapé esquerdo.
- Curadoria semântica e casting assistido parte a parte na semana em foco.
- Base de conhecimento relacional de perfis sintéticos no Supabase (`curator_profiles` e `curator_batch_insights`).
- Agente Especialista de Lote que auto-analisa temas de novas apostilas importadas e enriquece os perfis com insights práticos.
- Sistema Híbrido: ponto de partida determinístico via multi-select no cadastro de publicadores (+300 pts) mantendo flexibilidade total de escolha para todos os elegíveis da semana.
- Isolamento absoluto: zero alteração no motor determinístico de rodízio automático.


### ✅ Aprovações
- Fluxo de revisão para anciãos confirmarem propostas.

### 👥 Publicadores
- Cadastro com privilégios, gênero, grupo e disponibilidade.
- Verificador de duplicatas.

### 💾 Backup
- Exportação/importação completa (JSON/Excel) de todas as tabelas.

### 📊 Admin Dashboard
- Monitoramento de custos da API Gemini.
- Métricas de resiliência e saúde do sistema.

## 🏗️ Arquitetura

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, TypeScript, Vite 7 |
| Backend (API) | Supabase (PostgreSQL + Realtime) |
| IA | Gemini 1.5 Flash via Serverless Function |
| Deploy | GitHub Pages (CI/CD via GitHub Actions) |

## 🚀 Desenvolvimento Local

```bash
npm install
npm run dev
```

## 📚 Documentação

- [Manifesto Técnico do RVM Designações](docs/manifesto_tecnico_rvm_designacoes.md)

---

## 🎙 IDD em Produção — Série no YouTube

Este projeto é a **implementação viva** do paradigma **IDD (Intent-Driven Development)** — onde a intenção humana em linguagem natural governa todo o código, construído em parceria com **GitHub Copilot Agent**.

[![IDD Ep.1 — O que é Intent-Driven Development?](https://img.youtube.com/vi/lNEr7vb0Gyo/maxresdefault.jpg)](https://www.youtube.com/watch?v=lNEr7vb0Gyo)

**▶ [Ep.1 — O que é IDD? (23 min)](https://www.youtube.com/watch?v=lNEr7vb0Gyo)**  
Deep-dive completo: definição, as 6 propriedades essenciais, Confirm-Once Pattern, genealogia intelectual (Engelbart → Kay → Brooks → IDD) e demonstração prática com este projeto.

📺 [Série completa: IDD — Base de Conhecimento](https://www.youtube.com/playlist?list=PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7)

---
*Desenvolvido por [Eliezer Rosa](https://github.com/EliezerRosa) como parte do projeto Antigravity.*
