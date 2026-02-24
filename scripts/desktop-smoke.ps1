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
    $global:LASTEXITCODE = 0
    Invoke-Expression $Command
    if ($global:LASTEXITCODE -ne 0) {
      throw "Command exited with code $global:LASTEXITCODE"
    }
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

function Ensure-TauriFrontendDist {
  $distDir = Join-Path $root 'apps/nexus-gui/dist'
  $indexPath = Join-Path $distDir 'index.html'

  if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
  }

  if (-not (Test-Path $indexPath)) {
    Set-Content -Path $indexPath -Value '<!doctype html><title>NEXUS</title>' -NoNewline
    Write-Host 'Prepared frontendDist placeholder for Tauri context checks.' -ForegroundColor DarkYellow
  }
}

function Test-NpcapRuntimeAvailable {
  if (-not $IsWindows) {
    return $true
  }

  $candidates = @(
    "$env:SystemRoot\System32\Npcap\wpcap.dll",
    "$env:SystemRoot\System32\Npcap\Packet.dll",
    "$env:SystemRoot\System32\wpcap.dll",
    "$env:SystemRoot\System32\Packet.dll",
    "$env:SystemRoot\SysWOW64\wpcap.dll",
    "$env:SystemRoot\SysWOW64\Packet.dll"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $true
    }
  }

  return $false
}
Ensure-TauriFrontendDist
Run-Step -Name "Rust workspace check" -Command "cargo check --workspace"
Run-Step -Name "Frontend lint" -Command "npm --prefix apps/nexus-gui run lint"
Run-Step -Name "Frontend unit tests" -Command "npm --prefix apps/nexus-gui run test"
Run-Step -Name "Desktop frontend build" -Command "npm --prefix apps/nexus-gui run build"
Run-Step -Name "Alert dedupe integration" -Command "cargo test --workspace --test alerts_dedupe_integration -- --nocapture"

if ($IsWindows -and -not (Test-NpcapRuntimeAvailable)) {
  Write-Warning "Npcap runtime DLLs were not found. Skipping App dispatch integration in smoke run."
  $warnings += "App dispatch integration (Npcap runtime missing)"
} else {
  Run-Step -Name "App dispatch integration" -Command "cargo test --workspace --test app_dispatch_integration -- --nocapture"
}

Run-Step -Name "Monitor lifecycle smoke (ignored test)" -Command "cargo test --workspace --test monitor_sequence_smoke -- --ignored --nocapture" -AllowFailure

Write-Host ""
if ($warnings.Count -gt 0) {
  Write-Warning "Smoke run completed with warnings: $($warnings -join ', ')"
  exit 0
}

Write-Host "Smoke run completed successfully." -ForegroundColor Green