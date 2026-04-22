import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Card } from "./card";

describe("Card", () => {
  function renderCard(props: Partial<React.ComponentProps<typeof Card>> = {}) {
    return render(
      <Card
        lang="en"
        onLangChange={() => {}}
        onMinimize={() => {}}
        onClose={() => {}}
        onShowIdentity={() => {}}
        {...props}
      >
        <div>body</div>
      </Card>,
    );
  }

  it("renders header with title and minimize/close/identity buttons", () => {
    renderCard();
    expect(screen.getByText(/rami/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /minimize/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /what rami remembers/i })).toBeInTheDocument();
  });

  it("renders children", () => {
    renderCard();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("clicking minimize calls onMinimize", async () => {
    const onMinimize = vi.fn();
    renderCard({ onMinimize });
    await userEvent.click(screen.getByRole("button", { name: /minimize/i }));
    expect(onMinimize).toHaveBeenCalled();
  });

  it("clicking close calls onClose", async () => {
    const onClose = vi.fn();
    renderCard({ onClose });
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
