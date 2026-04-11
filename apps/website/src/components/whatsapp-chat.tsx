"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const conversation = [
  { from: "customer", text: "Hi, I'd like to book a table for 4 tonight", delay: 0 },
  { from: "agent", text: "Welcome back, Sara! I remember you prefer the outdoor terrace. I've noted your nut allergy from last time. Would 8 PM work?", delay: 1800 },
  { from: "customer", text: "Perfect, 8 PM works", delay: 3600 },
  { from: "agent", text: "Done — table for 4, terrace, 8 PM tonight. I've flagged your nut allergy with the kitchen. See you soon!", delay: 5200 },
];

const spring = { type: "spring" as const, stiffness: 120, damping: 20 };

export function WhatsAppChat() {
  const [messages, setMessages] = useState<typeof conversation>([]);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    setMessages([]);
    const timers: NodeJS.Timeout[] = [];

    conversation.forEach((msg, i) => {
      const timer = setTimeout(() => {
        setMessages((prev) => [...prev, msg]);
      }, msg.delay);
      timers.push(timer);
    });

    const resetTimer = setTimeout(() => {
      setCycle((c) => c + 1);
    }, 8000);
    timers.push(resetTimer);

    return () => timers.forEach(clearTimeout);
  }, [cycle]);

  return (
    <div className="w-full max-w-[340px] rounded-2xl bg-zinc-900 ring-1 ring-white/[0.06] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-600/10 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-white">Saffron Kitchen</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] text-white/40">AI Agent online</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-3 min-h-[220px]">
        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <motion.div
              key={`${cycle}-${i}`}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={spring}
              className={`flex ${msg.from === "customer" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed ${
                  msg.from === "customer"
                    ? "bg-emerald-600/20 text-emerald-100 rounded-br-sm"
                    : "bg-white/[0.04] text-white/70 ring-1 ring-white/[0.06] rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {messages.length > 0 && messages.length < conversation.length && conversation[messages.length]?.from === "agent" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white/[0.04] ring-1 ring-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              {[0, 1, 2].map((d) => (
                <motion.span
                  key={d}
                  className="w-1.5 h-1.5 rounded-full bg-white/30"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
