# Distribuição — IDD IDE

Este documento descreve como o IDD IDE é configurado como produto distribuível e como gerar builds para Linux, macOS e Windows.

## Branding

O arquivo [`product.json`](../product.json) na raiz do repositório define a identidade do produto:

| Campo | Valor |
|---|---|
| `nameShort` | IDD IDE |
| `nameLong` | IDD IDE — Intent Driven Development |
| `applicationName` | idd-ide |
| `dataFolderName` | `.idd-ide` |
| `urlProtocol` | `idd-ide://` |

### Cores da marca

| Token | Cor | Uso |
|---|---|---|
| `primary` | `#534AB7` | Roxo IDD — botões, badges, branding |
| `accent` | `#0F6E56` | Verde-petróleo — strings, sucesso |
| `drift` | `#E24B4A` | Vermelho — drift crítico |
| `warn` | `#EF9F27` | Âmbar — avisos |
| `ok` | `#1D9E75` | Verde — alinhado |

### Ícones

```
resources/idd/
├── idd-icon.svg              # ícone principal (hexágono com grafo de intenção)
└── file-icon-intent.svg      # ícone de arquivo .intent.yaml
```

O ícone representa visualmente o conceito central do IDD: um nó central (a intenção) conectado a três nós satélites (dependências) dentro de um hexágono — a mesma metáfora usada no logotipo ⬡ em toda a documentação.

### Tema

[`extensions/idd-core/themes/idd-dark-theme.json`](../extensions/idd-core/themes/idd-dark-theme.json) — tema escuro padrão "IDD Dark", aplicado automaticamente na primeira execução. Usa as cores da marca para realce de sintaxe, status bar, terminal e diff editor.

## Marketplace de extensões

O IDD IDE usa o **Open VSX Registry** em vez do Marketplace da Microsoft (que é proprietário e não pode ser usado por forks do Code-OSS):

```json
"extensionsGallery": {
  "serviceUrl": "https://open-vsx.org/vscode/gallery",
  "itemUrl": "https://open-vsx.org/vscode/item"
}
```

A extensão `idd-core` é registrada como **built-in** — vem pré-instalada e não pode ser desinstalada, já que é o núcleo do paradigma IDD.

## Build local

### Pré-requisitos

- Node.js 20+
- npm
- (opcional) [`@vscode/vsce`](https://www.npmjs.com/package/@vscode/vsce) para empacotar `.vsix`

```bash
npm install -g @vscode/vsce
```

### Gerando builds

```bash
chmod +x scripts/build.sh

# Build para uma plataforma específica
./scripts/build.sh linux
./scripts/build.sh darwin
./scripts/build.sh win32

# Build para todas as plataformas
./scripts/build.sh all
```

### O que o script faz

1. Compila o CLI (`cli/dist/`)
2. Compila a extensão VS Code (`extensions/idd-core/out/`)
3. Empacota a extensão como `.vsix` (se `vsce` disponível)
4. Empacota o CLI + recursos + schemas em `.tar.gz` por plataforma

### Saída

```
dist/
├── idd-core.vsix
├── idd-ide-linux-x64.tar.gz
├── idd-ide-linux-arm64.tar.gz
├── idd-ide-darwin-x64.tar.gz
├── idd-ide-darwin-arm64.tar.gz
└── idd-ide-win32-x64.tar.gz
```

## Publicando a extensão no Open VSX

```bash
vsce package --out dist/idd-core.vsix
npx ovsx publish dist/idd-core.vsix -p <OVSX_TOKEN>
```

Token obtido em [open-vsx.org/user-settings/tokens](https://open-vsx.org/user-settings/tokens) (login com GitHub).

## Auto-update

O IDD IDE usa **GitHub Releases** como canal de atualização — sem servidor de updates próprio:

1. Crie uma tag semver: `git tag v1.0.0 && git push --tags`
2. O workflow `.github/workflows/idd-verify.yml` já roda os testes na tag
3. Crie um **Release** manualmente em GitHub vinculado à tag, anexando os artefatos de `dist/`

Para automatizar isso completamente, adicione um job de release ao workflow:

```yaml
release:
  if: startsWith(github.ref, 'refs/tags/v')
  needs: verify
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: ./scripts/build.sh all
    - uses: softprops/action-gh-release@v2
      with:
        files: dist/*.tar.gz
```

## Instalação a partir de um build

```bash
tar -xzf idd-ide-linux-x64.tar.gz -C ~/.idd-ide
cd ~/.idd-ide/cli
npm link   # disponibiliza o comando `idd` globalmente
```

A extensão `.vsix` pode ser instalada manualmente em qualquer VS Code (ou fork compatível):

```bash
code --install-extension dist/idd-core.vsix
```

## Diferenças vs. VS Code padrão

| Aspecto | VS Code (Microsoft) | IDD IDE |
|---|---|---|
| Telemetria | Habilitada por padrão | Desabilitada (`showTelemetryOptOut: true`) |
| Marketplace | marketplace.visualstudio.com | open-vsx.org |
| Extensão core | Nenhuma | `idd-core` built-in, não removível |
| Tema padrão | Dark+ | IDD Dark (cores da marca) |
| Protocolo de URL | `vscode://` | `idd-ide://` |
