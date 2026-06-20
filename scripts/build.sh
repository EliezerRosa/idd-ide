#!/usr/bin/env bash
# scripts/build.sh — Build do IDD IDE para distribuição
#
# Uso:
#   ./scripts/build.sh linux    → produz dist/idd-ide-linux-x64
#   ./scripts/build.sh darwin   → produz dist/idd-ide-darwin-x64 e darwin-arm64
#   ./scripts/build.sh win32    → produz dist/idd-ide-win32-x64
#   ./scripts/build.sh all      → builda todas as plataformas
#
# Requer: Node.js 20+, npm

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
PLATFORM="${1:-all}"

echo "⬡ IDD IDE — Build ($PLATFORM)"
echo "────────────────────────────────────────"

# ── 1. Build do CLI ──────────────────────────────────────────────
echo ""
echo "→ Compilando CLI..."
cd "$ROOT_DIR/cli"
npm ci --ignore-scripts
npm run build
echo "  ✓ CLI compilado em cli/dist/"

# ── 2. Build da extensão VS Code ─────────────────────────────────
echo ""
echo "→ Compilando extensão idd-core..."
cd "$ROOT_DIR/extensions/idd-core"
npm ci --ignore-scripts
npm run compile
echo "  ✓ Extensão compilada em extensions/idd-core/out/"

# ── 3. Empacotar extensão como .vsix ─────────────────────────────
echo ""
echo "→ Empacotando extensão (.vsix)..."
if command -v vsce &> /dev/null; then
  vsce package --out "$DIST_DIR/idd-core.vsix"
  echo "  ✓ idd-core.vsix gerado"
else
  echo "  ⚠ vsce não instalado — pulando empacotamento"
  echo "    Instale com: npm install -g @vscode/vsce"
fi

# ── 4. Empacotar binários CLI por plataforma ─────────────────────
mkdir -p "$DIST_DIR"
cd "$ROOT_DIR/cli"

package_platform() {
  local platform=$1
  local arch=$2
  local outdir="$DIST_DIR/idd-ide-${platform}-${arch}"

  echo ""
  echo "→ Empacotando para ${platform}-${arch}..."
  mkdir -p "$outdir/cli"
  cp -r dist package.json "$outdir/cli/"
  cp "$ROOT_DIR/product.json"   "$outdir/"
  cp "$ROOT_DIR/LICENSE"        "$outdir/"
  cp "$ROOT_DIR/README.md"      "$outdir/"
  cp -r "$ROOT_DIR/resources"   "$outdir/"
  cp -r "$ROOT_DIR/schemas"     "$outdir/"

  ( cd "$outdir" && tar -czf "../idd-ide-${platform}-${arch}.tar.gz" . )
  rm -rf "$outdir"
  echo "  ✓ dist/idd-ide-${platform}-${arch}.tar.gz"
}

case "$PLATFORM" in
  linux)
    package_platform linux x64
    package_platform linux arm64
    ;;
  darwin)
    package_platform darwin x64
    package_platform darwin arm64
    ;;
  win32)
    package_platform win32 x64
    ;;
  all)
    package_platform linux  x64
    package_platform linux  arm64
    package_platform darwin x64
    package_platform darwin arm64
    package_platform win32  x64
    ;;
  *)
    echo "Plataforma desconhecida: $PLATFORM"
    echo "Use: linux | darwin | win32 | all"
    exit 1
    ;;
esac

echo ""
echo "────────────────────────────────────────"
echo "✓ Build concluído. Artefatos em dist/"
ls -lh "$DIST_DIR"
