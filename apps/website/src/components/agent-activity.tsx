"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const events = [
  { icon: "search", label: "Customer identified", detail: "Sara Al Maktoum — returning guest", color: "text-sky-400", delay: 200 },
  { icon: "brain", label: "Memory recalled", detail: "Nut allergy, outdoor terrace, party of 4", color: "text-violet-400", delay: 1200 },
  { icon: "db", label: "Database queried", detail: "8 previous visits, VIP status confirmed", color: "text-amber-400", delay: 2000 },
  { icon: "calendar", label: "SevenRooms queried", detail: "Terrace table T-12 available at 8 PM", color: "text-emerald-400", delay: 3000 },
  { icon: "bot", label: "Response generated", detail: "Personalized greeting with allergy note", color: "text-sky-400", delay: 3800 },
  { icon: "check", label: "Booking confirmed", detail: "Table T-12, 4 guests, 8 PM tonight", color: "text-emerald-400", delay: 5400 },
  { icon: "alert", label: "Kitchen flagged", detail: "Nut allergy alert sent to chef", color: "text-rose-400", delay: 5800 },
  { icon: "send", label: "Owner notified", detail: "VIP Sara is dining tonight — WhatsApp sent", color: "text-amber-400", delay: 6200 },
  { icon: "table", label: "SevenRooms updated", detail: "Table T-12 booked, allergy tagged", color: "text-emerald-400", delay: 6800 },
  { icon: "memory", label: "Memory updated", detail: "Visit #9 logged, preference confirmed", color: "text-violet-400", delay: 7200 },
];

const icons: Record<string, React.ReactNode> = {
  search: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  brain: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
  db: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>,
  calendar: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  bot: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  check: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  alert: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  send: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>,
  table: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
  memory: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" /></svg>,
};

const spring = { type: "spring" as const, stiffness: 120, damping: 18 };

export function AgentActivity() {
  const [visible, setVisible] = useState<typeof events>([]);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    setVisible([]);
    const timers: NodeJS.Timeout[] = [];

    events.forEach((evt) => {
      const timer = setTimeout(() => {
        setVisible((prev) => [...prev, evt]);
      }, evt.delay);
      timers.push(timer);
    });

    const resetTimer = setTimeout(() => {
      setCycle((c) => c + 1);
    }, 8000);
    timers.push(resetTimer);

    return () => timers.forEach(clearTimeout);
  }, [cycle]);

  return (
    <div className="w-full max-w-[280px] space-y-0 overflow-hidden max-h-[480px]">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <p className="text-[10px] text-white/30 uppercase tracking-[0.15em] font-semibold">Agent pipeline — live</p>
      </div>

      <AnimatePresence mode="popLayout">
        {visible.map((evt, i) => (
          <motion.div
            key={`${cycle}-${i}`}
            initial={{ opacity: 0, x: -20, height: 0 }}
            animate={{ opacity: 1, x: 0, height: "auto" }}
            exit={{ opacity: 0, x: -10 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.03]">
              <div className={`w-6 h-6 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0 mt-0.5 ${evt.color}`}>
                {icons[evt.icon]}
              </div>
              <div className="min-w-0">
                <p className={`text-[11px] font-semibold ${evt.color}`}>{evt.label}</p>
                <p className="text-[10px] text-white/30 leading-snug mt-0.5 truncate">{evt.detail}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
