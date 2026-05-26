# Mobile STT Capability Spike V1

## Goal

Decide the Expo-native speech-to-text path before adding mobile dictation.
The first target should be technician treatment or closeout notes, where the
final transcript can drop into an existing editable text draft.

## Current Mobile Surface

- `apps/mobile/app/index.tsx` renders the technician-first mobile shell.
- Capture work already lives in field controls such as
  `JobTreatmentForm`, `JobPhotoUploadForm`, `JobSignatureCaptureForm`,
  `JobChemicalLogForm`, and `JobGeofenceControls`.
- Offline behavior already has a draft and sync boundary through
  `useFormDrafts`, `useOfflineQueue`, and `useQueueSync`.
- Current native config includes `expo-image-picker` and `expo-location`
  permissions only. This spike does not add a microphone permission or native
  module.

## Decision Points

- On-device/native STT versus recorded-audio transcription through a provider.
- English-only first pass versus English/Spanish support.
- Permission copy for microphone access, denial, and unavailable recognition.
- Whether to expose interim transcripts or only final editable text.
- How confidence, no-speech, and noisy-route failures are communicated.
- Whether transcript text stores in existing form draft JSON or needs a later
  typed schema/storage slice.
- Whether any future provider path is allowed to retain raw audio. Default:
  no raw audio retention.

## Expo Go And Dev Client

Expo Go has a fixed native library set, so native STT modules that are not
bundled in Expo Go require a development build/dev client. `expo-speech` is
text-to-speech, not speech-to-text, so it does not solve dictation.

A later implementation slice may need:

- a chosen STT native package or provider adapter,
- a config plugin or permission entries,
- an EAS/dev-client runbook,
- explicit iOS and Android permission/error QA.

Those are non-goals for this spike.

## Offline-First Boundary

- Manual typed notes remain the primary fallback.
- STT must never block field completion on network availability.
- Final transcript text may enter the existing editable draft field.
- Raw audio is never queued as offline work.
- Any later cloud transcription or persisted evidence must flow through
  `packages/types` to `packages/domain` to `packages/api-client`; mobile UI
  must not write directly to Supabase.

## Non-Goals

- No dependency install.
- No Expo config, Metro, iOS, Android, or lockfile mutation.
- No microphone permission string yet.
- No OpenAI API, provider env, migration, storage bucket, preview mutation, or
  production mutation.

## Validation

```powershell
git diff --check
git diff --exit-code -- apps/mobile/package.json apps/mobile/app.json pnpm-lock.yaml apps/mobile/metro.config.js
```
