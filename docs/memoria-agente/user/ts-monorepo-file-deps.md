# Monorepo TS sem workspaces — lições (2026-09-05)

- Compartilhar pacote local entre subprojetos: usar dependência `"file:../pkg"` + `npm install --ignore-scripts` (cria junction). Funciona em tsc, vitest, tsx e esbuild.
- NÃO usar `tsconfig.paths` + alias vitest via `new URL(...).pathname` — no Windows o path fica URL-encoded (`%20`) e falha; tsc ainda reclama TS6059 (rootDir).
- Pacote fonte-only: `package.json` com `type: module`, `main/types/exports → ./src/index.ts`; `index.ts` importa `./x.js` (NodeNext idiom; vite/esbuild/tsc resolvem .js→.ts).
- Consumidor com `rootDir` explícito quebra ao importar fora dele; se compile é só typecheck, trocar por `noEmit: true`.
