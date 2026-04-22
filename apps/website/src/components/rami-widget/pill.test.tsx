import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pill } from "./pill";

describe("Pill", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a button with English aria-label by default", () => {
    render(<Pill onClick={() => {}} lang="en" />);
    const btn = screen.getByRole("button", { name: /ask rami/i });
    expect(btn).toBeInTheDocument();
  });

  it("renders Arabic aria-label when lang=ar", () => {
    render(<Pill onClick={() => {}} lang="ar" />);
    // Arabic label includes "رامي"
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-label", expect.stringContaining("رامي"));
  });

  it("invokes onClick when clicked", async () => {
    vi.useRealTimers(); // userEvent needs real timers
    const onClick = vi.fn();
    render(<Pill onClick={onClick} lang="en" />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies pulse class only after dwell threshold (60s)", () => {
    const { rerender } = render(<Pill onClick={() => {}} lang="en" />);
    const btn = screen.getByRole("button");
    expect(btn.dataset.pulsing).toBe("false");

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    rerender(<Pill onClick={() => {}} lang="en" />);
    expect(btn.dataset.pulsing).toBe("true");
  });
});
