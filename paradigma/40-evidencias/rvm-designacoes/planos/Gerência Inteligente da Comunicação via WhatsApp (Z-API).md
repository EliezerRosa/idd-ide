# Gerência Inteligente da Comunicação via WhatsApp (Z-API) - Arquitetura 100% Desacoplada

Este plano propõe a criação de um motor inteligente e autônomo para recepção, processamento contextual de intenções e fechamento de ciclo (closed-loop) das interações via WhatsApp (Z-API) com publicadores e superintendência, **sem alterar uma única linha do código existente do RVM**.

---

## 1. Princípios de Isolamento e Não-Regressão

| Princípio | Implementação no Plano |
| :--- | :--- |
| **Zero Modificações no Código Atual** | Nenhum arquivo existente em `src/services/` (`zapiOrchestrator.ts`, `weekPublishService.ts`, `whatsappAutoService.ts`, etc.), `src/components/`, ou funções Deno existentes será modificado. |
| **Chave Mestre de Ativação (Toggle)** | Controlado via configuração em banco (`settings.zapi_smart_manager_active`). Se `false`, o novo webhook encerra em < 10ms com `200 OK`, sem tocar em nada. |
| **Mudança do Curso da Interação** | O Z-API passa a ser bidirecional: respostas de publicadores (texto livre, áudio, reações de emoji 👍/❌, botões) são interpretadas e geram confirmação automática, alerta imediato de recusa para a liderança ou acolhimento de dúvidas. |
| **Tratamento de Impactos Inevitáveis** | Mapeamento explícito das zonas de acoplamento inevitável (estado compartilhado de tabelas e webhook Z-API) com salvaguardas e idempotência. |

---

## 2. Análise Crítica: Impactos Inevitáveis e Zonas de Acoplamento

Conforme solicitado no requisito 4 (*"Planeje e considere impacto inevitável, se de todo impossível o absoluto desacoplamento"*), identificamos os pontos onde o desacoplamento **absoluto** encontra a realidade de um sistema compartilhado e as soluções adotadas:

### 2.1. O Ponto Único de Entrada do Webhook no Z-API
* **Impacto Inevitável**: O Z-API possui uma única URL de webhook configurável por instância para mensagens recebidas (`on-message-received`). Quando apontamos esse webhook para nossa nova Edge Function, todo tráfego receptivo da instância passa por ela.
* **Solução e Salvaguarda**:
  1. Se `zapi_smart_manager_active = false`, a função responde imediatamente `{ "active": false, "ignored": true }` e encerra.
  2. A função ignora mensagens de grupos (a menos que mencionem o bot), mensagens enviadas pelo próprio bot (`fromMe: true`) e mensagens de contatos não cadastrados na congregação.

### 2.2. Estado Compartilhado de Banco de Dados (`workbook_parts`)
* **Impacto Inevitável**: Para que a confirmação de uma parte ou a recusa tenha efeito no RVM (atualizando o Status Board, os cartões S-89 e os relatórios do sistema), o motor inteligente **precisa** atualizar `workbook_parts.status` para `'DESIGNADA'` ou `'REJEITADA'`.
* **O Efeito Colateral Descoberto**:
  * O banco de dados possui o trigger `trg_webhook_whatsapp_orchestrator` associado à Edge Function `webhook-whatsapp-orchestrator`.
  * Quando uma linha de `workbook_parts` transiciona de `'ENVIADA'` para `'DESIGNADA'`, esse trigger tradicional envia uma mensagem estática: *"✅ Confirmação Recebida! Ficamos felizes em saber que você poderá realizar sua parte..."*.
  * Se o Gerenciador Inteligente também responder ao publicador com uma mensagem empática personalizada, o publicador receberia **duas mensagens** consecutivas.
