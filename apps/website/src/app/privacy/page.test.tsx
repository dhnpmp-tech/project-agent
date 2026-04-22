// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPage from "./page";

describe("PrivacyPage", () => {
  it("renders the page heading", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { name: /privacy/i, level: 1 })).toBeInTheDocument();
  });

  it("mentions UAE PDPL and KSA PDPL", () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText(/UAE PDPL/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/KSA PDPL/i).length).toBeGreaterThan(0);
  });

  it("explains the chat widget data scope", () => {
    render(<PrivacyPage />);
    // What gets stored
    expect(screen.getAllByText(/messages/i).length).toBeGreaterThan(0);
    // Retention window
    expect(screen.getByText(/retention/i)).toBeInTheDocument();
    // Forget me flow
    expect(screen.getAllByText(/forget me/i).length).toBeGreaterThan(0);
  });

  it("includes an Arabic language section", () => {
    render(<PrivacyPage />);
    // Look for at least one Arabic char in body text
    const html = document.body.textContent ?? "";
    expect(html).toMatch(/[\u0600-\u06FF]/);
  });
});
