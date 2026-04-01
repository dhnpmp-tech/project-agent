import { NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  GET /api/admin/memory/[phone]                                      */
/*  Fetches Mem0 relation graph for a given phone number.              */
/*  Returns nodes, edges, and stats for graph visualization.           */
/*  Auth is handled by middleware — no check needed here.              */
/* ------------------------------------------------------------------ */

const MEM0_URL = process.env.MEM0_URL || "http://172.17.0.1:8888";
const MEM0_API_KEY = process.env.MEM0_API_KEY || "brain-mem0-admin-key-2026";

interface Mem0Relation {
  source: string;
  target: string;
  relationship: string;
  [key: string]: unknown;
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Fetch memories from Mem0
    const res = await fetch(
      `${MEM0_URL}/memories?user_id=${encodeURIComponent(phone)}`,
      {
        headers: {
          "X-API-Key": MEM0_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      console.error("[admin/memory] Mem0 API error:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to fetch memories from Mem0" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const relations: Mem0Relation[] = data.relations || data.results || [];

    // Build unique entities from source/target fields
    const entitySet = new Set<string>();
    const relationshipTypes = new Set<string>();

    for (const rel of relations) {
      if (rel.source) entitySet.add(rel.source);
      if (rel.target) entitySet.add(rel.target);
      if (rel.relationship) relationshipTypes.add(rel.relationship);
    }

    // Format nodes
    const nodes: GraphNode[] = Array.from(entitySet).map((entity) => ({
      id: entity,
      label: entity,
    }));

    // Format edges
    const edges: GraphEdge[] = relations
      .filter((rel) => rel.source && rel.target)
      .map((rel) => ({
        source: rel.source,
        target: rel.target,
        label: rel.relationship || "related_to",
      }));

    return NextResponse.json({
      nodes,
      edges,
      stats: {
        total_relations: relations.length,
        unique_entities: entitySet.size,
        unique_relationship_types: relationshipTypes.size,
      },
    });
  } catch (err) {
    console.error("[admin/memory] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
