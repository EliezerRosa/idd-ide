#!/usr/bin/env bash
# Roda idd migrate infer nos 5 módulos priorizados do próprio IDD IDE.
# Requer ANTHROPIC_API_KEY no ambiente. Sempre em --dry-run primeiro.
set -euo pipefail

cd "$(dirname "$0")/cli"
IDD="node dist/index.js"

TARGETS=(
  "src/commands/review.ts"
  "src/lib/domain/evolver.ts"
  "src/commands/generate.ts"
  "src/commands/suggest.ts"
  "src/lib/domain/normalizer.ts"
)

echo "⬡ Dogfooding batch — ${#TARGETS[@]} módulos"
echo "────────────────────────────────────────"

for target in "${TARGETS[@]}"; do
  echo ""
  echo "→ $target"
  $IDD migrate infer "$target" --dry-run
  echo ""
  echo "  (revise acima — remova --dry-run no script para persistir)"
  echo "────────────────────────────────────────"
done
