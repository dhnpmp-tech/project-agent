"use client";

// Brain visualization — SVG force-directed graph that builds in front of
// the visitor. Pure DOM, no force-graph library. ~150 nodes max so SVG
// performance is fine.
//
// What you see: each node has an `ingestedAt` timestamp. We tick a
// global clock from page load; whenever clock >= ingestedAt, that node
// becomes visible and joins the simulation. Connected edges fade in
// once both endpoints exist.
//
// Force model:
//   - Spring force along each edge (k=0.04, rest length per edge type)
//   - Repulsion between every pair (Coulomb-ish, ~600 / dist^2)
//   - Centering force pulling toward (0,0)
//   - Velocity damping each tick (0.86)
// Integrated with simple Euler. Runs at 30fps via requestAnimationFrame.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildBrain,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type BrainCategory,
  type BrainEdge,
  type BrainNode,
} from "@/lib/brain-demo-data";
import { useLang } from "@/components/dcp/lib";

interface Sim {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ingestedAt: number;
}

const W = 980;
const H = 620;
const CENTER_X = W / 2;
const CENTER_Y = H / 2;

const RADIUS_BY_CAT: Record<BrainCategory, number> = {
  customer: 8,
  booking: 5,
  knowledge: 6,
  vault: 6,
  fact: 5,
  insight: 7,
};

