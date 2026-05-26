#!/usr/bin/env bash
# Start the local Whisper transcription server (Linux/macOS).
# Usage: ./start.sh [tiny|base|small|medium|large]
set -e
cd "$(dirname "$0")"

MODEL="${1:-base}"

if [ ! -d ".venv" ]; then
  echo "Creating Python venv..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -r requirements.txt -q

echo ""
echo "Starting Whisper server on http://127.0.0.1:8765  (model: $MODEL)"
WHISPER_MODEL="$MODEL" uvicorn main:app --host 127.0.0.1 --port 8765 --reload
