$ErrorActionPreference = 'Stop'
$root = 'C:\Antigravity - RVM Designações'
$from = Join-Path $root 'IDD Paradigma\IDD\apresentacoes\rvm-visual-pipeline'
$to = Join-Path $root 'rvm-designacoes-unified\docs\graphs\visual'

if (-not (Test-Path -LiteralPath $from)) {
  Write-Host 'Nothing to rollback for visual pipeline.' -ForegroundColor Yellow
  exit 0
}

New-Item -ItemType Directory -Path $to -Force | Out-Null
robocopy $from $to /E /MOVE /R:1 /W:1
$code = $LASTEXITCODE
Write-Host ("robocopy exit code: {0}" -f $code)

if (Test-Path -LiteralPath $from) {
  Remove-Item -LiteralPath $from -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'Rollback visual pipeline concluido.' -ForegroundColor Green
