"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NeuralBrainProps {
  totalCustomers: number;
  totalFacts: number;
  isLoading: boolean;
}

interface Node {
  id: number;
  x: number;
  y: number;
  r: number;
  opacity: number;
  /** animation-delay in seconds so pulses feel organic */
  delay: number;
}

interface Edge {
  from: number;
  to: number;
}

interface Particle {
  edgeIdx: number;
  progress: number; // 0 → 1
  startTime: number;
}

// ---------------------------------------------------------------------------
// Deterministic pseudo-random (seeded) so the layout doesn't jump on re-render
// ---------------------------------------------------------------------------

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function dist(a: Node, b: Node) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function generateGraph(
  count: number,
  width: number,
  height: number,
): { nodes: Node[]; edges: Edge[] } {
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(cx, cy) - 16;
  const rand = seededRandom(42);

  const nodes: Node[] = [];
  for (let i = 0; i < count; i++) {
    // bias toward center using sqrt for uniform disc distribution
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()) * maxR;
    nodes.push({
      id: i,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      r: 3 + rand() * 2,
      opacity: 0.15 + rand() * 0.45,
      delay: rand() * 4,
    });
  }

  // Build edges: connect each node to its 2–3 nearest neighbors
  const edges: Edge[] = [];
  const edgeSet = new Set<string>();

  for (const node of nodes) {
    const sorted = [...nodes]
      .filter((n) => n.id !== node.id)
      .sort((a, b) => dist(node, a) - dist(node, b));

    const neighborCount = 2 + Math.floor(rand());
    for (let j = 0; j < Math.min(neighborCount, sorted.length); j++) {
      const key = [Math.min(node.id, sorted[j].id), Math.max(node.id, sorted[j].id)].join("-");
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ from: node.id, to: sorted[j].id });
      }
    }
  }

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// CSS keyframes (injected once)
// ---------------------------------------------------------------------------

const KEYFRAMES_ID = "neural-brain-keyframes";