* **Proposta de Tratamento (Duas Alternativas para Decisão)**:
  * **Opção A (Pureza Absoluta de Código Zero-Touch - Recomendada se não quiser tocar em migrations antigas)**: O Gerenciador Inteligente atualiza o banco de dados e registra a auditoria. Ele envia resposta conversacional própria apenas em casos de *Recusa, Dúvidas, Permutas ou Perguntas*. Em confirmações puras, ele deixa o trigger padrão disparar o recibo oficial ou envia um emoji/reação direta no WhatsApp, eliminando qualquer duplicidade.
  * **Opção B (Bypass Condicional Elegante)**: Um script SQL simples adiciona ao trigger existente uma verificação de 2 linhas: se `zapi_smart_manager_active` for `'true'`, o trigger clássico silencia, permitindo que o Gerenciador Inteligente envie uma resposta calorosa e contextual via IA. Se for `'false'`, o trigger clássico opera normalmente.

### 2.3. Condições de Corrida e Concorrência (Race Conditions)
* **Impacto Inevitável**: Um publicador pode responder no WhatsApp no exato instante em que o superintendente está alterando ou cancelando a designação no painel web.
* **Solução e Salvaguarda**: Usar controle de concorrência otimista: o update em `workbook_parts` só é executado se `status = 'ENVIADA'`. Se o status já tiver mudado para `CANCELADA` ou se o publicador designado já for outro, o motor inteligente não sobrescreve o banco e responde carinhosamente: *"Olá, Irmão! Esta designação já foi atualizada recentemente pela comissão. Qualquer dúvida, contate o superintendente."*

---

## 3. Arquitetura da Solução

