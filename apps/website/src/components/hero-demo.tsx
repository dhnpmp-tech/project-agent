"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

/* ── Timeline: each step is either a chat message or a backend event ── */
type Step =
  | { type: "chat"; from: "customer" | "agent"; text: string }
  | { type: "event"; icon: string; label: string; detail: string; color: string };

const story: { at: number; step: Step }[] = [
  // Customer opens
  { at: 600, step: { type: "chat", from: "customer", text: "Hey, can I book a table for 4 tonight?" } },

  // Backend fires
  { at: 2200, step: { type: "event", icon: "zap", label: "New conversation", detail: "Inbound WhatsApp message", color: "text-emerald-400" } },
  { at: 3400, step: { type: "event", icon: "search", label: "Customer identified", detail: "Layla Khoury — returning guest", color: "text-sky-400" } },
  { at: 5000, step: { type: "event", icon: "brain", label: "Memory recalled", detail: "Nut allergy, outdoor terrace, party of 4", color: "text-violet-400" } },
  { at: 6800, step: { type: "event", icon: "db", label: "8 previous visits", detail: "VIP status confirmed", color: "text-amber-400" } },
  { at: 8600, step: { type: "event", icon: "calendar", label: "SevenRooms queried", detail: "Terrace table T-12 free at 8 PM", color: "text-emerald-400" } },

  // AI responds
  { at: 10500, step: { type: "chat", from: "agent", text: "Hey Layla! Of course. Your usual outdoor terrace? I still have your nut allergy on file. 8 PM work?" } },

  // Customer confirms
  { at: 14000, step: { type: "chat", from: "customer", text: "Yes 8 is great, thanks!" } },

  // Backend wraps up
  { at: 15500, step: { type: "event", icon: "check", label: "Booking confirmed", detail: "Table T-12 — 4 guests, 8 PM", color: "text-emerald-400" } },
  { at: 17000, step: { type: "event", icon: "alert", label: "Kitchen flagged", detail: "Nut allergy alert → chef notified", color: "text-rose-400" } },
  { at: 18500, step: { type: "event", icon: "send", label: "GM notified", detail: "\"VIP Layla dining tonight\" → WhatsApp", color: "text-amber-400" } },

  // AI final
  { at: 20000, step: { type: "chat", from: "agent", text: "All set! Table for 4, terrace, 8 PM. Kitchen knows about the nut allergy. See you tonight!" } },

  { at: 22000, step: { type: "event", icon: "memory", label: "Memory updated", detail: "Visit #9 saved, preferences confirmed", color: "text-violet-400" } },
];

const CYCLE = 26000;

const iconMap: Record<string, React.ReactNode> = {
  zap: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
  search: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  brain: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
  db: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" /></svg>,
  calendar: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  check: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  alert: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  send: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>,
  memory: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" /></svg>,
};

const spring = { type: "spring" as const, stiffness: 100, damping: 18 };

export function HeroDemo() {
  const [visible, setVisible] = useState<{ at: number; step: Step }[]>([]);
  const [cycle, setCycle] = useState(0);
  const [showTyping, setShowTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new items appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [visible, showTyping]);

  useEffect(() => {
    setVisible([]);
    setShowTyping(false);
    const timers: NodeJS.Timeout[] = [];

    story.forEach((item) => {
      const timer = setTimeout(() => {
        setShowTyping(false);
        setVisible((prev) => [...prev, item]);
      }, item.at);
      timers.push(timer);

      // Show typing before agent messages
      if (item.step.type === "chat" && item.step.from === "agent") {
        const typingTimer = setTimeout(() => setShowTyping(true), item.at - 1200);
        timers.push(typingTimer);
      }
    });

    const resetTimer = setTimeout(() => setCycle((c) => c + 1), CYCLE);
    timers.push(resetTimer);
    return () => timers.forEach(clearTimeout);
  }, [cycle]);

  return (
    <div className="w-full max-w-[520px]">
      {/* WhatsApp header */}
      <div className="flex items-center gap-3 px-5 py-3 rounded-t-2xl bg-emerald-600/10 ring-1 ring-white/[0.06] ring-b-0">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white">Saffron Kitchen</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] text-white/40">AI Agent online</p>
          </div>
        </div>
      </div>

      {/* Unified vertical flow — fixed height, scrolls internally */}
      <div ref={scrollRef} className="rounded-b-2xl bg-zinc-900/80 ring-1 ring-white/[0.06] ring-t-0 px-4 py-5 h-[480px] overflow-y-auto relative scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {/* Vertical connecting line */}
        <div className="absolute left-7 top-5 bottom-5 w-px bg-gradient-to-b from-white/[0.06] via-white/[0.04] to-transparent" />

        <div className="space-y-3 relative">
          <AnimatePresence mode="popLayout">
            {visible.map((item, i) => (
              <motion.div
                key={`${cycle}-${i}`}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={spring}
              >
                {item.step.type === "chat" ? (
                  /* ── Chat bubble ── */
                  <div className={`flex ${item.step.from === "customer" ? "justify-end" : "justify-start"} pl-6`}>
                    <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-[13px] leading-[1.6] ${
                      item.step.from === "customer"
                        ? "bg-emerald-600/20 text-emerald-100 rounded-br-sm"
                        : "bg-white/[0.05] text-white/70 ring-1 ring-white/[0.06] rounded-bl-sm"
                    }`}>
                      {item.step.text}
                    </div>
                  </div>
                ) : (
                  /* ── Pipeline event ── */
                  <div className="flex items-start gap-2.5 pl-1">
                    {/* Dot on the line */}
                    <div className={`w-5 h-5 rounded-md bg-white/[0.04] ring-1 ring-white/[0.08] flex items-center justify-center flex-shrink-0 ${item.step.color}`}>
                      {iconMap[item.step.icon]}
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className={`text-[11px] font-bold leading-none ${item.step.color}`}>{item.step.label}</p>
                      <p className="text-[10px] text-white/25 mt-1 leading-snug">{item.step.detail}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Typing indicator */}
            {showTyping && (
              <motion.div
                key={`typing-${cycle}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-start pl-6"
              >
                <div className="bg-white/[0.05] ring-1 ring-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
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
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
