$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

$warnings = @()

function Run-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [switch]$AllowFailure
  )

  Write-Host ""
  Write-Host "==> $Name" -ForegroundColor Cyan
  Write-Host "    $Command" -ForegroundColor DarkGray

  try {
    Invoke-Expression $Command
    Write-Host "[OK] $Name" -ForegroundColor Green
  } catch {
    if ($AllowFailure) {
      Write-Warning "$Name failed (non-blocking): $($_.Exception.Message)"
      $script:warnings += $Name
      return
    }
    throw
  }
}

Run-Step -Name "Rust workspace check" -Command "cargo check --workspace"
Run-Step -Name "Frontend lint" -Command "npm --prefix apps/nexus-desktop run lint"
Run-Step -Name "Frontend unit tests" -Command "npm --prefix apps/nexus-desktop run test"
Run-Step -Name "Desktop frontend build" -Command "npm --prefix apps/nexus-desktop run build"
Run-Step -Name "Alert dedupe integration" -Command "cargo test --workspace --test alerts_dedupe_integration -- --nocapture"
Run-Step -Name "App dispatch integration" -Command "cargo test --workspace --test app_dispatch_integration -- --nocapture"
Run-Step -Name "Monitor lifecycle smoke (ignored test)" -Command "cargo test --workspace --test monitor_sequence_smoke -- --ignored --nocapture" -AllowFailure

Write-Host ""
if ($warnings.Count -gt 0) {
  Write-Warning "Smoke run completed with warnings: $($warnings -join ', ')"
  exit 0
}

Write-Host "Smoke run completed successfully." -ForegroundColor Green
