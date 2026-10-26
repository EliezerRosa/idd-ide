# Chat-Agente — Drawers IDD (Coluna 2)

> Visão geral curta dos overlay drawers introduzidos no `PowerfulAgentTab`.
> Para histórico completo veja `/memories/repo/chat-drawers-idd-master-plan-2026-04-28.md`.

## Filosofia

A conversa **sempre** ocupa largura plena. Toda "carga de ação" (chips de
contexto, sugestões pós-resposta, micro-UIs ativas, comandos rápidos) sai do
inline e migra para **dois drawers laterais**, abertos sob demanda como
overlay (não como push).

## Componentes

| Arquivo | Papel |
|---|---|
| `src/components/ui/ChatDrawerShell.tsx` | Casca: trilhos, mutex left/right, atalhos, `forceOpen`, backdrop, bottom-sheet mobile, ARIA dialog. |
| `src/components/ui/LeftPanelActions.tsx` | Conteúdo do drawer ESQUERDO: chips da semana, ações sugeridas, comandos rápidos. |
| `src/components/ui/RightPanelDetails.tsx` | Conteúdo do drawer DIREITO: accordion de micro-UIs ativas (foco em `activeId`). |
| `src/components/ui/ChatMessageBubble.tsx` | Bolha com long-mode: respostas >1500 chars ou contendo `\n\n## ` viram resumo + modal `role="dialog"`. |

## Atalhos

- `Ctrl+[` (ou `⌘+[`) — alterna drawer **esquerdo**.
- `Ctrl+]` (ou `⌘+]`) — alterna drawer **direito**.
- `Esc` — fecha o drawer aberto.

Mutex: abrir um lado fecha o outro automaticamente.
Persistência: último lado aberto é guardado em `localStorage` sob a chave
`rvm_chat_drawer_open` (override por `storageKey`).

## Auto-abertura externa (`forceOpen`)

```tsx
<ChatDrawerShell
  forceOpen={{ side: 'right', nonce: someBumpedNumber }}
  rightSlots={...}
>
```

Quando `nonce` muda, o Shell força a abertura do `side` indicado. Usado em
`PowerfulAgentTab` para "puxar o foco" do usuário quando uma nova micro-UI
chega via `onActiveMicroUiChange`.

## Mobile (≤768px)

- Trilhos engordados a 28px (alvo de toque).
- Drawer vira **bottom-sheet**: full-width, `min(75vh, 560px)`, slide-up,
  handle visual no topo, border-radius topo.
- Backdrop escurecido captura clique-fora para fechar.

## Acessibilidade

- Painel: `role="dialog"`, `aria-modal="false"`, `aria-labelledby` apontando
  para o header da 1ª seção.
- Auto-foco no botão de fechar 30ms após abrir → `Esc` funciona imediatamente.
- Trilhos: `aria-expanded`, `aria-label` descritivo (inclui contagem de
  pendentes quando há badge).
- `prefers-reduced-motion: reduce` desativa todas as transições e animações.

## Testes

`node:test + tsx + @testing-library/react + jsdom` (não Vitest). Specs em:

- `src/components/ui/ChatDrawerShell.test.tsx`
- `src/components/ui/LeftPanelActions.test.tsx`
- `src/components/ui/RightPanelDetails.test.tsx`
- `src/components/ui/ChatMessageBubble.test.tsx`

Rodar: `npm test` ou
`npx tsx --test src/components/ui/<arquivo>.test.tsx`.

> ⚠️ Componentes precisam de `import React from 'react'; void React;` para
> rodar sob o runner `tsx` (que herda o `tsconfig.json` raiz com JSX clássico).
> O build de produção (`tsconfig.app.json` com `react-jsx`) ignora o import.
