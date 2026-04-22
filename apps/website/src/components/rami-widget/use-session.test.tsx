import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useSession } from "./use-session";

beforeEach(() => {
  document.cookie = "ceo_session_id=; Max-Age=0; path=/";
  vi.restoreAllMocks();
});

describe("useSession", () => {
  it("creates a new session when no cookie present", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ session_id: "new-id" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSession({ apiBase: "/api/rami" }));

    await waitFor(() => expect(result.current.sessionId).toBe("new-id"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/rami/session",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("reuses existing cookie session id without round-trip", async () => {
    document.cookie = "ceo_session_id=existing-id; path=/";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSession({ apiBase: "/api/rami" }));

    await waitFor(() => expect(result.current.sessionId).toBe("existing-id"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forget() clears cookie and resets state", async () => {
    document.cookie = "ceo_session_id=existing-id; path=/";
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSession({ apiBase: "/api/rami" }));

    await waitFor(() => expect(result.current.sessionId).toBe("existing-id"));
    await act(async () => {
      await result.current.forget();
    });
    expect(result.current.sessionId).toBeNull();
    expect(document.cookie).not.toContain("ceo_session_id=existing-id");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/rami/forget/existing-id",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("network error during bootstrap leaves sessionId null", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSession({ apiBase: "/api/rami" }));

    // Wait a tick; sessionId should remain null
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.sessionId).toBeNull();
  });
});
