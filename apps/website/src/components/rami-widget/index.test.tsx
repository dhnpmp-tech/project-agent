import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RamiWidget } from "./index";

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sseResp(chunks: string[]) {
  const enc = new TextEncoder();
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(c) {
      if (i >= chunks.length) {
        c.close();
        return;
      }
      c.enqueue(enc.encode(chunks[i]));
      i += 1;
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("RamiWidget", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any;

  beforeEach(() => {
    document.cookie = "ceo_session_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    Object.defineProperty(navigator, "language", { value: "en-US", configurable: true });
    Object.defineProperty(navigator, "languages", { value: ["en-US"], configurable: true });

    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/rami/session")) {
        return jsonResp({ session_id: "test-sess" });
      }
      if (url.includes("/api/rami/greeting")) {
        return jsonResp({ greeting: "Hi I'm Rami.", chips: ["Pricing"] });
      }
      if (url.includes("/api/rami/chat")) {
        return sseResp([
          "event: token\ndata: Hello\n\n",
          "event: done\ndata: {\"cost_usd\":0.001}\n\n",
        ]);
      }
      return jsonResp({});
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("renders the pill closed by default", () => {
    render(<RamiWidget pagePath="/" />);
    expect(screen.getByRole("button", { name: /ask rami/i })).toBeInTheDocument();
  });

  it("clicking pill opens the card and fetches greeting", async () => {
    render(<RamiWidget pagePath="/pricing" />);
    await userEvent.click(screen.getByRole("button", { name: /ask rami/i }));
    expect(screen.getByRole("dialog", { name: /ask rami/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Hi I'm Rami.")).toBeInTheDocument());
  });

  it("typing then submitting fires chat fetch and renders streamed text", async () => {
    render(<RamiWidget pagePath="/" />);
    await userEvent.click(screen.getByRole("button", { name: /ask rami/i }));
    await waitFor(() => expect(screen.getByText("Hi I'm Rami.")).toBeInTheDocument());
    const ta = screen.getByRole("textbox");
    await userEvent.type(ta, "hi");
    await act(async () => {
      await userEvent.keyboard("{Meta>}{Enter}{/Meta}");
    });
    await waitFor(() => {
      const chatCall = fetchSpy.mock.calls.find((c: unknown[]) => String(c[0]).includes("/api/rami/chat"));
      expect(chatCall).toBeTruthy();
    });
    await waitFor(() => expect(screen.getByText("Hello")).toBeInTheDocument());
  });

  it("identity panel opens via header button", async () => {
    render(<RamiWidget pagePath="/" />);
    await userEvent.click(screen.getByRole("button", { name: /ask rami/i }));
    await userEvent.click(screen.getByRole("button", { name: /what rami remembers/i }));
    expect(screen.getByRole("dialog", { name: /what rami remembers/i })).toBeInTheDocument();
  });

  it("close button collapses card back to pill", async () => {
    render(<RamiWidget pagePath="/" />);
    await userEvent.click(screen.getByRole("button", { name: /ask rami/i }));
    expect(screen.queryByRole("button", { name: /ask rami/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("button", { name: /ask rami/i })).toBeInTheDocument();
  });
});
