"use client";

import { cn } from "@/lib/utils";
import { FadeUp } from "@/components/motion";
import { GradientMesh, IntegrationLogos } from "@/components/illustrations";
import { BookingCalendar } from "@/components/booking-calendar";
import { motion } from "framer-motion";
import { SubShell } from "@/components/dcp/sub-shell";

export default function BookAuditPage() {
  return (
    <SubShell active="book-audit">
      <main className="pt-28 pb-28 px-6 relative overflow-hidden">
        <GradientMesh />

        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-start">
            {/* Left — info */}
            <div className="lg:col-span-2 lg:sticky lg:top-28">
              <FadeUp>
                <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Free AI audit
                </span>

                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter leading-[0.95] mt-4 text-white">
                  See what you
                  <br />
                  <span className="text-emerald-400">
                    can automate
                  </span>
                </h1>

                <p className="mt-4 text-sm text-white/40 leading-relaxed max-w-[44ch]">
                  30 minutes. We map what you can automate, estimate the ROI, and give
                  you a written roadmap. No cost, no commitment.
                </p>

                {/* Steps */}
                <div className="mt-10 space-y-4">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">What to expect</p>
                  {[
                    { time: "0-10", unit: "min", title: "Understand your operations", desc: "We ask about your current workflows, team, and pain points.", color: "text-emerald-400", border: "border-emerald-500/20" },
                    { time: "10-20", unit: "min", title: "Identify automation opportunities", desc: "We pinpoint which tasks our AI agents can handle.", color: "text-sky-400", border: "border-sky-500/20" },
                    { time: "20-30", unit: "min", title: "Live agent demo", desc: "We show you a working agent relevant to your business.", color: "text-violet-400", border: "border-violet-500/20" },
                    { time: "24h", unit: "", title: "Written AI roadmap delivered", desc: "A detailed plan you can use, even if you choose another path.", color: "text-amber-400", border: "border-amber-500/20" },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      className={cn(
                        "flex gap-4 p-4 rounded-2xl border bg-white/[0.03] transition-all duration-500",
                        item.border,
                        "hover:bg-white/[0.06]"
                      )}
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-xl bg-white/[0.03] border flex items-center justify-center text-xs font-bold font-mono",
                        item.border, item.color
                      )}>
                        {item.time}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{item.title}</h3>
                        <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Trust signals */}
                <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-wrap gap-5 text-xs text-white/40">
                  {["100% free", "30 minutes", "No commitment"].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {t}
                    </span>
                  ))}
                </div>

                {/* Social proof */}
                <div className="mt-8 p-5 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Overlapping avatars */}
                    <div className="flex -space-x-2">
                      {["AH", "SK", "MR", "FJ"].map((initials, i) => (
                        <div key={initials} className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-surface-950",
                          i === 0 ? "bg-emerald-500/10 text-emerald-400" :
                          i === 1 ? "bg-sky-500/10 text-sky-400" :
                          i === 2 ? "bg-violet-500/10 text-violet-400" :
                          "bg-amber-500/10 text-amber-400"
                        )}>
                          {initials}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map((star) => (
                        <svg key={star} className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">
                    <span className="text-white font-semibold">&ldquo;The audit alone was worth it.</span> Even before
                    we signed up, the roadmap helped us understand exactly what to automate.&rdquo;
                  </p>
                  <p className="text-[10px] text-white/40 mt-2">— Agency owner, Dubai Marina</p>
                </div>
              </FadeUp>
            </div>

            {/* Right — Booking calendar */}
            <FadeUp delay={0.2} className="lg:col-span-3">
              <BookingCalendar />

              {/* Quick stats */}
              <div className="mt-6 flex gap-8 justify-center">
                {[
                  { value: "50+", label: "audits completed" },
                  { value: "<24h", label: "roadmap delivered" },
                  { value: "100%", label: "actionable insights" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-lg font-extrabold tracking-tighter font-mono text-white">{s.value}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Integrations we connect to */}
              <div className="mt-8">
                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/40 mb-4 px-1">We integrate with</p>
                <IntegrationLogos />
              </div>
            </FadeUp>
          </div>
        </div>
      </main>
    </SubShell>
  );
}
