import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import EscrowRePage from "./page";

vi.mock("./escrow-re-client", () => ({
  EscrowReClient: () => <div>WDO / Escrow Clearance client</div>,
}));

describe("EscrowRePage", () => {
  it("renders the WDO escrow readiness client", () => {
    render(<EscrowRePage />);

    expect(
      screen.getByText("WDO / Escrow Clearance client"),
    ).toBeInTheDocument();
  });
});
