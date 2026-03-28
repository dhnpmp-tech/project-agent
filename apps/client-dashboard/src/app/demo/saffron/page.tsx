"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

const QUICK_REPLIES = [
  "📋 Menu",
  "📅 Book a table",
  "🕐 Opening hours",
  "📍 Location",
];

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  text: "مرحبا! Welcome to Saffron Kitchen 🍽️ I'm your AI assistant. I can help with reservations, menu, and more. How can I help you today?",
  sender: "bot",
  timestamp: new Date(),
};

export default function SaffronCustomerDemo() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/demo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          mode: "customer",
          restaurantId: "saffron",
        }),
      });

      const data = await res.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply || "Sorry, I couldn't process that. Please try again.",
        sender: "bot",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Connection error. Please try again.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-[100dvh] bg-[#09090b] text-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-[#111113] border-b border-[#222] shrink-0">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-lg font-bold">
            S
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#111113]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold truncate">Saffron Kitchen</h1>
          <p className="text-xs text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            Online
          </p>
        </div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium px-2 py-1 rounded bg-[#1a1a1a] border border-[#2a2a2a]">
          Demo
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scroll-smooth">
        {/* Background pattern */}
        <div className="fixed inset-0 opacity-[0.02] pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-[fadeInUp_0.3s_ease-out]`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-lg ${
                msg.sender === "user"
                  ? "bg-[#22c55e] text-white rounded-br-md"
                  : "bg-[#1a1a1a] text-zinc-100 rounded-bl-md border border-[#2a2a2a]"
              }`}
            >
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                {msg.text}
              </p>
              <p
                className={`text-[10px] mt-1 text-right ${
                  msg.sender === "user" ? "text-green-100/70" : "text-zinc-500"
                }`}
              >
                {formatTime(msg.timestamp)}
                {msg.sender === "user" && (
                  <span className="ml-1 text-green-100/70">✓✓</span>
                )}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start animate-[fadeInUp_0.2s_ease-out]">
            <div className="bg-[#1a1a1a] rounded-2xl rounded-bl-md px-4 py-3 border border-[#2a2a2a]">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-zinc-500 animate-[bounce_1.4s_ease-in-out_infinite]" />
                <span className="w-2 h-2 rounded-full bg-zinc-500 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
                <span className="w-2 h-2 rounded-full bg-zinc-500 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Quick replies */}
      <div className="px-3 pb-2 shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              onClick={() => sendMessage(reply)}
              disabled={isTyping}
              className="flex-none px-3.5 py-2 text-sm rounded-full bg-[#1a1a1a] border border-[#333] text-zinc-300 hover:bg-[#252525] hover:border-green-500/40 hover:text-green-400 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap"
            >
              {reply}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-3 bg-[#111113] border-t border-[#222] shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isTyping}
          className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-full px-4 py-2.5 text-[15px] text-white placeholder-zinc-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="w-10 h-10 rounded-full bg-[#22c55e] flex items-center justify-center hover:bg-green-600 active:scale-90 transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none shrink-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5 text-white translate-x-[1px]"
          >
            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
          </svg>
        </button>
      </form>

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
