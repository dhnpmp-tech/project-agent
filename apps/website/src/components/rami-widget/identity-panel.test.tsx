import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IdentityPanel } from "./identity-panel";

describe("IdentityPanel", () => {
  it("renders identity facts from props", () => {
    render(
      <IdentityPanel
        identity={{ name: "Ahmad", email: "a@x.com", company: "Riyadh RE" }}
        onForget={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("Ahmad")).toBeInTheDocument();
    expect(screen.getByText("a@x.com")).toBeInTheDocument();
    expect(screen.getByText("Riyadh RE")).toBeInTheDocument();
  });

  it("renders 'nothing yet' when identity is empty", () => {
    render(<IdentityPanel identity={{}} onForget={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/nothing yet/i)).toBeInTheDocument();
  });

  it("Forget me prompts confirm then calls onForget", async () => {
    const onForget = vi.fn();
    const onClose = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<IdentityPanel identity={{ name: "x" }} onForget={onForget} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /forget me/i }));
    expect(onForget).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("Forget me does nothing if user cancels", async () => {
    const onForget = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<IdentityPanel identity={{ name: "x" }} onForget={onForget} onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /forget me/i }));
    expect(onForget).not.toHaveBeenCalled();
  });

  it("includes a privacy link to /privacy", () => {
    render(<IdentityPanel identity={{}} onForget={() => {}} onClose={() => {}} />);
    const link = screen.getByRole("link", { name: /privacy/i });
    expect(link).toHaveAttribute("href", "/privacy");
  });
});
