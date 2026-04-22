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
  text: string;
  streaming: boolean;
  done: DonePayload | null;
  error: string | null;
  send: (args: SendArgs) => Promise<void>;
  abort: () => void;
  reset: () => void;
}

/**
 * Consume an SSE stream from `/api/rami/chat`.
 * Implementation note: we use fetch + ReadableStream because EventSource
 * does not support POST.
 */
export function useStream(): UseStreamReturn {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState<DonePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setText("");
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
      let acc = "";

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
          if (ev.event === "token") {
            acc += ev.data;
            setText(acc);
          } else if (ev.event === "done") {
            try {
              setDone(JSON.parse(ev.data) as DonePayload);
            } catch {
              setDone({});
            }
          } else if (ev.event === "error") {
            setError(ev.data || "stream error");
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

  return { text, streaming, done, error, send, abort, reset };
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
