import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSpeechRecorder } from "./useSpeechRecorder";

function RecorderProbe() {
  const { errorMessage, start, state } = useSpeechRecorder({
    onBlob: vi.fn(),
  });

  return (
    <div>
      <p>{state}</p>
      {errorMessage ? <p>{errorMessage}</p> : null}
      <button onClick={start} type="button">
        Start recording
      </button>
    </div>
  );
}

describe("useSpeechRecorder", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "mediaDevices");
    vi.unstubAllGlobals();
  });

  it("reports unsupported recording APIs without throwing", async () => {
    const user = userEvent.setup();

    render(<RecorderProbe />);

    await user.click(screen.getByRole("button", { name: "Start recording" }));

    expect(screen.getByText("error")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Voice recording is not supported in this browser. Type your search instead.",
      ),
    ).toBeInTheDocument();
  });

  it("reports microphone permission errors from getUserMedia", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new Error("not allowed")),
      },
    });
    vi.stubGlobal(
      "MediaRecorder",
      class {
        static isTypeSupported() {
          return false;
        }
      },
    );

    render(<RecorderProbe />);

    await user.click(screen.getByRole("button", { name: "Start recording" }));

    expect(screen.getByText("error")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Microphone access denied. Check browser permissions and try again.",
      ),
    ).toBeInTheDocument();
  });
});
