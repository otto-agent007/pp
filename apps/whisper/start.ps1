#!/usr/bin/env pwsh
# Start the local Whisper transcription server.
# Run once before `pnpm dev`; leave it open in a separate terminal.
#
# Usage:
#   .\start.ps1             # uses "base" model (fast, ~145 MB)
#   .\start.ps1 small       # better accuracy, ~465 MB
#   .\start.ps1 medium      # best local accuracy, ~1.5 GB

param([string]$Model = "base")

Set-Location $PSScriptRoot

# Create / reuse a venv so we don't pollute the system Python.
if (-not (Test-Path ".venv")) {
    Write-Host "Creating Python venv..." -ForegroundColor Cyan
    python -m venv .venv
}

# Activate
& ".\.venv\Scripts\Activate.ps1"

# Install deps (idempotent)
Write-Host "Installing dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt -q

# Launch
Write-Host "`nStarting Whisper server on http://127.0.0.1:8765  (model: $Model)" -ForegroundColor Green
$env:WHISPER_MODEL = $Model
uvicorn main:app --host 127.0.0.1 --port 8765 --reload
