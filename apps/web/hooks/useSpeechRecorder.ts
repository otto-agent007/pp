"use client";

/**
 * useSpeechRecorder
 *
 * Records microphone audio via MediaRecorder and returns a Blob when the
 * user stops recording. Does NOT call the server - combine with
 * useWhisperTranscribe for the full pipeline.
 *
 * Usage:
 *   const { state, start, stop } = useSpeechRecorder({ onBlob });
 *
 * States: "idle" | "requesting" | "recording" | "error"
 */

import { useCallback, useRef, useState } from "react";

export type RecorderState = "idle" | "requesting" | "recording" | "error";

interface UseSpeechRecorderOptions {
  /** Called with the recorded audio Blob once recording stops. */
  onBlob: (blob: Blob, mimeType: string) => void;
  /** Max recording time in ms before auto-stop (default: 15 000). */
  maxDurationMs?: number;
}

export function useSpeechRecorder({
  onBlob,
  maxDurationMs = 15_000,
}: UseSpeechRecorderOptions) {
  const [state, setState] = useState<RecorderState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    if (state === "recording") {
      stop();
      return;
    }

    setState("requesting");
    setErrorMessage(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState("error");
      setErrorMessage(
        "Microphone access denied. Check browser permissions and try again.",
      );
      return;
    }

    // Prefer webm/opus (Chrome), fall back to whatever the browser supports.
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      // Stop all tracks so the browser mic indicator disappears.
      stream.getTracks().forEach((t) => t.stop());
      onBlob(blob, recorder.mimeType || "audio/webm");
    };

    recorder.start();
    setState("recording");

    // Auto-stop after maxDurationMs to prevent runaway recordings.
    timeoutRef.current = setTimeout(stop, maxDurationMs);
  }, [state, stop, onBlob, maxDurationMs]);

  return { errorMessage, start, state, stop };
}
