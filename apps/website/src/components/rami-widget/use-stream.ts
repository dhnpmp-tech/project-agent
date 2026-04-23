"use client";

import { useCallback, useRef, useState } from "react";

export interface SendArgs {
  message: string;
  page_url: string;
  lang: "en" | "ar";
}

export interface DonePayload {
  cost_usd?: number;
  session_id?: string;
  [k: string]: unknown;
}

export interface UseStreamReturn {
  /** Active streaming bubble text (last part being built up). */
  text: string;
  /** All bubbles produced this turn — finalized parts + the active one. */
  parts: string[];
  streaming: boolean;
  done: DonePayload | null;
  error: string | null;
  send: (args: SendArgs) => Promise<void>;
  abort: () => void;
  reset: () => void;
}

/**
 * Consume an SSE stream from `/api/rami/chat`.
 *
 * Wire format (matches backend `_sse()` in ceo_chat_engine.py):
 *   data: {"type":"token","text":"..."}\n\n
 *   data: {"type":"message_break"}\n\n
 *   data: {"type":"done", ...}\n\n
 *
 * Named SSE event lines (`event: token`) are also accepted as a fallback,
 * because the older mocks and a few proxies inject them.
 */
export function useStream(): UseStreamReturn {
  const [parts, setParts] = useState<string[]>([""]);
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState<DonePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setParts([""]);
    setDone(null);
    setError(null);
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const send = useCallback(async (args: SendArgs) => {
    reset();
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch("/api/rami/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
        credentials: "include",
        signal: controller.signal,
      });

      if (resp.status === 429) {
        const payload = (await resp.json().catch(() => ({}))) as { message?: string };
        setError(payload.message ?? "Rate limit. Try again shortly.");
        setStreaming(false);
        return;
      }

      if (!resp.ok || !resp.body) {
        setError(`HTTP ${resp.status}`);
        setStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      // Local copy avoids stale-state races inside the read loop.
      let local: string[] = [""];

      while (true) {
        const { value, done: chunkDone } = await reader.read();
        if (chunkDone) break;
        buf += decoder.decode(value, { stream: true });

        // Split on SSE event boundary (\n\n)
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const raw = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const ev = parseSseEvent(raw);
          if (!ev) continue;

          // Try parsing inner JSON payload; fall back to raw text for legacy mocks.
          let payload: { type?: string; text?: string; [k: string]: unknown } | null = null;
          try {
            payload = JSON.parse(ev.data);
          } catch {
            payload = null;
          }

          // Backend payloads always carry a `type` field.
          const type = payload?.type ?? (ev.event !== "message" ? ev.event : null);

          if (type === "token") {
            const t = payload?.text ?? ev.data;
            local = [...local];
            local[local.length - 1] = (local[local.length - 1] ?? "") + t;
            setParts(local);
          } else if (type === "message_break") {
            // Finalize current part and start a new empty accumulator.
            const last = (local[local.length - 1] ?? "").trim();
            if (last) {
              local = [...local.slice(0, -1), last, ""];
            }
            setParts(local);
          } else if (type === "done") {
            // Trim final part; drop empty trailing slot.
            const last = (local[local.length - 1] ?? "").trim();
            local = last ? [...local.slice(0, -1), last] : local.slice(0, -1);
            setParts(local);
            try {
              setDone(payload ?? {});
            } catch {
              setDone({});
            }
          } else if (type === "error") {
            setError(typeof payload?.text === "string" ? payload.text : ev.data || "stream error");
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // Intentional abort — silent.
      } else {
        setError((err as Error).message ?? "stream error");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [reset]);

  const text = parts[parts.length - 1] ?? "";
  return { text, parts, streaming, done, error, send, abort, reset };
}

function parseSseEvent(raw: string): { event: string; data: string } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}
