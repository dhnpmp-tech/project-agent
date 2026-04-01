"use client";

import {
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AdminClient {
  id: string;
  company_name: string;
  status: string;
  plan: string;
  created_at: string;
  contact_email: string | null;
  contact_phone: string | null;
  country: string | null;
  agent_count: number;
  persona_name: string | null;
}

interface AgentDeployment {
  id: string;
  client_id: string;
  agent_type: string;
  status: string;
  deployed_at: string | null;
  created_at: string;
  config: Record<string, unknown>;
}

interface KnowledgeData {
  crawl_data: {
    persona_story?: string;
    voice_prompt?: string;
    persona_name?: string;
    agent_name?: string;
    [key: string]: unknown;
  } | null;
}

interface GraphNode {
  id: string;
  label: string;
}

interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

interface MemoryGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    total_relations: number;
    unique_entities: number;
    unique_relationship_types: number;
  };
}

/* Internal simulation node with position + velocity */
interface SimNode {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: "customer" | "entity" | "preference" | "person";
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  wia: "WhatsApp Intelligence Agent",
  ai_sdr: "AI Sales Development Rep",
  cea: "Content Engine Agent",
  hrsa: "HR Screening Agent",
  fia: "Financial Intelligence Agent",
};

const NODE_COLORS: Record<SimNode["type"], { fill: string; ring: string; text: string }> = {
  customer: {
    fill: "rgba(16, 185, 129, 0.25)",
    ring: "rgba(52, 211, 153, 0.7)",
    text: "#6ee7b7",
  },
  entity: {
    fill: "rgba(14, 165, 233, 0.2)",
    ring: "rgba(56, 189, 248, 0.6)",
    text: "#7dd3fc",
  },
  preference: {
    fill: "rgba(245, 158, 11, 0.2)",
    ring: "rgba(251, 191, 36, 0.6)",
    text: "#fcd34d",
  },
  person: {
    fill: "rgba(139, 92, 246, 0.2)",
    ring: "rgba(167, 139, 250, 0.6)",
    text: "#c4b5fd",
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20";
    case "pending":
      return "bg-amber-500/10 text-amber-400 ring-amber-500/20";
    case "deploying":
      return "bg-sky-500/10 text-sky-400 ring-sky-500/20";
    case "paused":
      return "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20";
    case "error":
      return "bg-red-500/10 text-red-400 ring-red-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20";
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Classify a node by its label (heuristic) */
function classifyNode(
  label: string,
  customerPhone: string
): SimNode["type"] {
  const lower = label.toLowerCase();
  if (lower === customerPhone.toLowerCase() || lower.includes("customer"))
    return "customer";
  if (
    lower.includes("prefer") ||
    lower.includes("like") ||
    lower.includes("favorite") ||
    lower.includes("allerg") ||
    lower.includes("diet") ||
    lower.includes("spicy") ||
    lower.includes("vegan") ||
    lower.includes("vegetarian")
  )
    return "preference";
  // Names typically start with uppercase and have no special chars
  if (/^[A-Z][a-z]+ ?[A-Z]?[a-z]*$/.test(label)) return "person";
  return "entity";
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-white/[0.06] ${className}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Force Simulation Hook                                              */
/* ------------------------------------------------------------------ */

function useForceSimulation(
  graphData: MemoryGraphData | null,
  customerPhone: string,
  width: number,
  height: number
) {
  const nodesRef = useRef<SimNode[]>([]);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const rafRef = useRef<number>(0);
  const tickRef = useRef(0);

  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0) {
      nodesRef.current = [];
      setSimNodes([]);
      return;
    }

    const cx = width / 2;
    const cy = height / 2;

    // Initialize node positions in a circle
    const nodes: SimNode[] = graphData.nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / graphData.nodes.length;
      const radius = Math.min(width, height) * 0.3;
      const type = classifyNode(n.label, customerPhone);
      // Place customer at center
      const isCustomer = type === "customer";
      return {
        id: n.id,
        label: n.label,
        x: isCustomer ? cx : cx + radius * Math.cos(angle),
        y: isCustomer ? cy : cy + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        type,
      };
    });

    nodesRef.current = nodes;
    tickRef.current = 0;

    const nodeMap = new Map<string, SimNode>();
    for (const n of nodes) nodeMap.set(n.id, n);

    const edges = graphData.edges;
    const totalTicks = 300;
    const damping = 0.92;

    function tick() {
      tickRef.current++;
      const alpha = Math.max(0, 1 - tickRef.current / totalTicks);
      if (alpha <= 0) {
        setSimNodes([...nodesRef.current]);
        return;
      }

      const ns = nodesRef.current;

      // Repulsion (all pairs)
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          let dx = ns[j].x - ns[i].x;
          let dy = ns[j].y - ns[i].y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const repulse = (800 * alpha) / (dist * dist);
          const fx = (dx / dist) * repulse;
          const fy = (dy / dist) * repulse;
          ns[i].vx -= fx;
          ns[i].vy -= fy;
          ns[j].vx += fx;
          ns[j].vy += fy;
        }
      }

      // Attraction along edges
      for (const e of edges) {
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const ideal = 140;
        const force = ((dist - ideal) * 0.06 * alpha);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      }

      // Center gravity
      for (const n of ns) {
        n.vx += (cx - n.x) * 0.005 * alpha;
        n.vy += (cy - n.y) * 0.005 * alpha;
      }

      // Apply velocity
      for (const n of ns) {
        n.vx *= damping;
        n.vy *= damping;
        n.x += n.vx;
        n.y += n.vy;
        // Clamp to bounds
        n.x = Math.max(40, Math.min(width - 40, n.x));
        n.y = Math.max(40, Math.min(height - 40, n.y));
      }

      // Update state every 3 ticks for perf
      if (tickRef.current % 3 === 0 || alpha <= 0.01) {
        setSimNodes([...ns]);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [graphData, customerPhone, width, height]);

  return simNodes;
}

