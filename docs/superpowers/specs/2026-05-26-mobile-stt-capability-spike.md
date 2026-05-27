# Mobile STT Capability Decision V1

## Goal

Choose the mobile speech-to-text path before adding technician dictation. The
first implementation target is treatment-note dictation inside existing
editable treatment-form drafts, not persisted audio or a new evidence type.

## Decision

- Use a recorded-audio transcription provider adapter for V1, behind an
  explicitly approved server/provider slice. Do not add native OS STT first.
- Keep manual typed notes as the primary offline path. STT is an optional
  online assist and must never block form completion.
- Support English and Spanish in the first implementation. Default to English
  until the technician chooses Spanish or the app has a reliable route/user
  language setting.
- Insert only final transcript text into existing editable draft fields. Do
  not expose interim transcript text as saved field state.
- Do not retain raw audio. Do not queue raw audio while offline. Delete local
  temporary audio after transcript success, failure, or cancellation.
- Add the microphone permission, audio recording package, provider route, and
  provider env only in the later implementation slice after approval.

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

## Implementation Shape For The Later Slice

- Add dictation controls to treatment-form textarea fields first:
  `target_pests`, `areas_treated`, `materials_applied`,
  `application_method`, `weather_conditions`, and `customer_instructions`.
- Write transcript text through the existing `useFormDrafts.setFieldValue`
  path. If the field already has text, append the transcript after a newline;
  otherwise replace the empty value.
- The mobile UI states are `idle`, `recording`, `transcribing`, `inserted`,
  `permission_denied`, `no_speech`, `offline`, and `provider_error`.
- Permission copy: "Allow Pest Patrol OS to use the microphone for technician
  note dictation. Audio is transcribed for the current draft and not retained."
- Provider failures should leave the draft unchanged and show typed-note
  fallback copy.
- The server/provider route must accept audio, return transcript text plus
  language/confidence metadata when available, and avoid writing audio or
  transcript records unless a separate evidence-storage slice is approved.

## Expo Go And Dev Client

Expo Go has a fixed native library set, so native STT modules that are not
bundled in Expo Go require a development build/dev client. `expo-speech` is
text-to-speech, not speech-to-text, so it does not solve dictation. Current
Expo audio docs support audio recording with microphone permission/config
work, which makes recorded-audio transcription the cleaner V1 path than
native OS speech recognition.

A later implementation slice may need:

- an Expo SDK-compatible audio recording package,
- microphone permission entries,
- a server-only provider adapter,
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
- No OpenAI API call, provider env, migration, storage bucket, preview
  mutation, or production mutation.
- No native STT package selection until the project explicitly chooses a
  development-build/native-recognition path.

## Validation

```powershell
git diff --check
git diff --exit-code -- apps/mobile/package.json apps/mobile/app.json pnpm-lock.yaml apps/mobile/metro.config.js
```
