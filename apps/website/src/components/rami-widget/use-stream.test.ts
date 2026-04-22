// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useStream } from "./use-stream";

/** Build a Response whose body is a ReadableStream emitting given SSE chunks. */
function sseResponse(chunks: string[], opts: { failAt?: number } = {}) {
  const encoder = new TextEncoder();
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (opts.failAt !== undefined && i === opts.failAt) {
        controller.error(new Error("boom"));
        return;
      }
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[i]));
      i += 1;
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("useStream", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });
  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("yields tokens in order from a mocked SSE source", async () => {
    fetchSpy.mockResolvedValue(
      sseResponse([
        "event: token\ndata: Hel\n\n",
        "event: token\ndata: lo\n\n",
        "event: done\ndata: {\"cost_usd\":0.001}\n\n",
      ]),
    );

    const { result } = renderHook(() => useStream());
    await act(async () => {
      await result.current.send({ message: "hi", page_url: "/", lang: "en" });
    });

    await waitFor(() => expect(result.current.streaming).toBe(false));
    expect(result.current.text).toBe("Hello");
    expect(result.current.done).toEqual({ cost_usd: 0.001 });
    expect(result.current.error).toBeNull();
  });

  it("supports abort during stream", async () => {
    fetchSpy.mockResolvedValue(
      sseResponse([
        "event: token\ndata: Hel\n\n",
        "event: token\ndata: lo\n\n",
      ]),
    );
    const { result } = renderHook(() => useStream());
    act(() => {
      void result.current.send({ message: "hi", page_url: "/", lang: "en" });
    });
    act(() => {
      result.current.abort();
    });
    await waitFor(() => expect(result.current.streaming).toBe(false));
  });

  it("surfaces fetch error", async () => {
    fetchSpy.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useStream());
    await act(async () => {
      await result.current.send({ message: "hi", page_url: "/", lang: "en" });
    });
    expect(result.current.streaming).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it("handles 429 rate-limit JSON response", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ throttled: true, message: "slow down" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { result } = renderHook(() => useStream());
    await act(async () => {
      await result.current.send({ message: "hi", page_url: "/", lang: "en" });
    });
    expect(result.current.error).toMatch(/slow down/);
  });
});
