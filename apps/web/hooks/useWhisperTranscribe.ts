"use client";

/**
 * useWhisperTranscribe
 *
 * Combines useSpeechRecorder with the /api/transcribe proxy endpoint.
 * Returns a simple toggle: call `toggle()` to start or stop recording.
 *
 * Usage:
 *   const { transcribing, toggle, error } = useWhisperTranscribe({
 *     onTranscript: (text) => setSearch(text),
 *   });
 */

import { useCallback, useState } from "react";

import { useSpeechRecorder } from "./useSpeechRecorder";

interface UseWhisperTranscribeOptions {
  /** Called with the final transcript string once Whisper responds. */
  onTranscript: (text: string) => void;
}

export type WhisperStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "transcribing"
  | "error";

export function useWhisperTranscribe({
  onTranscript,
}: UseWhisperTranscribeOptions) {
  const [status, setStatus] = useState<WhisperStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleBlob = useCallback(
    async (blob: Blob, mimeType: string) => {
      setStatus("transcribing");
      setError(null);

      const formData = new FormData();
      formData.append("audio", blob, `recording.${mimeType.includes("webm") ? "webm" : "ogg"}`);

      try {
        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Whisper server error ${res.status}: ${body}`);
        }

        const data = (await res.json()) as { transcript: string };
        if (data.transcript) {
          onTranscript(data.transcript);
        }
        setStatus("idle");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Transcription failed";
        setError(
          message.includes("fetch")
            ? "Whisper server not running. Start it with: cd apps/whisper && .\\start.ps1"
            : message,
        );
        setStatus("error");
      }
    },
    [onTranscript],
  );

  const { start, state: recorderState } = useSpeechRecorder({
    onBlob: handleBlob,
  });

  // Keep status in sync with recorder state when not transcribing.
  const derivedStatus: WhisperStatus =
    status === "transcribing" || status === "error"
      ? status
      : (recorderState as WhisperStatus);

  const toggle = useCallback(() => {
    if (derivedStatus === "error") {
      setStatus("idle");
      setError(null);
      return;
    }
    void start();
  }, [derivedStatus, start]);

  return { error, status: derivedStatus, toggle };
}
