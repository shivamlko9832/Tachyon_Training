$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $projectRoot "venv\Scripts\python.exe"
$url = "http://127.0.0.1:5500/React_Router_v7/index.html"

if (!(Test-Path $python)) {
  throw "Python executable not found at $python. Create venv first."
}

Set-Location $projectRoot

Write-Host "Starting local server at http://127.0.0.1:5500" -ForegroundColor Cyan
Write-Host "Opening React Router app in browser..." -ForegroundColor Cyan

Start-Process $url
& $python -m http.server 5500
