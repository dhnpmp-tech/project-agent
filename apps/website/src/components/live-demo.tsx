"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FadeUp } from "@/components/motion";

/* ── Types ─────────────────────────────────────── */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
}

/* ── Constants ─────────────────────────────────── */
const API_URL = "https://n8n.dcp.sa/chat/message";
const CLIENT_ID = "bde4efa3-33a2-42a4-ba2c-e803a09aa936";

const INITIAL_MESSAGES: Message[] = [
  {
    id: "init-1",
    role: "assistant",
    content:
      "Ahlan! I\u2019m Rami, CEO of AI Agent Systems. Want to see what our AI agents can do for your business? Ask me anything \u2014 pricing, features, how fast we deploy.",
    time: formatTime(new Date()),
  },
];

const SUGGESTED_PROMPTS = [
  "What do your AI agents do?",
  "How much does it cost?",
  "How fast can you deploy?",
  "Do you support Arabic?",
];

/* ── Helpers ───────────────────────────────────── */
function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m < 10 ? "0" : ""}${m} ${ampm}`;
}

function generateSessionId(): string {
  return (
    "demo_" +
    Math.random().toString(36).substring(2, 10) +
    Date.now().toString(36)
  );
}

/* ── Component ─────────────────────────────────── */
export function LiveDemo() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(generateSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      const userMsg: Message = {
        id: "u_" + Date.now(),
        role: "user",
        content: trimmed,
        time: formatTime(new Date()),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: CLIENT_ID,
            session_id: sessionId,
            message: trimmed,
          }),
        });

        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();
        const aiMsg: Message = {
          id: "a_" + Date.now(),
          role: "assistant",
          content: data.reply || data.message || "Sorry, I didn\u2019t catch that.",
          time: formatTime(new Date()),
        };

        setMessages((prev) => [...prev, aiMsg]);
      } catch {
        const errMsg: Message = {
          id: "e_" + Date.now(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          time: formatTime(new Date()),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, sessionId]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handlePromptClick = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <section className="px-6 py-24 relative overflow-hidden" id="live-demo">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="flex flex-col items-center">
          {/* Heading */}
          <FadeUp>
            <div className="text-center mb-14">
              <h2 className="text-4xl md:text-[3.5rem] font-extrabold tracking-[-0.03em] leading-[1.05]">
                Don&apos;t take our word for it.
              </h2>
              <p className="mt-6 text-white/40 text-lg leading-relaxed max-w-[50ch] mx-auto">
                Talk to Rami yourself. This is a live AI &mdash; not a recording.
              </p>
            </div>
          </FadeUp>

          {/* Phone + Pills layout */}
          <FadeUp delay={0.2}>
            <div className="flex flex-col items-center gap-8">
              {/* Phone Frame */}
              <div className="phone-frame">
                {/* Notch */}
                <div className="phone-notch" />

                {/* Status bar */}
                <div className="flex items-center justify-between px-6 pt-3 pb-0 text-[10px] text-white/50 relative z-20 bg-black">
                  <span className="font-semibold">9:41</span>
                  <div className="flex items-center gap-1">
                    {/* Signal */}
                    <svg className="w-[14px] h-[10px]" viewBox="0 0 17 12" fill="white" opacity="0.5">
                      <rect x="0" y="8" width="3" height="4" rx="0.5" />
                      <rect x="4.5" y="5" width="3" height="7" rx="0.5" />
                      <rect x="9" y="2" width="3" height="10" rx="0.5" />
                      <rect x="13.5" y="0" width="3" height="12" rx="0.5" />
                    </svg>
                    {/* Wifi */}
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5">
                      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                      <circle cx="12" cy="20" r="1" fill="white" stroke="none" />
                    </svg>
                    {/* Battery */}
                    <svg className="w-[22px] h-[10px]" viewBox="0 0 27 13" fill="none" opacity="0.5">
                      <rect x="0.5" y="0.5" width="22" height="12" rx="2" stroke="white" />
                      <rect x="2" y="2" width="19" height="9" rx="1" fill="white" />
                      <rect x="24" y="4" width="2.5" height="5" rx="1" fill="white" />
                    </svg>
                  </div>
                </div>

                {/* WhatsApp Header */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1f2c34] border-b border-white/[0.06]">
                  {/* Back arrow */}
                  <svg className="w-5 h-5 text-white/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">R</span>
                  </div>
                  {/* Name + status */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-white leading-tight">Rami Mansour</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[11px] text-white/40">online</span>
                    </div>
                  </div>
                  {/* Call icons (decorative) */}
                  <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                </div>

                {/* Chat wallpaper */}
                <div className="flex-1 overflow-hidden relative">
                  {/* Subtle WA pattern */}
                  <div className="absolute inset-0 bg-[#0b141a] opacity-100" />

                  {/* Messages */}
                  <div ref={chatScrollRef} className="relative z-10 h-full overflow-y-auto p-3 flex flex-col gap-1.5 chat-scroll">
                    <AnimatePresence mode="popLayout">
                      {messages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 12, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] px-3 py-2 text-[14px] leading-[1.5] relative ${
                              msg.role === "user"
                                ? "bg-[#005c4b] text-white rounded-[16px_4px_16px_16px]"
                                : "bg-white/[0.08] text-white/90 rounded-[4px_16px_16px_16px]"
                            }`}
                          >
                            {msg.content}
                            <span className="block text-right text-[10px] text-white/30 mt-1 -mb-0.5">
                              {msg.time}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* Typing indicator */}
                    <AnimatePresence>
                      {isTyping && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex justify-start"
                        >
                          <div className="bg-white/[0.08] rounded-[4px_16px_16px_16px] px-4 py-3 flex items-center gap-1.5">
                            <span className="typing-dot" />
                            <span className="typing-dot delay-1" />
                            <span className="typing-dot delay-2" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input area */}
                <div className="bg-[#1f2c34] px-2 py-2 flex items-end gap-2 border-t border-white/[0.04]">
                  {/* Emoji (decorative) */}
                  <button className="w-9 h-9 flex items-center justify-center text-white/25 flex-shrink-0" tabIndex={-1} aria-hidden>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                    </svg>
                  </button>

                  {/* Input */}
                  <form onSubmit={handleSubmit} className="flex-1 flex items-center bg-[#2a3942] rounded-full px-4 py-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type a message"
                      className="flex-1 bg-transparent text-[14px] text-white/90 placeholder:text-white/25 outline-none"
                      autoComplete="off"
                    />
                  </form>

                  {/* Camera (decorative) */}
                  <button className="w-9 h-9 flex items-center justify-center text-white/25 flex-shrink-0" tabIndex={-1} aria-hidden>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                    </svg>
                  </button>

                  {/* Send / Mic button */}
                  {input.trim() ? (
                    <button
                      onClick={() => sendMessage(input)}
                      className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 transition-transform active:scale-90"
                    >
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  ) : (
                    <button className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 opacity-60" tabIndex={-1} aria-hidden>
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Home indicator bar */}
                <div className="bg-black py-2 flex justify-center">
                  <div className="w-[134px] h-[5px] rounded-full bg-white/20" />
                </div>
              </div>

              {/* Suggested prompts */}
              <div className="flex flex-wrap justify-center gap-2 max-w-[500px]">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handlePromptClick(prompt)}
                    disabled={isTyping}
                    className="text-[13px] font-medium text-white/50 bg-white/[0.04] hover:bg-white/[0.07] ring-1 ring-white/[0.08] hover:ring-white/[0.14] rounded-full px-4 py-2 transition-all duration-300 active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </div>

      {/* Scoped styles */}
      <style jsx>{`
        .phone-frame {
          width: 375px;
          height: 680px;
          border-radius: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          background: #000;
          overflow: hidden;
          position: relative;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
        }
        .phone-notch {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 150px;
          height: 28px;
          background: #000;
          border-radius: 0 0 20px 20px;
          z-index: 10;
        }
        .chat-scroll {
          height: 100%;
        }
        .chat-scroll::-webkit-scrollbar {
          width: 3px;
        }
        .chat-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
        }
        .typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          animation: typingPulse 1.4s ease-in-out infinite;
        }
        .delay-1 {
          animation-delay: 0.2s;
        }
        .delay-2 {
          animation-delay: 0.4s;
        }
        @keyframes typingPulse {
          0%,
          100% {
            opacity: 0.25;
          }
          50% {
            opacity: 0.9;
          }
        }
        @media (max-width: 480px) {
          .phone-frame {
            width: 100%;
            max-width: 340px;
            height: 600px;
            border-radius: 32px;
          }
        }
      `}</style>
    </section>
  );
}
