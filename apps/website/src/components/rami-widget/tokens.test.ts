import { describe, it, expect } from "vitest";
import { tokens } from "./tokens";

describe("rami-widget tokens", () => {
  it("emerald is #10b981 to match brand", () => {
    expect(tokens.color.accent).toBe("#10b981");
  });

  it("dark theme bg matches site", () => {
    expect(tokens.color.bg).toBe("#0a0a0a");
    expect(tokens.color.panel).toBe("#18181b");
  });

  it("pill is 56px square", () => {
    expect(tokens.size.pill).toBe(56);
  });

  it("card is 380x600 on desktop", () => {
    expect(tokens.size.cardWidth).toBe(380);
    expect(tokens.size.cardHeight).toBe(600);
  });

  it("motion durations are short enough to feel snappy", () => {
    expect(tokens.motion.fadeMs).toBeLessThanOrEqual(250);
    expect(tokens.motion.slideMs).toBeLessThanOrEqual(300);
  });
});