/* ------------------------------------------------------------------ */
/*  Graph Visualization Component                                      */
/* ------------------------------------------------------------------ */

function MemoryGraph({
  graphData,
  customerPhone,
}: {
  graphData: MemoryGraphData;
  customerPhone: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(450, entry.contentRect.height),
        });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const simNodes = useForceSimulation(
    graphData,
    customerPhone,
    dimensions.width,
    dimensions.height
  );

  // Build node position map for edge rendering
  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const n of simNodes) {
      map.set(n.id, { x: n.x, y: n.y });
    }
    return map;
  }, [simNodes]);

  // Drag handling
  const handleMouseDown = useCallback(
    (nodeId: string) => {
      setDraggedNode(nodeId);
    },
    []
  );

  useEffect(() => {
    if (!draggedNode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const node = simNodes.find((n) => n.id === draggedNode);
      if (node) {
        node.x = Math.max(40, Math.min(dimensions.width - 40, x));
        node.y = Math.max(40, Math.min(dimensions.height - 40, y));
        node.vx = 0;
        node.vy = 0;
      }
    };

    const handleMouseUp = () => {
      setDraggedNode(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggedNode, simNodes, dimensions]);

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <p className="text-sm text-white/30">No memory graph data found for this number.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-[500px] w-full">
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-zinc-900/80 to-zinc-950"
      >
        <defs>
          {/* Glow filter for hovered/customer nodes */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Subtle grid pattern */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(255,255,255,0.02)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        {/* Background grid */}
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Edges */}
        {graphData.edges.map((edge, i) => {
          const s = nodePositions.get(edge.source);
          const t = nodePositions.get(edge.target);
          if (!s || !t) return null;
          const mx = (s.x + t.x) / 2;
          const my = (s.y + t.y) / 2;
          const isHighlighted =
            hoveredNode === edge.source || hoveredNode === edge.target;
          return (
            <g key={`edge-${i}`}>
              <line
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={isHighlighted ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"}
                strokeWidth={isHighlighted ? 1.5 : 0.8}
                strokeDasharray={isHighlighted ? "none" : "none"}
              />
              {/* Edge label */}
              <text
                x={mx}
                y={my - 5}
                textAnchor="middle"
                fill={isHighlighted ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)"}
                fontSize="9"
                fontFamily="monospace"
              >
                {edge.label.length > 20
                  ? edge.label.slice(0, 18) + ".."
                  : edge.label}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {simNodes.map((node) => {
          const colors = NODE_COLORS[node.type];
          const isHovered = hoveredNode === node.id;
          const isCustomer = node.type === "customer";
          const radius = isCustomer ? 22 : 16;
          const truncatedLabel =
            node.label.length > 16
              ? node.label.slice(0, 14) + ".."
              : node.label;

          return (
            <g
              key={node.id}
              style={{ cursor: "grab" }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onMouseDown={() => handleMouseDown(node.id)}
              filter={isHovered || isCustomer ? "url(#glow)" : undefined}
            >
              {/* Outer ring */}
              <circle
                cx={node.x}
                cy={node.y}
                r={radius + 3}
                fill="none"
                stroke={colors.ring}
                strokeWidth={isHovered ? 1.5 : 0.5}
                opacity={isHovered ? 0.8 : 0.3}
              />
              {/* Node body */}
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={colors.fill}
                stroke={colors.ring}
                strokeWidth={isHovered ? 1.5 : 1}
              />
              {/* Label */}
              <text
                x={node.x}
                y={node.y + radius + 14}
                textAnchor="middle"
                fill={isHovered ? "#fff" : colors.text}
                fontSize={isCustomer ? "11" : "10"}
                fontWeight={isCustomer ? "600" : "400"}
                fontFamily="system-ui, sans-serif"
              >
                {truncatedLabel}
              </text>
              {/* Type indicator inside node */}
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                fill={colors.text}
                fontSize={isCustomer ? "12" : "10"}
                fontWeight="600"
              >
                {isCustomer
                  ? "\u25C9"
                  : node.type === "preference"
                  ? "\u2665"
                  : node.type === "person"
                  ? "\u263A"
                  : "\u25CB"}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-4 rounded-lg bg-zinc-950/80 px-3 py-2 backdrop-blur-sm ring-1 ring-white/[0.06]">
        {(
          [
            ["customer", "Customer", NODE_COLORS.customer.ring],
            ["entity", "Entity", NODE_COLORS.entity.ring],
            ["preference", "Preference", NODE_COLORS.preference.ring],
            ["person", "Person", NODE_COLORS.person.ring],
          ] as const
        ).map(([, label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-white/50">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const clientId = resolvedParams.id;

  /* -- Client data -- */
  const [client, setClient] = useState<AdminClient | null>(null);
  const [clientLoading, setClientLoading] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);

  /* -- Knowledge / persona -- */
  const [knowledge, setKnowledge] = useState<KnowledgeData | null>(null);

  /* -- Agent deployments -- */
  const [deployments, setDeployments] = useState<AgentDeployment[]>([]);

  /* -- Memory graph -- */
  const [phoneInput, setPhoneInput] = useState("");
  const [memoryData, setMemoryData] = useState<MemoryGraphData | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [memoryPhone, setMemoryPhone] = useState("");

  /* -- Fetch client + knowledge + deployments -- */
  useEffect(() => {
    async function load() {
      try {
        // Fetch clients list and find the one we need
        const res = await fetch("/api/admin/clients");
        if (!res.ok) throw new Error(`Failed to fetch clients (${res.status})`);
        const data: AdminClient[] = await res.json();
        const found = data.find((c) => c.id === clientId);
        if (!found) {
          setClientError("Client not found");
          setClientLoading(false);
          return;
        }
        setClient(found);

        // Fetch knowledge data for persona
        try {
          const kbRes = await fetch(`/api/admin/clients/${clientId}/knowledge`);
          if (kbRes.ok) {
            const kbData = await kbRes.json();
            setKnowledge(kbData);
          }
        } catch {
          // Knowledge endpoint may not exist yet; non-critical
        }

        // Fetch agent deployments
        try {
          const depRes = await fetch(`/api/admin/clients/${clientId}/deployments`);
          if (depRes.ok) {
            const depData = await depRes.json();
            setDeployments(depData);
          }
        } catch {
          // Deployments endpoint may not exist yet; non-critical
        }
      } catch (err) {
        setClientError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setClientLoading(false);
      }
    }
    load();
  }, [clientId]);

  /* -- Fetch memory graph -- */
  const fetchMemory = useCallback(async () => {
    const phone = phoneInput.trim();
    if (!phone) return;
    setMemoryLoading(true);
    setMemoryError(null);
    setMemoryData(null);
    setMemoryPhone(phone);
    try {
      const res = await fetch(
        `/api/admin/memory/${encodeURIComponent(phone)}`
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          (errBody as { error?: string }).error || `Request failed (${res.status})`
        );
      }
      const data: MemoryGraphData = await res.json();
      setMemoryData(data);
    } catch (err) {
      setMemoryError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setMemoryLoading(false);
    }
  }, [phoneInput]);

  /* ---------------------------------------------------------------- */
  /*  Render: Loading State                                            */
  /* ---------------------------------------------------------------- */

  if (clientLoading) {
    return (
      <>
        {/* Breadcrumb skeleton */}
        <div className="mb-6 flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <span className="text-white/20">/</span>
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Header skeleton */}
        <div className="mb-8 rounded-xl bg-white/[0.03] p-6 ring-1 ring-white/[0.06]">
          <div className="flex items-start justify-between">
            <div>
              <Skeleton className="mb-3 h-7 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="mt-6 grid grid-cols-4 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Persona skeleton */}
        <div className="mb-8 rounded-xl bg-white/[0.03] p-6 ring-1 ring-white/[0.06]">
          <Skeleton className="mb-4 h-5 w-32" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Deployments skeleton */}
        <div className="mb-8 rounded-xl bg-white/[0.03] p-6 ring-1 ring-white/[0.06]">
          <Skeleton className="mb-4 h-5 w-40" />
          <Skeleton className="mb-2 h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render: Error State                                              */
  /* ---------------------------------------------------------------- */

  if (clientError || !client) {
    return (
      <>
        <div className="mb-6">
          <Link
            href="/admin"
            className="text-sm text-white/40 transition-colors hover:text-white"
          >
            &larr; Back to Overview
          </Link>
        </div>
        <div className="flex h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
              <svg
                className="h-6 w-6 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-white/80">
              {clientError || "Client not found"}
            </p>
            <p className="mt-1 text-xs text-white/30">
              The client with ID {clientId} could not be loaded.
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-block rounded-lg bg-white/[0.06] px-4 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.1] hover:text-white"
            >
              Return to Overview
            </Link>
          </div>
        </div>
      </>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render: Main Content                                             */
  /* ---------------------------------------------------------------- */

  const personaStory =
    knowledge?.crawl_data?.persona_story ||
    knowledge?.crawl_data?.voice_prompt ||
    null;

  const personaName =
    knowledge?.crawl_data?.persona_name ||
    knowledge?.crawl_data?.agent_name ||
    client.persona_name ||
    null;

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link
          href="/admin"
          className="text-white/40 transition-colors hover:text-white"
        >
          Overview
        </Link>
        <span className="text-white/20">/</span>
        <Link
          href="/admin"
          className="text-white/40 transition-colors hover:text-white"
        >
          Clients
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-white/70">{client.company_name}</span>
      </div>

      {/* ============================================================ */}
      {/*  Client Header Card                                          */}
      {/* ============================================================ */}
      <div className="mb-8 rounded-xl bg-white/[0.03] p-6 ring-1 ring-white/[0.06]">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {client.company_name}
            </h1>
            {personaName && (
              <p className="mt-1 text-sm text-emerald-400/70">
                Agent: {personaName}
              </p>
            )}
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusColor(client.status)}`}
          >
            {client.status}
          </span>
        </div>

        {/* Info grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
              Plan
            </p>
            <p className="mt-1 text-sm font-medium text-white/80">
              {client.plan || "No plan"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
              Created
            </p>
            <p className="mt-1 text-sm font-mono text-white/80">
              {formatDate(client.created_at)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
              Contact Email
            </p>
            <p className="mt-1 text-sm text-white/80">
              {client.contact_email || (
                <span className="text-white/20">Not set</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
              Contact Phone
            </p>
            <p className="mt-1 text-sm font-mono text-white/80">
              {client.contact_phone || (
                <span className="text-white/20">Not set</span>
              )}
            </p>
          </div>
        </div>

        {client.country && (
          <div className="mt-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
              Country
            </p>
            <p className="mt-1 text-sm text-white/80">{client.country}</p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  Persona Section                                             */}
      {/* ============================================================ */}
      <div className="mb-8 rounded-xl bg-white/[0.03] p-6 ring-1 ring-white/[0.06]">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
            <svg
              className="h-3.5 w-3.5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
              />
            </svg>
          </div>
          <h2 className="text-sm font-semibold">Agent Persona</h2>
        </div>

        {personaStory ? (
          <div className="relative rounded-lg border-l-2 border-emerald-500/30 bg-emerald-500/[0.04] px-5 py-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">
              {personaStory}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02] px-5 py-8 text-center">
            <p className="text-sm text-white/30">
              No persona data found. Complete the onboarding website crawl to generate one.
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  Agent Deployments                                           */}
      {/* ============================================================ */}
      <div className="mb-8 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06]">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-6 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10">
            <svg
              className="h-3.5 w-3.5 text-sky-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5"
              />
            </svg>
          </div>
          <h2 className="text-sm font-semibold">Agent Deployments</h2>
          <span className="ml-auto rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-mono text-white/40">
            {deployments.length > 0 ? deployments.length : client.agent_count}
          </span>
        </div>

        {deployments.length > 0 ? (
          <div className="divide-y divide-white/[0.04]">
            {deployments.map((dep) => (
              <div
                key={dep.id}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06]">
                    <span className="text-xs font-bold uppercase text-white/40">
                      {dep.agent_type}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/90">
                      {AGENT_DISPLAY_NAMES[dep.agent_type] || dep.agent_type}
                    </p>
                    <p className="text-xs text-white/30">
                      ID: {dep.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {dep.deployed_at && (
                    <p className="text-xs text-white/30">
                      Deployed {formatDate(dep.deployed_at)}
                    </p>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusColor(dep.status)}`}
                  >
                    {dep.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : client.agent_count > 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-white/30">
              {client.agent_count} agent{client.agent_count !== 1 ? "s" : ""}{" "}
              deployed. Detailed data loading is not available yet.
            </p>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-white/30">No agents deployed yet.</p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  Customer Memory Section                                     */}
      {/* ============================================================ */}
      <div className="mb-8 rounded-xl bg-white/[0.03] p-6 ring-1 ring-white/[0.06]">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10">
            <svg
              className="h-3.5 w-3.5 text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
              />
            </svg>
          </div>
          <h2 className="text-sm font-semibold">Customer Memory</h2>
        </div>

        {/* Phone lookup input */}
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <svg
                className="h-4 w-4 text-white/20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchMemory();
              }}
              placeholder="Enter customer phone (e.g. +971501234567)"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>
          <button
            onClick={fetchMemory}
            disabled={memoryLoading || !phoneInput.trim()}
            className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-400 ring-1 ring-emerald-500/20 transition-all hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {memoryLoading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                Lookup
              </>
            )}
          </button>
        </div>

        {/* Memory error */}
        {memoryError && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {memoryError}
          </div>
        )}

        {/* Memory loading skeleton */}
        {memoryLoading && (
          <div className="space-y-4">
            <Skeleton className="h-[500px] w-full rounded-xl" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          </div>
        )}

        {/* Memory graph visualization */}
        {memoryData && !memoryLoading && (
          <>
            <MemoryGraph graphData={memoryData} customerPhone={memoryPhone} />

            {/* Stats row */}
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
                  Total Relations
                </p>
                <p className="mt-1 text-xl font-semibold font-mono text-emerald-400">
                  {memoryData.stats.total_relations}
                </p>
              </div>
              <div className="rounded-lg bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
                  Unique Entities
                </p>
                <p className="mt-1 text-xl font-semibold font-mono text-sky-400">
                  {memoryData.stats.unique_entities}
                </p>
              </div>
              <div className="rounded-lg bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
                  Relationship Types
                </p>
                <p className="mt-1 text-xl font-semibold font-mono text-violet-400">
                  {memoryData.stats.unique_relationship_types}
                </p>
              </div>
            </div>

            {/* Raw relations table */}
            {memoryData.edges.length > 0 && (
              <div className="mt-6 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.06]">
                <div className="border-b border-white/[0.06] px-5 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    Relations
                  </h3>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-white/30">
                        <th className="px-5 py-2.5 font-medium">Source</th>
                        <th className="px-4 py-2.5 font-medium">
                          Relationship
                        </th>
                        <th className="px-4 py-2.5 font-medium">Target</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {memoryData.edges.map((edge, i) => (
                        <tr
                          key={i}
                          className="transition-colors hover:bg-white/[0.03]"
                        >
                          <td className="px-5 py-2.5 font-mono text-xs text-white/70">
                            {edge.source}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/50">
                              {edge.label}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 font-mono text-xs text-white/70">
                            {edge.target}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* No memory data state (after successful fetch with empty results) */}
        {memoryData &&
          !memoryLoading &&
          memoryData.nodes.length === 0 &&
          memoryData.edges.length === 0 && (
            <div className="mt-4 rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02] px-5 py-8 text-center">
              <p className="text-sm text-white/30">
                No memory data found for{" "}
                <span className="font-mono text-white/50">{memoryPhone}</span>.
                This customer may not have any stored relations yet.
              </p>
            </div>
          )}

        {/* Initial state before any lookup */}
        {!memoryData && !memoryLoading && !memoryError && (
          <div className="rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02] px-5 py-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 ring-1 ring-violet-500/20">
              <svg
                className="h-5 w-5 text-violet-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-white/40">
              Enter a phone number to explore customer memory
            </p>
            <p className="mt-1 text-xs text-white/20">
              The graph will show entities, preferences, and relationships
              stored in Mem0.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
