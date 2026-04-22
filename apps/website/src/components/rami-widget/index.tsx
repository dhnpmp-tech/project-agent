"use client";

import { useState, useCallback, useEffect } from "react";
import { Pill } from "./pill";
import { Card } from "./card";
import { Greeting } from "./greeting";
import { Stream, type StreamMessage } from "./stream";
import { Input } from "./input";
import { IdentityPanel, type Identity } from "./identity-panel";
import { useStream } from "./use-stream";
import { useSession } from "./use-session";
import { detectBrowserLang } from "./lang";

export interface RamiWidgetProps {
  pagePath: string;
  apiBase?: string;
}

export function RamiWidget({ pagePath, apiBase = "/api/rami" }: RamiWidgetProps) {
  const [open, setOpen] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [identity, setIdentity] = useState<Identity>({});
  const stream = useStream();
  const { sessionId, forget } = useSession({ apiBase });

  // Detect browser language once on mount
  useEffect(() => {
    setLang(detectBrowserLang());
  }, []);

  // When a streamed response finishes, append it to messages
  useEffect(() => {
    if (stream.done && stream.text) {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: stream.text },
      ]);
      stream.reset();
    }
  }, [stream.done, stream.text, stream.reset]);

  const handleSubmit = useCallback(
    (text: string) => {
      const id = `u-${Date.now()}`;
      setMessages((prev) => [...prev, { id, role: "user", content: text }]);
      void stream.send({ message: text, page_url: pagePath, lang });
    },
    [stream, pagePath, lang],
  );

  const handleChip = useCallback(
    (chip: string) => {
      handleSubmit(chip);
    },
    [handleSubmit],
  );

  const handleForget = useCallback(async () => {
    await forget();
    setMessages([]);
    setIdentity({});
    stream.reset();
  }, [forget, stream]);

  if (!open) {
    return <Pill lang={lang} onClick={() => setOpen(true)} />;
  }

  return (
    <Card
      lang={lang}
      onLangChange={setLang}
      onMinimize={() => setOpen(false)}
      onClose={() => {
        setOpen(false);
        setShowIdentity(false);
      }}
      onShowIdentity={() => setShowIdentity(true)}
    >
      {messages.length === 0 && !stream.streaming ? (
        <Greeting path={pagePath} onChip={handleChip} langOverride={lang} />
      ) : (
        <Stream
          messages={messages}
          streamingText={stream.text}
          streaming={stream.streaming}
        />
      )}
      {stream.error && (
        <div
          role="status"
          style={{
            padding: "6px 12px",
            color: "#fca5a5",
            fontSize: 12,
            background: "#3f1d1d",
            borderTop: "1px solid #7f1d1d",
          }}
        >
          {stream.error}
        </div>
      )}
      <Input
        lang={lang}
        onLangChange={setLang}
        onSubmit={handleSubmit}
        disabled={stream.streaming || !sessionId}
      />
      {showIdentity && (
        <IdentityPanel
          identity={identity}
          onForget={handleForget}
          onClose={() => setShowIdentity(false)}
        />
      )}
    </Card>
  );
}
