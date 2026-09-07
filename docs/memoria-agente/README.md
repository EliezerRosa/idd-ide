# Memória do agente — espelho versionado

Cópia dos arquivos de memória persistente do agente (GitHub Copilot Chat) relevantes ao idd-ide.
A origem vive no perfil do VS Code, fora do Git, e por isso é frágil (depende do hash do workspace
e da máquina). Este espelho garante que o estado de retomada viaje com o repositório.

**Fonte de verdade:** os arquivos no perfil do VS Code. Este diretório é um *snapshot* — refazer a cópia
ao fim de cada bloco significativo (ou quando pedido). Última sincronização: **2026-09-06**, HEAD `a4c3bad`.

| Pasta | Origem no disco | Conteúdo |
|---|---|---|
| `repo/` | `%APPDATA%\Code\User\workspaceStorage\<hash>\GitHub.copilot-chat\memory-tool\memories\repo\` | Estado vivo do workspace. **`_ESTADO-ATUAL.md` é o arquivo a ler primeiro** em qualquer retomada; `fase0-e-dicionario-ubiquo-2026-09-05.md` é o snapshot técnico da última sessão |
| `session/` | mesma base, subpastas `<id-da-conversa>/` | Notas de trabalho por conversa: `fase0-contrato-v2.md` (sessão 2026-09-05/06) e as três da sessão de 2026-09-04 (análise da implementação, UI/UX, exploração do paradigma) |
| `user/` | `%APPDATA%\Code\User\globalStorage\github.copilot-chat\memory-tool\memories\` | Memória transversal do usuário, filtrada ao que diz respeito ao IDD: axioma de memória, perfil/trajetória de Eliezer, comando epistêmico × operacional, padrão de runbooks, lição de monorepo TS |

Não copiados (pertencem a outros projetos ou a configuração pessoal de ferramentas):
`copilot-pro-plus-activation-2026-04-29.md`, `react-test-tsx-jsx-classic.md`, `supabase-rls-gotchas.md`, `wgp-universal-key-decisions-2026-04-25.md`.

## Como usar na retomada

1. Ler `repo/_ESTADO-ATUAL.md` — seção **ONDE ESTAMOS** ao final.
2. Se o agente não tiver a memória no perfil (outra máquina, outro hash de workspace), recriar a partir daqui:
   copiar `repo/*` e `user/*` de volta para as pastas de origem indicadas acima.
3. Documentos de decisão continuam em `docs/` (`PARECER-…`, `VEREDITO-…`, `SESSAO-…`, `ROADMAP.md`); a memória
   referencia esses arquivos, não os substitui.

## Comando de re-sincronização (PowerShell)

```powershell
$ws  = "$env:APPDATA\Code\User\workspaceStorage\<hash>\GitHub.copilot-chat\memory-tool\memories"
$gl  = "$env:APPDATA\Code\User\globalStorage\github.copilot-chat\memory-tool\memories"
Copy-Item "$ws\repo\*.md" docs\memoria-agente\repo\
Get-ChildItem "$ws" -Directory | Where-Object Name -ne 'repo' | ForEach-Object { Copy-Item "$($_.FullName)\*.md" docs\memoria-agente\session\ }
'axiom-always-save-memory','eliezer-perfil-trajetoria','idd-comando-epistemico-vs-operacional','idd-runbooks-pattern','ts-monorepo-file-deps' |
  ForEach-Object { Copy-Item "$gl\$_.md" docs\memoria-agente\user\ }
```

O `<hash>` atual desta máquina é `cb51bf6731546f24a7379e3f48a9d7cb` (muda se a pasta do workspace mudar de caminho).
