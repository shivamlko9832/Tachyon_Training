$ErrorActionPreference = "Stop"
$python = ".\venv\Scripts\python.exe"

if (!(Test-Path $python)) {
  throw "Virtual environment Python not found at $python"
}

Write-Host "=== Tachyon Pre-Boarding Project Executor ===" -ForegroundColor Cyan

Write-Host "`n[1/4] Running Python Basics..." -ForegroundColor Yellow
& $python ".\Python_Basics\main.py"
if ($LASTEXITCODE -ne 0) { throw "Python Basics execution failed" }

Write-Host "`n[2/4] Running Docker Fundamentals script locally..." -ForegroundColor Yellow
& $python ".\Docker_Fundamentals\app.py"
if ($LASTEXITCODE -ne 0) { throw "Docker Fundamentals local script failed" }

Write-Host "`n[3/4] Verifying FastAPI import..." -ForegroundColor Yellow
& $python -c "import fastapi, uvicorn; print('FastAPI and Uvicorn available')"
if ($LASTEXITCODE -ne 0) { throw "FastAPI dependency verification failed" }

Write-Host "`n[4/4] Static frontend demos prepared:" -ForegroundColor Yellow
Write-Host "- HTML_CSS_JS_Basics\index.html"
Write-Host "- ReactJS_Basics\index.html"
Write-Host "- React_Router_v7\index.html"
Write-Host "- Tailwind_CSS\index.html"

Write-Host "`nExecution checks completed successfully." -ForegroundColor Green
