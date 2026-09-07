# IDD IDE UI/UX

- Objetivo: criar o novo pacote `packages/vscode-extension` com sidebar semântica, diagnósticos locais e painel de contrato.
- Decisão: manter o pacote independente de `extensions/idd-core`; consumir YAML por `js-yaml` e preservar análise de digitação inteiramente síncrona/local.
- Fundação criada em `packages/vscode-extension`: manifesto, índice de contratos, árvore semântica, diagnostics/quick fixes, ativação, status HUD e painel React/Tailwind.
- Validação: `npm install` e `npm run compile` concluídos; corrigida a fronteira `readonly` da API `TreeDataProvider`.
- Validação final: `npm run build:webview` gerou `media/contract-detail.js` e `media/contract-detail.css`; há somente aviso não bloqueante de `caniuse-lite` desatualizado.
- Pendência resolvida: `iddUi.openContract` agora hospeda a webview React com CSP/nonces e injeta os dados do contrato selecionado.
- Teste viabilizado: `.vscode/launch.json` do pacote inicia `examples`; os YAMLs montam a sidebar e `UserAccount.ts` contém violação proposital em `email` para testar o diagnostic INV-UI-04.
- Validação: `npm run build` passou após a integração. Há somente aviso não bloqueante de `caniuse-lite` desatualizado.
- Nova decisão: criar `packages/idd-ui-pwa` como laboratório PWA browser-first, separado do Extension Host, para testar a experiência de navegação/contrato/drift sem F5.
- Falha de build resolvida: `virtual:pwa-register` não possuía declaração TypeScript; `src/vite-env.d.ts` agora referencia `vite-plugin-pwa/client`.
- Validação: `npm run build` passou e gerou manifest, service worker e precache PWA.
- Decisão de UX: a declaração de intenção em linguagem natural, resultado esperado e invariantes aparecem antes de métricas/código; o YAML foi rotulado como contrato compilado secundário.
- Validação pós-ajuste: `npm run build` passou.
- Governança GitHub local adicionada: community health files, templates de issue/PR, Dependabot, `.editorconfig`, `.gitattributes` e CI estendido para os dois pacotes.
- CI validado localmente com `npm ci --ignore-scripts` e `npm run build` nos pacotes de extensão e PWA. O primeiro `npm ci` do PWA falhou por lock do servidor Vite em `esbuild.exe`; encerrar o servidor e repetir resolveu.
- Publicação concluída: commit `e99c5a2` enviado a `origin/main`, contendo somente a UI/PWA e governança GitHub; alterações pré-existentes do CLI e extensão legada foram preservadas fora do commit.
- Configuração remota aplicada: Discussions, auto-merge, delete branch on merge, vulnerability alerts, Dependabot security updates, secret scanning/push protection e branch protection em `main` (PR, 1 aprovação, checks, histórico linear, conversas resolvidas, sem force push/deleção).
