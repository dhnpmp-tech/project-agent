import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Stream } from "./stream";
import type { MessageRole } from "./message";

describe("Stream", () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all messages from props", () => {
    render(
      <Stream
        messages={[
          { id: "1", role: "user", content: "hello" },
          { id: "2", role: "assistant", content: "hi back" },
        ]}
        streamingText=""
        streaming={false}
      />,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText("hi back")).toBeInTheDocument();
  });

  it("renders streamingText as a live assistant bubble with cursor", () => {
    render(
      <Stream
        messages={[]}
        streamingText="Streaming…"
        streaming={true}
      />,
    );
    expect(screen.getByText(/Streaming/)).toBeInTheDocument();
    expect(screen.getByTestId("stream-cursor")).toBeInTheDocument();
  });

  it("hides cursor when streaming=false", () => {
    render(<Stream messages={[]} streamingText="" streaming={false} />);
    expect(screen.queryByTestId("stream-cursor")).not.toBeInTheDocument();
  });

  it("scrolls to bottom when new content arrives", () => {
    const scrollSpy = vi.fn();
    Element.prototype.scrollTo = scrollSpy;
    const { rerender } = render(
      <Stream messages={[{ id: "1", role: "user" as MessageRole, content: "a" }]} streamingText="" streaming={false} />,
    );
    act(() => {
      rerender(
        <Stream
          messages={[
            { id: "1", role: "user" as MessageRole, content: "a" },
            { id: "2", role: "assistant" as MessageRole, content: "b" },
          ]}
          streamingText=""
          streaming={false}
        />,
      );
    });
    expect(scrollSpy).toHaveBeenCalled();
  });
});
