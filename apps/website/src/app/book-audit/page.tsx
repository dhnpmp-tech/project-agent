"use client";

import { cn } from "@/lib/utils";
import { FadeUp, StaggerList, StaggerItem, ScaleIn, Float } from "@/components/motion";
import { GradientMesh, IntegrationLogos } from "@/components/illustrations";
import { BookingCalendar } from "@/components/booking-calendar";
import { motion } from "framer-motion";

export default function BookAuditPage() {
  return (
    <div className="min-h-[100dvh] bg-surface-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-4 pt-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between bg-surface-950/70 backdrop-blur-2xl rounded-full px-6 py-3 ring-1 ring-white/[0.08] shadow-[0_2px_24px_rgba(0,0,0,0.3)]">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2L2 5.5l6 3.5 6-3.5L8 2zM2 10.5l6 3.5 6-3.5M2 8l6 3.5 6-3.5" />
              </svg>
            </div>
            <span className="text-sm font-bold text-white tracking-tight">AI Agent Systems</span>
          </a>
          <div className="hidden md:flex items-center gap-7 text-[13px] font-medium text-white/50">
            <a href="/services/" className="hover:text-white transition-colors duration-300">Services</a>
            <a href="/process/" className="hover:text-white transition-colors duration-300">Process</a>
            <a href="/case-study/" className="hover:text-white transition-colors duration-300">Case study</a>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-28 px-6 relative overflow-hidden">
        <GradientMesh />

        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-start">
            {/* Left — info */}
            <div className="lg:col-span-2 lg:sticky lg:top-28">
              <FadeUp>
                <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                  Free AI audit
                </span>

                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter leading-[0.95] mt-4">
                  See what you
                  <br />
                  <span className="bg-gradient-to-r from-brand-400 via-emerald-300 to-brand-500 bg-clip-text text-transparent">
                    can automate
                  </span>
                </h1>

                <p className="mt-4 text-sm text-white/50 leading-relaxed max-w-[44ch]">
                  30 minutes. We map what you can automate, estimate the ROI, and give
                  you a written roadmap. No cost, no commitment.
                </p>

                {/* Steps */}
                <div className="mt-10 space-y-4">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">What to expect</p>
                  {[
                    { time: "0-10", unit: "min", title: "Understand your operations", desc: "We ask about your current workflows, team, and pain points.", color: "text-brand-400", border: "border-brand-500/20" },
                    { time: "10-20", unit: "min", title: "Identify automation opportunities", desc: "We pinpoint which tasks our AI agents can handle.", color: "text-sky-400", border: "border-sky-500/20" },
                    { time: "20-30", unit: "min", title: "Live agent demo", desc: "We show you a working agent relevant to your business.", color: "text-violet-400", border: "border-violet-500/20" },
                    { time: "24h", unit: "", title: "Written AI roadmap delivered", desc: "A detailed plan you can use, even if you choose another path.", color: "text-amber-400", border: "border-amber-500/20" },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      className={cn(
                        "flex gap-4 p-4 rounded-2xl border bg-white/[0.02] transition-all duration-500",
                        item.border,
                        "hover:bg-white/[0.04]"
                      )}
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-xl bg-surface-950 border flex items-center justify-center text-xs font-bold font-mono",
                        item.border, item.color
                      )}>
                        {item.time}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">{item.title}</h3>
                        <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Trust signals */}
                <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-wrap gap-5 text-xs text-white/40">
                  {["100% free", "30 minutes", "No commitment"].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
                          i === 0 ? "bg-brand-500/30 text-brand-300" :
                          i === 1 ? "bg-sky-500/30 text-sky-300" :
                          i === 2 ? "bg-violet-500/30 text-violet-300" :
                          "bg-amber-500/30 text-amber-300"
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
                  <p className="text-xs text-white/50 leading-relaxed">
                    <span className="text-white/80 font-semibold">&ldquo;The audit alone was worth it.</span> Even before
                    we signed up, the roadmap helped us understand exactly what to automate.&rdquo;
                  </p>
                  <p className="text-[10px] text-white/25 mt-2">— Agency owner, Dubai Marina</p>
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
                    <p className="text-lg font-extrabold tracking-tighter font-mono bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">{s.value}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Integrations we connect to */}
              <div className="mt-8">
                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/20 mb-4 px-1">We integrate with</p>
                <IntegrationLogos />
              </div>
            </FadeUp>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-12">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2L2 5.5l6 3.5 6-3.5L8 2zM2 10.5l6 3.5 6-3.5M2 8l6 3.5 6-3.5" />
              </svg>
            </div>
            <span className="text-xs font-semibold">AI Agent Systems</span>
          </div>
          <div className="flex items-center gap-8 text-xs text-white/30 font-medium">
            <a href="/services/" className="hover:text-white/60 transition-colors duration-300">Services</a>
            <a href="/process/" className="hover:text-white/60 transition-colors duration-300">Process</a>
            <a href="/case-study/" className="hover:text-white/60 transition-colors duration-300">Case study</a>
            <a href="/book-audit/" className="text-white/60">Book audit</a>
          </div>
          <p className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} AI Agent Systems. Dubai, UAE.
          </p>
        </div>
      </footer>
    </div>
  );
}