export function BrainCanvas() {
  const { lang } = useLang();
  const graph = useMemo(() => buildBrain(), []);
  const [tick, setTick] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [startedAt] = useState(() => performance.now());

  // Initialize sim state: positions in a small random cluster near center.
  const simRef = useRef<Map<string, Sim>>(new Map());
  if (simRef.current.size === 0) {
    graph.nodes.forEach((n, i) => {
      const angle = (i / graph.nodes.length) * Math.PI * 2;
      const r = 40 + (i % 5) * 12;
      simRef.current.set(n.id, {
        id: n.id,
        x: CENTER_X + Math.cos(angle) * r + (Math.random() - 0.5) * 20,
        y: CENTER_Y + Math.sin(angle) * r + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        ingestedAt: n.ingestedAt,
      });
    });
  }

  // Animation loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(now - last, 50) / 16; // dt in 60fps frames
      last = now;
      stepSimulation(simRef.current, graph.edges, now - startedAt, dt);
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [graph.edges, startedAt]);

  const elapsed = performance.now() - startedAt;

  // Visible nodes = those whose ingestedAt has passed
  const visibleNodeIds = useMemo(() => {
    const set = new Set<string>();
    graph.nodes.forEach((n) => {
      if (elapsed >= n.ingestedAt) set.add(n.id);
    });
    return set;
  }, [graph.nodes, tick, elapsed]);

  // Live counter — counts visible nodes, but reads sim state on every frame
  const visibleCount = visibleNodeIds.size;
  const totalCount = graph.nodes.length;

  // Find label of hovered node for the tooltip
  const hovered = hoveredId ? graph.nodes.find((n) => n.id === hoveredId) : null;

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              opacity: 0.55,
            }}
          >
            {lang === "ar" ? "دماغ نجم · مثال زعفران (مباشر)" : "Najim Brain · Saffron Kitchen demo (live)"}
          </div>
          <div style={{ fontSize: 32, fontFamily: "var(--serif, Georgia, serif)", lineHeight: 1.1, marginTop: 4 }}>
            <span style={{ color: "#d4924b" }}>{visibleCount}</span>
            <span style={{ opacity: 0.45 }}> / {totalCount}</span>{" "}
            <span style={{ fontSize: 14, opacity: 0.7 }}>
              {lang === "ar" ? "حقائق مفهرسة" : "facts ingested"}
            </span>
          </div>
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#5d8a4a",
            border: "1px solid rgba(93,138,74,0.4)",
            padding: "5px 12px",
            borderRadius: 999,
          }}
        >
          ● {lang === "ar" ? "دورة الحلم نشطة" : "Dream Cycle · active"}
        </div>
      </div>

      <div
        style={{
          background: "radial-gradient(ellipse at center, rgba(212,146,75,0.04) 0%, transparent 70%), rgba(0,0,0,0.2)",
          border: "1px solid var(--line, rgba(255,255,255,0.08))",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "auto", display: "block" }}
          onMouseLeave={() => setHoveredId(null)}
        >
          {/* Edges */}
          <g>
            {graph.edges.map((e, i) => {
              const a = simRef.current.get(e.source);
              const b = simRef.current.get(e.target);
              if (!a || !b) return null;
              if (!visibleNodeIds.has(e.source) || !visibleNodeIds.has(e.target)) return null;
              const opacity = hoveredId
                ? e.source === hoveredId || e.target === hoveredId
                  ? 0.7
                  : 0.06
                : 0.18;
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="white"
                  strokeOpacity={opacity}
                  strokeWidth={0.8}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {graph.nodes.map((n) => {
              if (!visibleNodeIds.has(n.id)) return null;
              const s = simRef.current.get(n.id);
              if (!s) return null;
              const color = CATEGORY_COLORS[n.category];
              const r = RADIUS_BY_CAT[n.category];
              const dim = hoveredId && hoveredId !== n.id ? 0.32 : 1;
              return (
                <g
                  key={n.id}
                  transform={`translate(${s.x.toFixed(1)}, ${s.y.toFixed(1)})`}
                  onMouseEnter={() => setHoveredId(n.id)}
                  style={{ cursor: "pointer" }}
                  opacity={dim}
                >
                  {/* Soft halo */}
                  <circle r={r + 6} fill={color} fillOpacity={0.08} />
                  {/* Main node */}
                  <circle r={r} fill={color} fillOpacity={0.85} stroke={color} strokeWidth={1} />
                  {/* Center dot */}
                  <circle r={r * 0.4} fill="white" fillOpacity={0.85} />
                </g>
              );
            })}
          </g>

          {/* Tooltip */}
          {hovered && simRef.current.get(hovered.id) && (
            <g
              transform={`translate(${(simRef.current.get(hovered.id)!.x + 14).toFixed(1)}, ${(simRef.current.get(hovered.id)!.y - 14).toFixed(1)})`}
              pointerEvents="none"
            >
              <rect
                x={0}
                y={-18}
                width={Math.max(140, hovered.label.length * 7 + 16)}
                height={26}
                rx={4}
                fill="rgba(0,0,0,0.85)"
                stroke={CATEGORY_COLORS[hovered.category]}
                strokeOpacity={0.6}
              />
              <text x={8} y={-1} fill="white" fontSize={12} style={{ fontFamily: "var(--mono, ui-monospace)" }}>
                {hovered.label}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          marginTop: 18,
          paddingTop: 18,
          borderTop: "1px solid var(--line, rgba(255,255,255,0.06))",
        }}
      >
        {(Object.keys(CATEGORY_COLORS) as BrainCategory[]).map((cat) => (
          <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.85 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: CATEGORY_COLORS[cat],
                display: "inline-block",
              }}
            />
            <span>{CATEGORY_LABELS[cat][lang]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function stepSimulation(
  sim: Map<string, Sim>,
  edges: BrainEdge[],
  elapsed: number,
  dt: number,
) {
  const nodes = Array.from(sim.values()).filter((s) => elapsed >= s.ingestedAt);

  // Build adjacency for spring force
  for (const e of edges) {
    const a = sim.get(e.source);
    const b = sim.get(e.target);
    if (!a || !b) continue;
    if (elapsed < a.ingestedAt || elapsed < b.ingestedAt) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const rest = 120;
    const k = 0.0025;
    const f = (dist - rest) * k;
    const fx = (dx / dist) * f;
    const fy = (dy / dist) * f;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  }

  // Repulsion + centering
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distSq = Math.max(20, dx * dx + dy * dy);
      const force = 320 / distSq;
      const dist = Math.sqrt(distSq);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;
    }

    // Center force
    const cdx = CENTER_X - a.x;
    const cdy = CENTER_Y - a.y;
    a.vx += cdx * 0.0005;
    a.vy += cdy * 0.0005;
  }

  // Integrate + damp
  for (const a of nodes) {
    a.vx *= 0.86;
    a.vy *= 0.86;
    a.x += a.vx * dt;
    a.y += a.vy * dt;

    // Boundaries
    const margin = 24;
    if (a.x < margin) {
      a.x = margin;
      a.vx = Math.abs(a.vx) * 0.5;
    }
    if (a.x > W - margin) {
      a.x = W - margin;
      a.vx = -Math.abs(a.vx) * 0.5;
    }
    if (a.y < margin) {
      a.y = margin;
      a.vy = Math.abs(a.vy) * 0.5;
    }
    if (a.y > H - margin) {
      a.y = H - margin;
      a.vy = -Math.abs(a.vy) * 0.5;
    }
  }
}
