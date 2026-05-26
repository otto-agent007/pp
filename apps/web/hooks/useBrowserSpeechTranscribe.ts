"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type BrowserSpeechStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "transcribing"
  | "error";

interface UseBrowserSpeechTranscribeOptions {
  onTranscript: (text: string) => void;
}

interface BrowserSpeechAlternative {
  transcript: string;
}

interface BrowserSpeechResult {
  isFinal: boolean;
  length: number;
  [index: number]: BrowserSpeechAlternative | undefined;
}

interface BrowserSpeechResultEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: BrowserSpeechResult | undefined;
  };
}

interface BrowserSpeechErrorEvent {
  error?: string;
  message?: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechErrorEvent) => void) | null;
  onnomatch: (() => void) | null;
  onresult: ((event: BrowserSpeechResultEvent) => void) | null;
  onstart: (() => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

interface BrowserSpeechWindow extends Window {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
}

function getRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  const speechWindow = window as BrowserSpeechWindow;
  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
}

function errorMessageForBrowserSpeech(event: BrowserSpeechErrorEvent) {
  if (event.error === "not-allowed" || event.error === "service-not-allowed") {
    return "Microphone access denied. Check browser permissions and try again.";
  }

  if (event.error === "no-speech") {
    return "No speech detected. Try again.";
  }

  return (
    event.message || "Browser voice search failed. Type your search instead."
  );
}

function finalTranscriptFrom(event: BrowserSpeechResultEvent) {
  const transcripts: string[] = [];

  for (
    let index = event.resultIndex;
    index < event.results.length;
    index += 1
  ) {
    const result = event.results[index];

    if (result?.isFinal) {
      const transcript = result[0]?.transcript?.trim();

      if (transcript) {
        transcripts.push(transcript);
      }
    }
  }

  return transcripts.join(" ").trim();
}

export function isBrowserSpeechSearchSupported() {
  return getRecognitionConstructor() !== null;
}

export function useBrowserSpeechTranscribe({
  onTranscript,
}: UseBrowserSpeechTranscribeOptions) {
  const supported = useMemo(isBrowserSpeechSearchSupported, []);
  const [status, setStatus] = useState<BrowserSpeechStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const toggle = useCallback(() => {
    if (status === "error") {
      setStatus("idle");
      setError(null);
      return;
    }

    if (status === "requesting" || status === "recording") {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = getRecognitionConstructor();

    if (!Recognition) {
      setStatus("error");
      setError(
        "Voice search is not supported in this browser. Type your search instead.",
      );
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("recording");
    };
    recognition.onresult = (event) => {
      const transcript = finalTranscriptFrom(event);

      if (transcript) {
        onTranscript(transcript);
      }
    };
    recognition.onnomatch = () => {
      setError("No speech detected. Try again.");
      setStatus("error");
    };
    recognition.onerror = (event) => {
      setError(errorMessageForBrowserSpeech(event));
      setStatus("error");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setStatus((current) =>
        current === "requesting" || current === "recording" ? "idle" : current,
      );
    };

    recognitionRef.current = recognition;
    setStatus("requesting");
    setError(null);

    try {
      recognition.start();
    } catch (err) {
      recognitionRef.current = null;
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Browser voice search failed. Type your search instead.",
      );
    }
  }, [onTranscript, status]);

  return { error, status, supported, toggle };
}
