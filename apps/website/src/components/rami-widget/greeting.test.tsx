import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Greeting } from "./greeting";

const mkResponse = (greeting: string, chips: string[]) =>
  new Response(JSON.stringify({ greeting, chips }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("Greeting", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any;

  beforeEach(() => {
    // Default: English browser, no cookie
    Object.defineProperty(navigator, "language", { value: "en-US", configurable: true });
    Object.defineProperty(navigator, "languages", { value: ["en-US"], configurable: true });
    document.cookie = "ceo_session_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mkResponse("Hi I'm Rami.", ["Pricing", "Demo"]));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("fetches greeting with auto-detected English on mount", async () => {
    render(<Greeting path="/pricing" onChip={() => {}} />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).toContain("/api/rami/greeting");
    expect(url).toContain("path=%2Fpricing");
    expect(url).toContain("lang=en");
    await screen.findByText("Hi I'm Rami.");
  });

  it("auto-detects Arabic from navigator.language", async () => {
    Object.defineProperty(navigator, "language", { value: "ar-SA", configurable: true });
    Object.defineProperty(navigator, "languages", { value: ["ar-SA", "en-US"], configurable: true });
    render(<Greeting path="/" onChip={() => {}} />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).toContain("lang=ar");
  });

  it("renders chips and dispatches onChip on click", async () => {
    const onChip = vi.fn();
    render(<Greeting path="/" onChip={onChip} />);
    const chip = await screen.findByRole("button", { name: "Pricing" });
    await userEvent.click(chip);
    expect(onChip).toHaveBeenCalledWith("Pricing");
  });

  it("refetches when langOverride changes", async () => {
    const { rerender } = render(<Greeting path="/" onChip={() => {}} langOverride="en" />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    rerender(<Greeting path="/" onChip={() => {}} langOverride="ar" />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    const url = String(fetchSpy.mock.calls[1][0]);
    expect(url).toContain("lang=ar");
  });

  it("sends credentials: 'include' when session cookie is present", async () => {
    document.cookie = "ceo_session_id=abc123; path=/";
    render(<Greeting path="/" onChip={() => {}} />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const init = fetchSpy.mock.calls[0][1] as RequestInit | undefined;
    expect(init?.credentials).toBe("include");
  });
});
