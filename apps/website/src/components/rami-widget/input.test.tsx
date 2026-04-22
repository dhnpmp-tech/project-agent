import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./input";

describe("Input", () => {
  it("submits via Cmd+Enter and clears", async () => {
    const onSubmit = vi.fn();
    render(<Input lang="en" onLangChange={() => {}} onSubmit={onSubmit} disabled={false} />);
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    await userEvent.type(ta, "hi");
    await userEvent.keyboard("{Meta>}{Enter}{/Meta}");
    expect(onSubmit).toHaveBeenCalledWith("hi");
    expect(ta.value).toBe("");
  });

  it("submits via Ctrl+Enter as well", async () => {
    const onSubmit = vi.fn();
    render(<Input lang="en" onLangChange={() => {}} onSubmit={onSubmit} disabled={false} />);
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    await userEvent.type(ta, "ho");
    await userEvent.keyboard("{Control>}{Enter}{/Control}");
    expect(onSubmit).toHaveBeenCalledWith("ho");
  });

  it("flips dir to rtl when text starts with Arabic", async () => {
    render(<Input lang="en" onLangChange={() => {}} onSubmit={() => {}} disabled={false} />);
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    await userEvent.type(ta, "مرحبا");
    expect(ta.dir).toBe("rtl");
  });

  it("lang toggle button switches language", async () => {
    const onLangChange = vi.fn();
    render(<Input lang="en" onLangChange={onLangChange} onSubmit={() => {}} disabled={false} />);
    await userEvent.click(screen.getByRole("button", { name: /AR/i }));
    expect(onLangChange).toHaveBeenCalledWith("ar");
  });

  it("does not submit when disabled", async () => {
    const onSubmit = vi.fn();
    render(<Input lang="en" onLangChange={() => {}} onSubmit={onSubmit} disabled={true} />);
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(ta.disabled).toBe(true);
  });

  it("does not submit on bare Enter (allows newlines)", async () => {
    const onSubmit = vi.fn();
    render(<Input lang="en" onLangChange={() => {}} onSubmit={onSubmit} disabled={false} />);
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    await userEvent.type(ta, "a");
    await userEvent.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(ta.value).toContain("\n");
  });
});
