$ErrorActionPreference = 'Stop'
$path = 'C:\Antigravity - RVM Designações\rvm-designacoes-unified\docs\graphs\visual'
if (-not (Test-Path -LiteralPath $path)) {
  New-Item -ItemType Directory -Path $path -Force | Out-Null
  Write-Host 'Rollback: directory recreated (empty).' -ForegroundColor Green
} else {
  Write-Host 'Rollback: directory already exists.' -ForegroundColor Yellow
}
