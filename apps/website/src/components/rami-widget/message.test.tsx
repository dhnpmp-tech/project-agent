import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Message } from "./message";

describe("Message", () => {
  it("renders user message right-aligned with emerald background", () => {
    const { container } = render(<Message role="user" content="hi" />);
    const bubble = container.querySelector("[data-role='user']") as HTMLElement;
    expect(bubble).toBeTruthy();
    expect(bubble.style.alignSelf).toBe("flex-end");
    // jsdom serializes hex to rgb — #064e3b == rgb(6, 78, 59)
    expect(bubble.style.background).toBe("rgb(6, 78, 59)");
    expect(screen.getByText("hi")).toBeInTheDocument();
  });

  it("renders assistant message left-aligned with avatar", () => {
    const { container } = render(<Message role="assistant" content="hello" />);
    const bubble = container.querySelector("[data-role='assistant']") as HTMLElement;
    expect(bubble).toBeTruthy();
    expect(bubble.style.alignSelf).toBe("flex-start");
    expect(container.querySelector("[data-avatar]")).toBeTruthy();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("renders tool-call as inline pill with tool emoji", () => {
    const { container } = render(<Message role="tool" content="checking live metrics…" />);
    const pill = container.querySelector("[data-role='tool']") as HTMLElement;
    expect(pill).toBeTruthy();
    expect(pill.textContent).toMatch(/🔍/);
    expect(pill.textContent).toMatch(/checking live metrics/);
  });

  it("wraps numeric tokens in mono font", () => {
    const { container } = render(<Message role="assistant" content="We have 47 clients" />);
    const monos = container.querySelectorAll("[data-mono]");
    expect(monos.length).toBeGreaterThan(0);
    expect(Array.from(monos).some((el) => el.textContent === "47")).toBe(true);
  });
});