function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(KEYFRAMES_ID)) return;

  const style = document.createElement("style");
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes nb-pulse {
      0%, 100% { opacity: var(--nb-lo); }
      50%      { opacity: var(--nb-hi); }
    }
    @keyframes nb-edge-in {
      0%   { opacity: 0; filter: drop-shadow(0 0 4px rgba(52,211,153,0.8)); }
      40%  { opacity: 0.5; filter: drop-shadow(0 0 6px rgba(52,211,153,0.6)); }
      100% { opacity: 0.25; filter: none; }
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Sub-components (memoized)
// ---------------------------------------------------------------------------

const NodeCircle = memo(function NodeCircle({ node }: { node: Node }) {
  const lo = Math.max(node.opacity - 0.1, 0.08);
  const hi = Math.min(node.opacity + 0.15, 0.65);
  return (
    <circle
      cx={node.x}
      cy={node.y}
      r={node.r}
      fill="#34d399"
      style={{
        "--nb-lo": lo,
        "--nb-hi": hi,
        opacity: node.opacity,
        animation: `nb-pulse ${3 + node.delay}s ease-in-out ${node.delay}s infinite`,
      } as React.CSSProperties}
    />
  );
});

const EdgeLine = memo(function EdgeLine({
  edge,
  nodes,
  isNew,
}: {
  edge: Edge;
  nodes: Node[];
  isNew: boolean;
}) {
  const a = nodes[edge.from];
  const b = nodes[edge.to];
  return (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke="#34d399"
      strokeWidth={1}
      style={
        isNew
          ? {
              animation: "nb-edge-in 3s ease-out forwards",
            }
          : { opacity: 0.12 }
      }
    />
  );
});

// ---------------------------------------------------------------------------
// Traveling particle (uses rAF, rendered via imperative DOM for perf)
// ---------------------------------------------------------------------------

function useTravelingParticle(
  svgRef: React.RefObject<SVGSVGElement | null>,
  nodes: Node[],
  edges: Edge[],
) {
  const particleRef = useRef<SVGCircleElement | null>(null);
  const activeRef = useRef<Particle | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!svgRef.current || edges.length === 0) return;

    // Create the particle element once
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", "2.5");
    circle.setAttribute("fill", "#34d399");
    circle.setAttribute("opacity", "0");
    circle.setAttribute("filter", "url(#particle-glow)");
    svgRef.current.appendChild(circle);
    particleRef.current = circle;

    const TRAVEL_DURATION = 1200; // ms per edge
    const INTERVAL = 2000; // new particle every 2s

    function pickEdge() {
      const idx = Math.floor(Math.random() * edges.length);
      activeRef.current = {
        edgeIdx: idx,
        progress: 0,
        startTime: performance.now(),
      };
    }

    function animate(now: number) {
      const p = activeRef.current;
      const el = particleRef.current;
      if (!p || !el) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = now - p.startTime;
      const t = Math.min(elapsed / TRAVEL_DURATION, 1);
      const edge = edges[p.edgeIdx];
      const a = nodes[edge.from];
      const b = nodes[edge.to];

      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;

      // bell-curve opacity: bright in the middle
      const op = Math.sin(t * Math.PI) * 0.9;
      el.setAttribute("cx", String(x));
      el.setAttribute("cy", String(y));
      el.setAttribute("opacity", String(op));

      if (t >= 1) {
        el.setAttribute("opacity", "0");
        activeRef.current = null;
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    const interval = setInterval(pickEdge, INTERVAL);
    // kick off the first one immediately
    pickEdge();

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(interval);
      if (particleRef.current && svgRef.current) {
        try {
          svgRef.current.removeChild(particleRef.current);
        } catch {
          /* already removed */
        }
      }
    };
  }, [svgRef, nodes, edges]);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function NeuralBrainInner({
  totalCustomers,
  totalFacts,
  isLoading,
}: NeuralBrainProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(480);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Inject keyframes on mount
  useEffect(() => ensureKeyframes(), []);

  // Responsive width
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const SVG_HEIGHT = 200;
  const nodeCount = Math.min(Math.floor(totalFacts / 3), 80);

  const { nodes, edges } = useMemo(
    () => generateGraph(Math.max(nodeCount, 0), containerWidth, SVG_HEIGHT),
    [nodeCount, containerWidth],
  );

  // New-edge effect: every 3s, pick a random edge to "appear" with glow
  const [newEdgeIds, setNewEdgeIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (edges.length === 0) return;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * edges.length);
      setNewEdgeIds(new Set([idx]));
      // Clear glow after animation finishes
      setTimeout(() => setNewEdgeIds(new Set()), 3000);
    }, 3000);
    return () => clearInterval(interval);
  }, [edges.length]);

  // Traveling particle
  useTravelingParticle(svgRef, nodes, edges);

  const cx = containerWidth / 2;
  const cy = SVG_HEIGHT / 2;

  // Empty state
  if (totalFacts === 0 && !isLoading) {
    return (
      <div
        ref={containerRef}
        className="bg-gray-900 rounded-2xl p-6 w-full"
        style={{ minHeight: 280 }}
      >
        <svg
          width="100%"
          height={SVG_HEIGHT}
          viewBox={`0 0 ${containerWidth} ${SVG_HEIGHT}`}
        >
          <defs>
            <radialGradient id="empty-glow" cx="50%" cy="50%" r="40%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={cx} cy={cy} r={60} fill="url(#empty-glow)" />
          <circle cx={cx} cy={cy} r={4} fill="#34d399" opacity={0.3} />
        </svg>
        <p className="text-center text-gray-500 text-sm mt-3 leading-relaxed">
          Your AI brain will grow here as customers interact
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-gray-900 rounded-2xl p-6 w-full"
      style={{ minHeight: 280 }}
    >
      {/* SVG visualization */}
      <svg
        ref={svgRef}
        width="100%"
        height={SVG_HEIGHT}
        viewBox={`0 0 ${containerWidth} ${SVG_HEIGHT}`}
        className="overflow-visible"
      >
        <defs>
          {/* Core glow */}
          <radialGradient id="core-glow" cx="50%" cy="50%" r="35%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#34d399" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </radialGradient>
          {/* Particle glow filter */}
          <filter id="particle-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background core glow */}
        <circle cx={cx} cy={cy} r={Math.min(cx, cy) * 0.7} fill="url(#core-glow)" />

        {/* Edges */}
        {edges.map((edge, i) => (
          <EdgeLine
            key={`${edge.from}-${edge.to}`}
            edge={edge}
            nodes={nodes}
            isNew={newEdgeIds.has(i)}
          />
        ))}

        {/* Nodes */}
        {nodes.map((node) => (
          <NodeCircle key={node.id} node={node} />
        ))}

        {/* Brighter center node */}
        <circle cx={cx} cy={cy} r={5} fill="#34d399" opacity={0.5}>
          <animate
            attributeName="opacity"
            values="0.3;0.65;0.3"
            dur="3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values="4;6;4"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>

      {/* Stats */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        {/* Customers */}
        <div className="flex items-center gap-2 text-gray-300">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-400 shrink-0"
          >
            {/* Brain icon */}
            <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z" />
            <path d="M9 21h6" />
            <path d="M10 17v4" />
            <path d="M14 17v4" />
          </svg>
          <span>
            <span className="text-emerald-400 font-semibold tabular-nums">
              {isLoading ? "..." : totalCustomers.toLocaleString()}
            </span>{" "}
            customers remembered
          </span>
        </div>

        {/* Facts */}
        <div className="flex items-center gap-2 text-gray-300">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-400 shrink-0"
          >
            {/* Database icon */}
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
          </svg>
          <span>
            <span className="text-emerald-400 font-semibold tabular-nums">
              {isLoading ? "..." : totalFacts.toLocaleString()}
            </span>{" "}
            facts learned
          </span>
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-center text-gray-500 text-xs mt-2">
        Growing every conversation
      </p>
    </div>
  );
}

export const NeuralBrain = memo(NeuralBrainInner);
