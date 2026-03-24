$ErrorActionPreference = "Stop"
$env:IMENA_FORCE_SQLITE = "1"
$Root = $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$VenvPy = Join-Path $Backend ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPy)) {
    Write-Host "Missing backend\.venv — run: cd backend; python -m venv .venv; .\.venv\Scripts\pip install -r requirements.txt"
    exit 1
}

$beEnv = Join-Path $Backend ".env"
if (-not (Test-Path $beEnv)) {
    Copy-Item (Join-Path $Backend ".env.example") $beEnv
}

$feEnv = Join-Path $Frontend ".env"
if (-not (Test-Path $feEnv)) {
    Copy-Item (Join-Path $Frontend ".env.example") $feEnv
}

Start-Process powershell -WorkingDirectory $Frontend -ArgumentList @(
    "-NoExit", "-Command", "npm run dev"
) | Out-Null

Set-Location $Backend
& $VenvPy manage.py migrate --noinput
& $VenvPy manage.py runserver
