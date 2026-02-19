$ErrorActionPreference = "Stop"

$sdkUrl = "https://npcap.com/dist/npcap-sdk-1.13.zip"
$zipPath = Join-Path $PWD "npcap-sdk.zip"
$extractRoot = "C:\npcap-sdk"
$libPath = Join-Path $extractRoot "Lib\x64"

Write-Host "Downloading Npcap SDK from $sdkUrl"
Invoke-WebRequest -Uri $sdkUrl -OutFile $zipPath

if (Test-Path $extractRoot) {
  Remove-Item -Recurse -Force $extractRoot
}

Write-Host "Extracting SDK to $extractRoot"
Expand-Archive -Path $zipPath -DestinationPath $extractRoot -Force

if (-not (Test-Path $libPath)) {
  throw "Npcap SDK library path not found: $libPath"
}

Write-Host "Setting NPCAP_SDK and LIB environment for this workflow"
"NPCAP_SDK=$extractRoot" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
"LIB=$libPath" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append

Write-Host "Npcap SDK installed successfully."
