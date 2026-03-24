"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// --- Types ---

type BookingStep = "date" | "time" | "details" | "confirmed";

interface GuestDetails {
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
}

// --- Constants ---

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Simulated time slots (will connect to calendar adapter API)
const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "14:00", "14:30", "15:00", "15:30", "16:00",
  "16:30", "17:00", "17:30",
];

const smooth = { duration: 0.4, ease: [0.32, 0.72, 0, 1] as const };

// --- Component ---

export function BookingCalendar() {
  const [step, setStep] = useState<BookingStep>("date");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [details, setDetails] = useState<GuestDetails>({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [submitting, setSubmitting] = useState(false);

  // Calendar grid computation
  const calendarDays = useMemo(() => {
    const { year, month } = viewMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: Array<{
      date: number;
      current: boolean;
      past: boolean;
      isToday: boolean;
      weekend: boolean;
    }> = [];

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: 0, current: false, past: true, isToday: false, weekend: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay();
      days.push({
        date: d,
        current: true,
        past: date < today,
        isToday: date.getTime() === today.getTime(),
        weekend: dayOfWeek === 5 || dayOfWeek === 6, // Friday & Saturday (UAE weekend)
      });
    }

    return days;
  }, [viewMonth]);

  function navigateMonth(dir: -1 | 1) {
    setViewMonth((prev) => {
      let m = prev.month + dir;
      let y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
  }

  function handleDateSelect(day: number) {
    const date = new Date(viewMonth.year, viewMonth.month, day);
    setSelectedDate(date);
    setStep("time");
  }

  function handleTimeSelect(time: string) {
    setSelectedTime(time);
    setStep("details");
  }

  async function handleSubmit() {
    setSubmitting(true);
    // Simulate API call — will connect to calendar adapter
    await new Promise((r) => setTimeout(r, 1500));
    setSubmitting(false);
    setStep("confirmed");
  }

  function handleReset() {
    setStep("date");
    setSelectedDate(null);
    setSelectedTime(null);
    setDetails({ name: "", email: "", phone: "", company: "", notes: "" });
  }

  const canNavigateBack =
    viewMonth.year > new Date().getFullYear() ||
    (viewMonth.year === new Date().getFullYear() &&
      viewMonth.month > new Date().getMonth());

  const formattedDate = selectedDate
    ? `${DAYS[selectedDate.getDay()]}, ${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]}`
    : "";

  return (
    <div className="relative rounded-3xl overflow-hidden bg-white/[0.03] ring-1 ring-white/[0.06]">
      {/* Header breadcrumb */}
      <div className="flex items-center gap-2 px-8 pt-6 pb-0 text-xs text-white/30">
        <button
          onClick={() => step !== "confirmed" && setStep("date")}
          className={cn(
            "transition-colors",
            step === "date" ? "text-brand-400 font-semibold" : "hover:text-white/50"
          )}
        >
          Date
        </button>
        <ChevronRight />
        <button
          onClick={() => selectedDate && step !== "confirmed" && setStep("time")}
          className={cn(
            "transition-colors",
            step === "time" ? "text-brand-400 font-semibold" : "hover:text-white/50",
            !selectedDate && "opacity-30 pointer-events-none"
          )}
        >
          Time
        </button>
        <ChevronRight />
        <button
          onClick={() => selectedTime && step !== "confirmed" && setStep("details")}
          className={cn(
            "transition-colors",
            step === "details" ? "text-brand-400 font-semibold" : "hover:text-white/50",
            !selectedTime && "opacity-30 pointer-events-none"
          )}
        >
          Details
        </button>
        <ChevronRight />
        <span
          className={cn(
            step === "confirmed" ? "text-brand-400 font-semibold" : "opacity-30"
          )}
        >
          Confirmed
        </span>
      </div>

      <div className="p-8 min-h-[520px]">
        <AnimatePresence mode="wait">
          {/* ── STEP 1: Date ──────────────────────────────── */}
          {step === "date" && (
            <motion.div
              key="date"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={smooth}
            >
              <h3 className="text-lg font-extrabold tracking-tight mb-1">
                Pick a date
              </h3>
              <p className="text-sm text-white/40 mb-6">
                Choose a day for your free 30-minute AI audit call.
              </p>

              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigateMonth(-1)}
                  disabled={!canNavigateBack}
                  className="w-8 h-8 rounded-xl bg-white/[0.05] ring-1 ring-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-20 disabled:pointer-events-none"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h4 className="text-sm font-bold tracking-tight">
                  {MONTHS[viewMonth.month]} {viewMonth.year}
                </h4>
                <button
                  onClick={() => navigateMonth(1)}
                  className="w-8 h-8 rounded-xl bg-white/[0.05] ring-1 ring-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>

              {/* Day labels */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map((d) => (
                  <div
                    key={d}
                    className="text-center text-[10px] font-semibold text-white/20 uppercase tracking-wider py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  if (!day.current) {
                    return <div key={`empty-${i}`} className="aspect-square" />;
                  }

                  const disabled = day.past || day.weekend;
                  const isSelected =
                    selectedDate?.getDate() === day.date &&
                    selectedDate?.getMonth() === viewMonth.month &&
                    selectedDate?.getFullYear() === viewMonth.year;

                  return (
                    <motion.button
                      key={`day-${day.date}`}
                      onClick={() => !disabled && handleDateSelect(day.date)}
                      disabled={disabled}
                      className={cn(
                        "aspect-square rounded-xl text-sm font-semibold transition-all duration-300 relative",
                        disabled
                          ? "text-white/10 cursor-not-allowed"
                          : "text-white/70 hover:text-white hover:bg-white/[0.08] cursor-pointer",
                        day.isToday && !isSelected && "ring-1 ring-brand-500/40 text-brand-400",
                        isSelected &&
                          "bg-brand-500 text-white ring-0 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                      )}
                      whileHover={!disabled ? { scale: 1.08 } : undefined}
                      whileTap={!disabled ? { scale: 0.95 } : undefined}
                    >
                      {day.date}
                      {day.isToday && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-400" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <p className="text-[10px] text-white/15 mt-4 text-center">
                UAE timezone (GST, UTC+4) — Fri & Sat are weekends
              </p>
            </motion.div>
          )}

          {/* ── STEP 2: Time ──────────────────────────────── */}
          {step === "time" && (
            <motion.div
              key="time"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={smooth}
            >
              <button
                onClick={() => setStep("date")}
                className="text-xs text-white/30 hover:text-white/60 mb-4 flex items-center gap-1 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Change date
              </button>

              <h3 className="text-lg font-extrabold tracking-tight mb-1">
                Choose a time
              </h3>
              <p className="text-sm text-white/40 mb-1">
                {formattedDate}
              </p>
              <p className="text-xs text-white/20 mb-6">
                30-minute slots — Dubai time (GST)
              </p>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {TIME_SLOTS.map((time) => {
                  const isSelected = selectedTime === time;
                  const hour = parseInt(time.split(":")[0]);
                  const isPM = hour >= 12;

                  return (
                    <motion.button
                      key={time}
                      onClick={() => handleTimeSelect(time)}
                      className={cn(
                        "relative rounded-xl px-3 py-3 text-sm font-mono font-semibold transition-all duration-300",
                        "ring-1",
                        isSelected
                          ? "bg-brand-500 text-white ring-brand-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                          : "bg-white/[0.03] text-white/60 ring-white/[0.08] hover:bg-white/[0.06] hover:text-white hover:ring-white/[0.15]"
                      )}
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {time}
                      <span className={cn(
                        "ml-1 text-[10px] font-sans",
                        isSelected ? "text-white/70" : "text-white/25"
                      )}>
                        {isPM ? "PM" : "AM"}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Details ───────────────────────────── */}
          {step === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={smooth}
            >
              <button
                onClick={() => setStep("time")}
                className="text-xs text-white/30 hover:text-white/60 mb-4 flex items-center gap-1 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Change time
              </button>

              <h3 className="text-lg font-extrabold tracking-tight mb-1">
                Your details
              </h3>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-sm text-white/40">{formattedDate}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-sm font-mono text-brand-400">{selectedTime} GST</span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    label="Full name"
                    value={details.name}
                    onChange={(v) => setDetails((d) => ({ ...d, name: v }))}
                    placeholder="Ahmed Al Maktoum"
                    required
                  />
                  <InputField
                    label="Email"
                    type="email"
                    value={details.email}
                    onChange={(v) => setDetails((d) => ({ ...d, email: v }))}
                    placeholder="ahmed@company.ae"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    label="Phone (WhatsApp)"
                    value={details.phone}
                    onChange={(v) => setDetails((d) => ({ ...d, phone: v }))}
                    placeholder="+971 50 123 4567"
                  />
                  <InputField
                    label="Company"
                    value={details.company}
                    onChange={(v) => setDetails((d) => ({ ...d, company: v }))}
                    placeholder="Your business name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-2">
                    What do you want to automate? <span className="text-white/15">(optional)</span>
                  </label>
                  <textarea
                    value={details.notes}
                    onChange={(e) => setDetails((d) => ({ ...d, notes: e.target.value }))}
                    rows={3}
                    placeholder="e.g. Lead qualification on WhatsApp, appointment booking, content scheduling..."
                    className="w-full rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-white/15 focus:outline-none focus:ring-brand-500/50 transition-all resize-none"
                  />
                </div>

                <motion.button
                  onClick={handleSubmit}
                  disabled={!details.name || !details.email || submitting}
                  className={cn(
                    "w-full rounded-xl py-4 text-sm font-bold transition-all duration-500",
                    "bg-brand-500 text-white hover:bg-brand-400",
                    "disabled:opacity-30 disabled:pointer-events-none",
                    "shadow-[0_0_30px_rgba(34,197,94,0.25)]",
                    "hover:shadow-[0_0_50px_rgba(34,197,94,0.4)]"
                  )}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                      Booking...
                    </span>
                  ) : (
                    "Confirm Booking"
                  )}
                </motion.button>

                <p className="text-[10px] text-white/15 text-center">
                  You will receive a calendar invite and WhatsApp confirmation.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: Confirmed ─────────────────────────── */}
          {step === "confirmed" && (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={smooth}
              className="flex flex-col items-center justify-center text-center py-8"
            >
              {/* Animated checkmark */}
              <motion.div
                className="relative mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              >
                <div className="absolute inset-0 bg-brand-500/20 rounded-full blur-2xl scale-150" />
                <div className="relative w-20 h-20 rounded-full bg-brand-500/20 ring-1 ring-brand-500/30 flex items-center justify-center">
                  <motion.svg
                    className="w-10 h-10 text-brand-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <motion.path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                    />
                  </motion.svg>
                </div>
              </motion.div>

              <motion.h3
                className="text-xl font-extrabold tracking-tight mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                You&apos;re booked!
              </motion.h3>

              <motion.div
                className="space-y-2 mb-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-sm text-white/50">
                  {formattedDate} at{" "}
                  <span className="font-mono text-brand-400">{selectedTime}</span>{" "}
                  GST
                </p>
                <p className="text-xs text-white/30">
                  Calendar invite sent to{" "}
                  <span className="text-white/50">{details.email}</span>
                </p>
              </motion.div>

              {/* Summary card */}
              <motion.div
                className="w-full max-w-sm bg-white/[0.04] rounded-2xl ring-1 ring-white/[0.08] p-5 text-left space-y-3 mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center">
                    <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/80">{details.name}</p>
                    <p className="text-xs text-white/30">{details.company || details.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center">
                    <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/80">Video call</p>
                    <p className="text-xs text-white/30">Link in your calendar invite</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="flex flex-col items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <p className="text-xs text-white/25">
                  Need to reschedule? Check your email for the calendar link.
                </p>
                <button
                  onClick={handleReset}
                  className="text-xs text-brand-400/60 hover:text-brand-400 transition-colors"
                >
                  Book another slot
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Input field ---

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-2">
        {label}
        {required && <span className="text-brand-400/50 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-white/15 focus:outline-none focus:ring-brand-500/50 transition-all"
      />
    </div>
  );
}

// --- Icons ---

function ChevronRight() {
  return (
    <svg className="w-3 h-3 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
