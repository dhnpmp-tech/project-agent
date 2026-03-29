"use client";

import { motion, useInView, type Variants } from "framer-motion";
import { useRef, type ReactNode } from "react";

const spring = { type: "spring" as const, stiffness: 100, damping: 20, mass: 0.8 };
const smooth = { duration: 0.8, ease: [0.32, 0.72, 0, 1] as const };

/* ── Fade-up on scroll ─────────────────────────────────────── */
export function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ ...smooth, delay }}
      className={className}
      style={{ opacity: 1 }}
    >
      {children}
    </motion.div>
  );
}

/* ── Stagger children ──────────────────────────────────────── */
const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 1, y: 0, filter: "blur(0px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: smooth },
};

export function StaggerList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      variants={staggerContainer}
      initial="show"
      animate={inView ? "show" : "show"}
      className={className}
      style={{ opacity: 1 }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItem} className={className} style={{ opacity: 1 }}>
      {children}
    </motion.div>
  );
}

/* ── Scale-in on scroll ────────────────────────────────────── */
export function ScaleIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 1, scale: 1 }}
      animate={inView ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
      transition={{ ...spring, delay }}
      className={className}
      style={{ opacity: 1 }}
    >
      {children}
    </motion.div>
  );
}

/* ── Animated counter ──────────────────────────────────────── */
export function Counter({
  value,
  suffix = "",
  prefix = "",
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {prefix}{value}{suffix}
    </span>
  );
}

/* ── Glow card hover effect ────────────────────────────────── */
export function GlowCard({
  children,
  className,
  glowColor = "rgba(34, 197, 94, 0.15)",
}: {
  children: ReactNode;
  className?: string;
  glowColor?: string;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{
        boxShadow: `0 0 60px 10px ${glowColor}, 0 20px 40px -15px rgba(0,0,0,0.3)`,
        y: -4,
      }}
      transition={spring}
      style={{ opacity: 1 }}
    >
      {children}
    </motion.div>
  );
}

/* ── Floating animation ────────────────────────────────────── */
export function Float({
  children,
  className,
  duration = 6,
  distance = 12,
}: {
  children: ReactNode;
  className?: string;
  duration?: number;
  distance?: number;
}) {
  return (
    <motion.div
      className={className}
      animate={{ y: [-distance / 2, distance / 2, -distance / 2] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}
