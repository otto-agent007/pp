# Local Whisper Speech-To-Text

This helper runs a local FastAPI server for dashboard search dictation during
development. It is not deployed to Vercel, does not write audio or transcripts
to Supabase, and is reached by the web app only through development rewrites.

## Quick Start

From the repo root:

```powershell
corepack pnpm dev:voice
```

That starts the Whisper helper on `http://127.0.0.1:8765` and the web app on
`http://127.0.0.1:3000`. To start only the helper:

```powershell
corepack pnpm voice:dev
```

Check the helper:

```powershell
corepack pnpm voice:health
```

## Requirements

- Python 3.10 or newer on `PATH`.
- `ffmpeg` on `PATH` so Whisper can read browser audio containers.
- Enough disk space for the selected model. `base` is the default and is the
  right first choice for short dashboard searches.

The start scripts create `apps/whisper/.venv` automatically and install
`requirements.txt` into it.

## Models

```powershell
corepack pnpm voice:dev -- --model tiny
corepack pnpm voice:dev -- --model base
corepack pnpm voice:dev -- --model small
```

Use `base` for fast local search. Try `small` if short commands are often
misheard and the machine has enough headroom. Larger models are slower to start
and are usually overkill for this workflow.

## Troubleshooting

- `voice:health` unavailable: start `corepack pnpm voice:dev` in another
  terminal and wait for the model-ready message.
- Browser permission error: allow microphone access for `localhost` or
  `127.0.0.1`, then try again.
- `ffmpeg` error: install `ffmpeg` and reopen the terminal so the updated
  `PATH` is visible.
- Slow first run: the Python environment and Whisper model may be downloading.
  Later starts reuse the same `.venv` and model cache.

## Boundary

Local Whisper is a development helper. Production voice search must use a
browser-native path or a separately approved provider slice; do not add Vercel
rewrites, Supabase writes, provider keys, or persisted raw audio here.
