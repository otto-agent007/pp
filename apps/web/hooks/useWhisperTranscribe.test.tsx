import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSpeechRecorder } from "./useSpeechRecorder";
import { useWhisperTranscribe } from "./useWhisperTranscribe";

vi.mock("./useSpeechRecorder", () => ({
  useSpeechRecorder: vi.fn(),
}));

function WhisperProbe({
  onTranscript,
}: {
  onTranscript: (transcript: string) => void;
}) {
  const { error, status, toggle } = useWhisperTranscribe({ onTranscript });

  return (
    <div>
      <p>{status}</p>
      {error ? <p>{error}</p> : null}
      <button onClick={toggle} type="button">
        Toggle voice
      </button>
    </div>
  );
}

describe("useWhisperTranscribe", () => {
  const startRecorder = vi.fn();
  let onBlob:
    | ((blob: Blob, mimeType: string) => void | Promise<void>)
    | undefined;

  beforeEach(() => {
    startRecorder.mockReset();
    onBlob = undefined;
    vi.mocked(useSpeechRecorder).mockImplementation((options) => {
      onBlob = options.onBlob;

      return {
        errorMessage: null,
        start: startRecorder,
        state: "idle",
        stop: vi.fn(),
      };
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts the recorder from the voice search toggle", async () => {
    const user = userEvent.setup();

    render(<WhisperProbe onTranscript={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Toggle voice" }));

    expect(startRecorder).toHaveBeenCalledTimes(1);
  });

  it("posts recorded audio and returns the transcript", async () => {
    const onTranscript = vi.fn();
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ transcript: "Rivera Cafe" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetch);

    render(<WhisperProbe onTranscript={onTranscript} />);

    await act(async () => {
      await onBlob?.(new Blob(["audio"], { type: "audio/webm" }), "audio/webm");
    });

    await waitFor(() =>
      expect(onTranscript).toHaveBeenCalledWith("Rivera Cafe"),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/transcribe",
      expect.objectContaining({
        body: expect.any(FormData),
        method: "POST",
      }),
    );
    expect(screen.getByText("idle")).toBeInTheDocument();
  });

  it("surfaces recorder permission and support errors", async () => {
    vi.mocked(useSpeechRecorder).mockImplementation(() => ({
      errorMessage:
        "Microphone access denied. Check browser permissions and try again.",
      start: startRecorder,
      state: "error",
      stop: vi.fn(),
    }));

    render(<WhisperProbe onTranscript={vi.fn()} />);

    expect(
      await screen.findByText(
        "Microphone access denied. Check browser permissions and try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("uses the root voice script hint when the local Whisper server is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );

    render(<WhisperProbe onTranscript={vi.fn()} />);

    await act(async () => {
      await onBlob?.(new Blob(["audio"], { type: "audio/webm" }), "audio/webm");
    });

    expect(
      await screen.findByText(
        "Whisper server is unavailable. Run `corepack pnpm voice:dev` in another terminal, then try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("error")).toBeInTheDocument();
  });
});
