import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useBrowserSpeechTranscribe } from "./useBrowserSpeechTranscribe";

type ResultHandler =
  | ((event: {
      resultIndex: number;
      results: Array<{
        isFinal: boolean;
        0: { transcript: string };
        length: number;
      }>;
    }) => void)
  | null;

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = [];

  continuous = true;
  interimResults = true;
  lang = "";
  maxAlternatives = 0;
  onend: (() => void) | null = null;
  onerror: ((event: { error?: string; message?: string }) => void) | null =
    null;
  onnomatch: (() => void) | null = null;
  onresult: ResultHandler = null;
  onstart: (() => void) | null = null;
  abort = vi.fn();
  start = vi.fn(() => this.onstart?.());
  stop = vi.fn(() => this.onend?.());

  constructor() {
    MockSpeechRecognition.instances.push(this);
  }

  emitResult(transcript: string, isFinal = true) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ 0: { transcript }, isFinal, length: 1 }],
    });
  }
}

function installSpeechRecognition() {
  Object.defineProperty(window, "SpeechRecognition", {
    configurable: true,
    value: MockSpeechRecognition,
  });
}

function clearSpeechRecognition() {
  MockSpeechRecognition.instances = [];
  delete (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition;
  delete (window as Window & { webkitSpeechRecognition?: unknown })
    .webkitSpeechRecognition;
}

function BrowserSpeechProbe({
  onTranscript,
}: {
  onTranscript: (transcript: string) => void;
}) {
  const { error, status, supported, toggle } = useBrowserSpeechTranscribe({
    onTranscript,
  });

  return (
    <div>
      <p data-testid="supported">{String(supported)}</p>
      <p>{status}</p>
      {error ? <p>{error}</p> : null}
      <button onClick={toggle} type="button">
        Toggle browser speech
      </button>
    </div>
  );
}

describe("useBrowserSpeechTranscribe", () => {
  afterEach(() => {
    clearSpeechRecognition();
  });

  it("reports unsupported when SpeechRecognition constructors are absent", async () => {
    const user = userEvent.setup();

    render(<BrowserSpeechProbe onTranscript={vi.fn()} />);

    expect(screen.getByTestId("supported")).toHaveTextContent("false");

    await user.click(
      screen.getByRole("button", { name: "Toggle browser speech" }),
    );

    expect(screen.getByText("error")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Voice search is not supported in this browser. Type your search instead.",
      ),
    ).toBeInTheDocument();
  });

  it("starts browser recognition and returns the final transcript", async () => {
    const user = userEvent.setup();
    const onTranscript = vi.fn();
    installSpeechRecognition();

    render(<BrowserSpeechProbe onTranscript={onTranscript} />);

    await user.click(
      screen.getByRole("button", { name: "Toggle browser speech" }),
    );

    const recognition = MockSpeechRecognition.instances[0];
    expect(recognition.start).toHaveBeenCalledTimes(1);
    expect(recognition.continuous).toBe(false);
    expect(recognition.interimResults).toBe(false);
    expect(recognition.lang).toBe("en-US");

    act(() => {
      recognition.emitResult("Rivera Cafe");
      recognition.onend?.();
    });

    expect(onTranscript).toHaveBeenCalledWith("Rivera Cafe");
    expect(screen.getByText("idle")).toBeInTheDocument();
  });

  it("ignores interim results until a final transcript is available", async () => {
    const user = userEvent.setup();
    const onTranscript = vi.fn();
    installSpeechRecognition();

    render(<BrowserSpeechProbe onTranscript={onTranscript} />);

    await user.click(
      screen.getByRole("button", { name: "Toggle browser speech" }),
    );

    const recognition = MockSpeechRecognition.instances[0];
    act(() => {
      recognition.emitResult("not final", false);
    });
    expect(onTranscript).not.toHaveBeenCalled();

    act(() => {
      recognition.emitResult("Harbor Heights", true);
      recognition.onend?.();
    });

    expect(onTranscript).toHaveBeenCalledWith("Harbor Heights");
  });

  it("maps not-allowed errors to microphone permission copy", async () => {
    const user = userEvent.setup();
    installSpeechRecognition();

    render(<BrowserSpeechProbe onTranscript={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: "Toggle browser speech" }),
    );

    act(() => {
      MockSpeechRecognition.instances[0].onerror?.({ error: "not-allowed" });
    });

    expect(screen.getByText("error")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Microphone access denied. Check browser permissions and try again.",
      ),
    ).toBeInTheDocument();
  });

  it("aborts active recognition on unmount", async () => {
    const user = userEvent.setup();
    installSpeechRecognition();

    const { unmount } = render(<BrowserSpeechProbe onTranscript={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: "Toggle browser speech" }),
    );

    const recognition = MockSpeechRecognition.instances[0];
    unmount();

    expect(recognition.abort).toHaveBeenCalledTimes(1);
  });
});