```
                   ┌────────────────────────────────────────────────────────┐
                   │               Publicador no WhatsApp                   │
                   └──────────────────────────┬─────────────────────────────┘
                                              │ (Texto, Emoji 👍, Botão)
                                              ▼
                   ┌────────────────────────────────────────────────────────┐
                   │                  Instância Z-API                       │
                   └──────────────────────────┬─────────────────────────────┘
                                              │ Webhook HTTP POST
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│               NOVA EDGE FUNCTION: zapi-smart-webhook (ISOLADA)                          │
│                                                                                         │
│  [1. Check Toggle] ──(se inativo)──► Retorna 200 OK { active: false }                   │
│          │                                                                              │
│          ▼ (se ativo)                                                                   │
│  [2. Resolução Contextual em 4 Camadas]:                                                │
│      ├─ Camada 1: Quoted Message ID ──► Match em `zapi_dispatch_log.message_id`         │
│      ├─ Camada 2: Emoji Reaction (👍, ❤️, ❌) no card S-89 enviado                      │
│      ├─ Camada 3: Resposta de Botão Interativo Z-API                                    │
│      └─ Camada 4: Janela Temporal + Telefone (Designações 'ENVIADA' nos próx. 30 dias)  │
│          │                                                                              │
│          ▼                                                                              │
│  [3. Classificador de Intenção (Motor Híbrido Determinístico + IA Gemini Flash)]:      │
│      ├─ CONFIRMAR           ──► Aceitação da parte                                      │
│      ├─ RECUSAR             ──► Declínio com extração automática do motivo              │
│      ├─ PERMUTA             ──► Troca informal solicitada com outro irmão               │
│      ├─ INDISPONIBILIDADE   ──► Ausência futura declarada                               │
│      └─ DUVIDA              ──► Dúvidas sobre tema, leitura, etc.                       │
│          │                                                                              │
│          ▼                                                                              │
│  [4. Fechamento de Ciclo (Closed-Loop Action)]:                                         │
│      ├─ Se CONFIRMAR:                                                                   │
│      │   - Update seguro em `workbook_parts` (status = 'DESIGNADA')                     │
│      │   - Registro em `confirmation_portal_responses`                                  │
│      │   - Recibo afetuoso ao publicador via WhatsApp                                   │
│      │                                                                                  │
│      ├─ Se RECUSAR:                                                                     │
│      │   - Update em `workbook_parts` (status = 'REJEITADA', needs_reassignment = true) │
│      │   - Registro em `refusal_logs`                                                   │
│      │   - Resposta empática ao publicador no WhatsApp                                  │
│      │   - 🚨 DISPARO IMEDIATO DE ALERTA para SRVM / Ajudante / Grupo no WhatsApp       │
│      │                                                                                  │
│      └─ [5. Log e Auditoria Completa na nova tabela `zapi_smart_interactions`]          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Arquivos Propostos (Apenas Novos Arquivos)

### Componente Backend (Supabase)

#### [NEW] `supabase/functions/zapi-smart-webhook/index.ts`
* Edge function Deno independente.
* Valida requisições recebidas do Z-API.
* Consulta o status do toggle `zapi_smart_manager_active` em `settings`.
* Executa a resolução contextual do publicador pelo telefone ou pelo `messageId` citado.
* Realiza a classificação de intenção (regras heurísticas ultra-rápidas com fallback para Gemini Flash via prompt estruturado).
* Executa a ação de confirmação ou recusa com notificação imediata à liderança.
* Registra o evento detalhado na tabela `zapi_smart_interactions`.

#### [NEW] `supabase/functions/zapi-smart-webhook/deno.json`
* Configuração e import maps da Edge Function.

#### [NEW] `supabase/migrations/20260908000000_zapi_smart_manager.sql`
* Cria a tabela `zapi_smart_interactions` para log de conversas, intenções detectadas e auditoria.
* Insere o registro de configuração `zapi_smart_manager_active` com valor inicial `'false'`.
* Índices de busca por `phone`, `inbound_message_id` e `created_at`.

### Componente Frontend (Serviço e Painel Administrativo Isolados)

#### [NEW] `src/services/zapiSmartManagerService.ts`
* Serviço TypeScript isolado para:
  * Consultar e alternar o toggle `zapi_smart_manager_active`.
  * Buscar métricas e histórico de interações (`zapi_smart_interactions`).
  * Simular o envio de mensagens para teste de ponta a ponta sem interferir no sistema.

#### [NEW] `src/components/admin/ZApiSmartManagerModal.tsx`
* Interface moderna e independente (modal/painel acessível pelo painel administrativo ou atalho):
  * Interruptor principal: **Ativar/Desativar Gerência Inteligente**.
  * Feed em tempo real de mensagens recebidas, intenção classificada e ações tomadas.
  * Estatísticas: Taxa de confirmação automática por WhatsApp, alertas de recusa emitidos e tempo médio de processamento.

### Scripts de Validação e Teste

#### [NEW] `scripts/test_smart_webhook.ts`
* Script de teste que simula o webhook do Z-API enviando:
  1. Confirmação por citação de mensagem (`quotedMsg`).
  2. Confirmação por reação de emoji (👍).
  3. Recusa com justificativa em linguagem natural.
  4. Comportamento com toggle ativado vs desativado.

---

## 5. User Review Required

> [!IMPORTANT]
> **Definição da Convivência com o Trigger Existente (`webhook-whatsapp-orchestrator`)**:
> - **Opção 1 (Zero-Touch Estrito)**: Não alteramos nenhuma linha em nenhum trigger SQL existente. O Gerenciador Inteligente atualiza o banco e deixa o trigger já existente enviar a confirmação padrão, enquanto a IA foca em recusas, alertas para o SRVM e dúvidas.
> - **Opção 2 (Trigger Ciente do Toggle)**: Executamos um comando SQL pontual para que o trigger antigo não envie mensagem se a Gerência Inteligente estiver ativa, permitindo que a IA envie uma resposta contextualizada mais amigável e personalizada.

---

## 6. Verification Plan

### Testes Automatizados via Script
1. Executar `scripts/test_smart_webhook.ts` com `zapi_smart_manager_active = false`:
   * Verificar se o webhook retorna `{ active: false }` e não altera nenhuma tabela.
2. Ativar `zapi_smart_manager_active = true` e testar simulações:
   * **Cenário 1 (Confirmação por Emoji 👍)**: Verificar se a designação vinculada transiciona para `DESIGNADA` e gera registro de interação.
   * **Cenário 2 (Confirmação textual "Irmão, confirmo sim!")**: Verificar reconhecimento de intenção e registro.
   * **Cenário 3 (Recusa "Não vou poder pois estarei de viagem")**: Verificar marcação de `REJEITADA`, motivo capturado e disparo de alerta aos anciãos.
3. Verificar a integridade do código existente:
   * `npm run build` deve compilar com zero erros TypeScript.
   * O fluxo tradicional de publicação D-21 e envio S-89 permanece 100% inalterado.
