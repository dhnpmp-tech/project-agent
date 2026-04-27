"use client";

// DCP Design Kit — motion primitives.
// Ported from /tmp/dcp-design/assets/dcp-kit.jsx (MOTION PRIMITIVES section).

import { useEffect, useRef, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { reducedMotion, useReveal } from "./lib";

/* Reveal — fades in on scroll (uses useReveal hook) */
type RevealProps<T extends ElementType = "div"> = {
  delay?: number;
  as?: T;
  children?: ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "children">;

export function Reveal<T extends ElementType = "div">({
  delay = 0,
  as,
  children,
  ...rest
}: RevealProps<T>) {
  const ref = useReveal<HTMLElement>(delay);
  const Tag = (as || "div") as ElementType;
  // Spread rest props through; ref typing is loose by design here.
  return (
    <Tag ref={ref as React.Ref<HTMLElement>} {...rest}>
      {children}
    </Tag>
  );
}

/* MagneticButton — wraps a button-like element so it follows the cursor on hover */
interface MagneticButtonProps extends HTMLAttributes<HTMLSpanElement> {
  strength?: number;
  className?: string;
  children?: ReactNode;
}

export function MagneticButton({
  children,
  strength = 0.22,
  className = "",
  ...rest
}: MagneticButtonProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  function onMove(e: React.MouseEvent<HTMLSpanElement>) {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
  }
  function onLeave() {
    const el = ref.current;
    if (el) el.style.transform = "";
  }
  return (
    <span
      className={"magnet " + className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      ref={ref}
      {...rest}
    >
      {children}
    </span>
  );
}

/* HeroMap — animated Saudi GPU mesh, Riyadh-central */
interface MapNode {
  id: string;
  x: number;
  y: number;
  r: number;
  label: string;
  primary?: boolean;
}

export function HeroMap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    function resize() {
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
    }
    resize();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const nodes: MapNode[] = [
      { id: "ruh", x: 0.52, y: 0.54, r: 5.4, label: "RUH", primary: true },
      { id: "jed", x: 0.26, y: 0.62, r: 3.8, label: "JED" },
      { id: "dmm", x: 0.74, y: 0.42, r: 3.4, label: "DMM" },
      { id: "med", x: 0.34, y: 0.48, r: 2.6, label: "MED" },
      { id: "tuu", x: 0.22, y: 0.28, r: 2.4, label: "TUU" },
      { id: "neo", x: 0.12, y: 0.2, r: 2.8, label: "NEOM" },
      { id: "auh", x: 0.38, y: 0.82, r: 2.4, label: "AHB" },
      { id: "hgr", x: 0.82, y: 0.6, r: 2.0, label: "HGR" },
      { id: "yun", x: 0.3, y: 0.38, r: 2.0, label: "YNB" },
      { id: "qsm", x: 0.47, y: 0.38, r: 2.2, label: "QSM" },
    ];
    const edges: [string, string][] = [];
    for (const n of nodes) if (n.id !== "ruh") edges.push(["ruh", n.id]);
    edges.push(["jed", "med"], ["jed", "yun"], ["dmm", "hgr"], ["tuu", "neo"], ["qsm", "ruh"]);
    interface Arc {
      from: MapNode;
      to: MapNode;
      t: number;
      life: number;
      hue: "teal" | "orange";
    }
    const arcs: Arc[] = [];
    function spawn() {
      const to = nodes[1 + Math.floor(Math.random() * (nodes.length - 1))];
      arcs.push({
        from: nodes[0],
        to,
        t: 0,
        life: 1600 + Math.random() * 800,
        hue: Math.random() < 0.55 ? "teal" : "orange",
      });
      if (arcs.length > 8) arcs.shift();
    }
    let lastSpawn = 0;
    let t0 = performance.now();
    let raf = 0;
    const nx = (n: MapNode) => n.x * w;
    const ny = (n: MapNode) => n.y * h;
    function frame(t: number) {
      if (!ctx) return;
      const dt = t - t0;
      t0 = t;
      if (t - lastSpawn > 900) {
        spawn();
        lastSpawn = t;
      }
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(120,160,180,0.10)";
      for (const [a, b] of edges) {
        const na = nodes.find((n) => n.id === a);
        const nb = nodes.find((n) => n.id === b);
        if (!na || !nb) continue;
        ctx.beginPath();
        ctx.moveTo(nx(na), ny(na));
        ctx.lineTo(nx(nb), ny(nb));
        ctx.stroke();
      }
      for (const n of nodes) {
        const x = nx(n);
        const y = ny(n);
        ctx.fillStyle = n.primary ? "rgba(45,212,182,0.16)" : "rgba(200,200,220,0.08)";
        ctx.beginPath();
        ctx.arc(x, y, n.r * 3.2, 0, Math.PI * 2);
        ctx.fill();
        if (n.primary) {
          const p = (t / 1800) % 1;
          ctx.strokeStyle = `rgba(45,212,182,${(1 - p) * 0.35})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, n.r + p * 22, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = n.primary ? "#2dd4b6" : "#e8e3d6";
        ctx.beginPath();
        ctx.arc(x, y, n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(200,200,220,0.55)";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillText(n.label, x + n.r + 6, y + 3);
      }
      for (let i = arcs.length - 1; i >= 0; i--) {
        const a = arcs[i];
        a.t += dt;
        const p = a.t / a.life;
        if (p >= 1) {
          arcs.splice(i, 1);
          continue;
        }
        const x1 = nx(a.from);
        const y1 = ny(a.from);
        const x2 = nx(a.to);
        const y2 = ny(a.to);
        const cx = (x1 + x2) / 2;
        const cy = Math.min(y1, y2) - Math.hypot(x2 - x1, y2 - y1) * 0.22;
        ctx.strokeStyle =
          a.hue === "teal"
            ? `rgba(45,212,182,${0.18 * (1 - Math.abs(p - 0.5) * 2)})`
            : `rgba(238,122,60,${0.18 * (1 - Math.abs(p - 0.5) * 2)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cx, cy, x2, y2);
        ctx.stroke();
        const it = 1 - p;
        const tx = it * it * x1 + 2 * it * p * cx + p * p * x2;
        const ty = it * it * y1 + 2 * it * p * cy + p * p * y2;
        const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, 12);
        const col = a.hue === "teal" ? "45,212,182" : "238,122,60";
        g.addColorStop(0, `rgba(${col},0.95)`);
        g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(tx, ty, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = a.hue === "teal" ? "#2dd4b6" : "#ee7a3c";
        ctx.beginPath();
        ctx.arc(tx, ty, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    if (!reducedMotion) {
      raf = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        const x = nx(n);
        const y = ny(n);
        ctx.fillStyle = n.primary ? "#2dd4b6" : "#e8e3d6";
        ctx.beginPath();
        ctx.arc(x, y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const onResize = () => {
      resize();
      ctx.scale(dpr, dpr);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return <canvas ref={canvasRef} className="hero-map-canvas" aria-hidden="true" />;
}

/* Sparkline — single-pass canvas line chart */
interface SparklineProps {
  values: number[];
  color?: string;
  height?: number;
}

export function Sparkline({ values, color = "var(--teal)", height = 28 }: SparklineProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = r.width * dpr;
    el.height = height * dpr;
    el.style.height = height + "px";
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const w = r.width;
    const h = height;
    if (!values || !values.length) return;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(0.0001, max - min);
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1.4;
    const stroke =
      getComputedStyle(document.documentElement).getPropertyValue("--teal") || "#2dd4b6";
    ctx.strokeStyle = color === "var(--teal)" ? stroke.trim() : color;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - 2 - ((v - min) / range) * (h - 4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    const lx = w;
    const ly = h - 2 - ((values[values.length - 1] - min) / range) * (h - 4);
    ctx.fillStyle = stroke.trim();
    ctx.beginPath();
    ctx.arc(lx - 2, ly, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }, [values, color, height]);
  return <canvas ref={ref} className="spark" />;
}
