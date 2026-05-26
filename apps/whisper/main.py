"""
Pest Patrol OS - local Whisper transcription server
Run: uvicorn main:app --host 127.0.0.1 --port 8765 --reload

Requires:
  pip install fastapi uvicorn python-multipart openai-whisper
  (ffmpeg must be on PATH - `choco install ffmpeg` or `winget install ffmpeg`)
"""

import os
import tempfile
import whisper
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Model - change to "small" or "medium" for better accuracy at the cost of
# a few seconds of startup time.  "base" is fast and good enough for short
# field-ops voice commands.
# ---------------------------------------------------------------------------
MODEL_SIZE = os.getenv("WHISPER_MODEL", "base")

print(f"[whisper] Loading model '{MODEL_SIZE}'...")
_model = whisper.load_model(MODEL_SIZE)
print(f"[whisper] Model ready.")

app = FastAPI(title="Pest Patrol Whisper Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    # In production lock this down to your actual origin.
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": MODEL_SIZE}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)) -> dict:
    """Accept an audio blob (webm/ogg/wav/mp4) and return the transcript."""
    data = await audio.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Determine a sensible suffix so ffmpeg recognises the container.
    content_type = audio.content_type or ""
    if "webm" in content_type:
        suffix = ".webm"
    elif "ogg" in content_type:
        suffix = ".ogg"
    elif "mp4" in content_type or "m4a" in content_type:
        suffix = ".mp4"
    else:
        suffix = ".webm"  # MediaRecorder default in Chrome

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        result = _model.transcribe(tmp_path, language="en", fp16=False)
        text = result["text"].strip()
        return {"transcript": text}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        os.unlink(tmp_path)
