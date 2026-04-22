"""Prompt Evolution — GEPA-powered automatic prompt optimization.

Uses two modes:
  1. Full GEPA (via `gepa` or `dspy.GEPA`) — genetic-Pareto prompt evolution
     with execution trace reflection. Best quality, needs pip install gepa.
  2. Lightweight fallback — uses OpenRouter LLM calls to analyze best/worst
     conversations and generate prompt variants. No extra deps needed.

Integrates with our Karpathy Loop: instead of just generating behavioral
RULES, this rewrites the entire PROMPT based on real conversation outcomes.
"""

import os
import json
import asyncio
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Callable

import httpx

logger = logging.getLogger("prompt_evolution")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

# LLM used for reflection / mutation (via OpenRouter)
REFLECTION_MODEL = os.getenv("REFLECTION_MODEL", "anthropic/claude-sonnet-4")
CANDIDATE_MODEL = os.getenv("CANDIDATE_MODEL", "anthropic/claude-sonnet-4")

# GEPA config
GEPA_MAX_METRIC_CALLS = int(os.getenv("GEPA_MAX_METRIC_CALLS", "100"))
GEPA_REFLECTION_LM = os.getenv("GEPA_REFLECTION_LM", "openai/gpt-4.1-mini")


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------

async def _supabase_query(table: str, params: dict) -> list[dict]:
    """Query Supabase REST API."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            params=params,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def _fetch_conversations(client_id: str, limit: int = 100) -> list[dict]:
    """Fetch recent conversations with outcomes from Supabase."""
    rows = await _supabase_query("conversations", {
        "client_id": f"eq.{client_id}",
        "order": "created_at.desc",
        "limit": str(limit),
        "select": "id,messages,outcome,satisfaction_score,created_at",
    })
    return rows


async def _fetch_current_prompt(client_id: str) -> str:
    """Fetch the current system prompt for a client."""
    rows = await _supabase_query("clients", {
        "id": f"eq.{client_id}",
        "select": "system_prompt",
        "limit": "1",
    })
    if rows:
        return rows[0].get("system_prompt", "")
    return ""


async def _save_prompt_variant(
    client_id: str,
    prompt: str,
    metadata: dict,
) -> str:
    """Save a prompt variant to Supabase for A/B testing."""
    variant_id = hashlib.sha256(prompt.encode()).hexdigest()[:12]
    async with httpx.AsyncClient(timeout=15.0) as client:
        await client.post(
            f"{SUPABASE_URL}/rest/v1/prompt_variants",
            json={
                "id": variant_id,
                "client_id": client_id,
                "prompt_text": prompt,
                "metadata": metadata,
                "status": "candidate",
                "created_at": datetime.utcnow().isoformat(),
            },
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
        )
    return variant_id


# ---------------------------------------------------------------------------
# OpenRouter LLM helper
# ---------------------------------------------------------------------------

async def _llm_call(
    system: str,
    user: str,
    model: str = "",
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> str:
    """Call an LLM via OpenRouter."""
    model = model or REFLECTION_MODEL

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://kapso.ai",
                "X-Title": "Kapso Prompt Evolution",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


# ---------------------------------------------------------------------------
# GEPA (Full) — via `gepa` library
# ---------------------------------------------------------------------------

async def _evolve_with_gepa(
    current_prompt: str,
    conversation_traces: list[dict],
    optimization_target: str,
) -> Optional[dict]:
    """Run full GEPA optimization using the gepa library.

    Requires: pip install gepa
    Cost: ~$2-10 per run depending on max_metric_calls
    """
    try:
        import gepa
        import gepa.optimize_anything as oa
        from gepa.optimize_anything import GEPAConfig, EngineConfig, ReflectionConfig
    except ImportError:
        logger.info("gepa library not installed, skipping full GEPA mode")
        return None

    # Build dataset from conversation traces
    dataset = []
    for trace in conversation_traces:
        messages = trace.get("messages", [])
        outcome = trace.get("outcome", "unknown")
        score = trace.get("satisfaction_score", 0.5)

        dataset.append({
            "conversation": json.dumps(messages, ensure_ascii=False)[:3000],
            "outcome": outcome,
            "target_score": score,
        })

    if not dataset:
        logger.warning("No conversation traces for GEPA optimization")
        return None

    # Split into train/val (80/20)
    split_idx = max(1, int(len(dataset) * 0.8))
    trainset = dataset[:split_idx]
    valset = dataset[split_idx:] if len(dataset) > split_idx else trainset[:2]

    # Evaluator: simulate the prompt with a conversation and check outcome
    def evaluate(candidate: str, example: dict) -> float:
        """Score a prompt candidate against a conversation trace."""
        conversation = example["conversation"]
        target_outcome = example["outcome"]

        # We can't actually replay the conversation, but we can ask an LLM
        # to judge how well the prompt would handle this conversation
        # This runs synchronously inside GEPA's evaluation loop
        import requests

        resp = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json={
                "model": CANDIDATE_MODEL,
                "messages": [
                    {"role": "system", "content": (
                        "You are evaluating an AI agent's system prompt. "
                        "Given the prompt and a past conversation, rate how well "
                        "the prompt would guide the agent to achieve the desired outcome. "
                        "Return ONLY a number between 0 and 1."
                    )},
                    {"role": "user", "content": (
                        f"## System Prompt to Evaluate\n{candidate}\n\n"
                        f"## Past Conversation\n{conversation}\n\n"
                        f"## Desired Outcome: {target_outcome}\n\n"
                        f"Score (0-1):"
                    )},
                ],
                "temperature": 0.0,
                "max_tokens": 10,
            },
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )

        try:
            score_text = resp.json()["choices"][0]["message"]["content"].strip()
            score = float(score_text.replace(",", "."))
            return max(0.0, min(1.0, score))
        except (ValueError, KeyError):
            oa.log(f"Failed to parse score: {score_text}")
            return 0.5

    # Run GEPA optimization
    config = GEPAConfig(
        engine=EngineConfig(
            max_metric_calls=GEPA_MAX_METRIC_CALLS,
            parallel=True,
            max_workers=4,
        ),
        reflection=ReflectionConfig(
            reflection_lm=GEPA_REFLECTION_LM,
            reflection_minibatch_size=2,
        ),
    )

    try:
        result = oa.optimize_anything(
            seed_candidate=current_prompt,
            evaluator=evaluate,
            dataset=trainset,
            valset=valset,
            objective=f"Optimize this AI agent system prompt to maximize {optimization_target}. "
                      "The agent handles customer conversations for restaurants/businesses. "
                      "Maintain the persona, tone, and brand voice while improving conversion.",
            background="This is a WhatsApp AI concierge for UAE/KSA businesses. "
                       "It needs to be warm, professional, and convert inquiries to bookings. "
                       "Arabic and English bilingual. Gulf cultural context.",
            config=config,
        )

        return {
            "evolved_prompt": result.best_candidate,
            "estimated_improvement": round((result.best_score - 0.5) * 200, 1),
            "method": "GEPA (full)",
            "metric_calls_used": GEPA_MAX_METRIC_CALLS,
        }
    except Exception as e:
        logger.error("GEPA optimization failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# Lightweight fallback — LLM-based prompt evolution
# ---------------------------------------------------------------------------

async def _evolve_lightweight(
    current_prompt: str,
    conversation_traces: list[dict],
    optimization_target: str,
) -> dict:
    """Lightweight prompt evolution using LLM analysis.

    No extra dependencies. Uses OpenRouter to:
    1. Analyze best/worst conversations
    2. Identify patterns in failures
    3. Generate 3 prompt variants
    4. Score variants against test conversations
    5. Return the best one
    """

    # --- Step 1: Separate best and worst conversations ---
    sorted_traces = sorted(
        conversation_traces,
        key=lambda t: t.get("satisfaction_score", 0.5),
    )

    worst_10 = sorted_traces[:10]
    best_10 = sorted_traces[-10:]

    # --- Step 2: Analyze patterns ---
    best_summary = json.dumps(
        [{"outcome": t.get("outcome"), "score": t.get("satisfaction_score"),
          "messages": t.get("messages", [])[:6]} for t in best_10],
        ensure_ascii=False, indent=2,
    )[:4000]

    worst_summary = json.dumps(
        [{"outcome": t.get("outcome"), "score": t.get("satisfaction_score"),
          "messages": t.get("messages", [])[:6]} for t in worst_10],
        ensure_ascii=False, indent=2,
    )[:4000]

    prompt_excerpt = current_prompt[:2000]

    analysis_prompt = f"""Analyze these conversation outcomes for an AI concierge agent.

## Optimization Target: {optimization_target}

## Current System Prompt (truncated)
{prompt_excerpt}

## 10 BEST Conversations (highest scores)
{best_summary}

## 10 WORST Conversations (lowest scores)
{worst_summary}

## Analysis Required
1. What patterns make the BEST conversations succeed?
2. What patterns make the WORST conversations fail?
3. What specific prompt changes would improve the failures?
4. What parts of the current prompt are already working well (keep them)?

Return your analysis as JSON:
{{
    "success_patterns": ["..."],
    "failure_patterns": ["..."],
    "recommended_changes": ["..."],
    "keep_unchanged": ["..."]
}}"""

    analysis_raw = await _llm_call(
        system="You are a prompt optimization expert. Analyze conversation data to improve AI agent prompts.",
        user=analysis_prompt,
        temperature=0.3,
    )

    # --- Step 3: Generate 3 prompt variants ---
    variants_prompt = f"""Based on this analysis, generate 3 improved versions of the system prompt.

## Analysis
{analysis_raw}

## Current System Prompt
{current_prompt}

## Rules
- Preserve the persona, brand voice, and core identity
- Preserve any client-specific details (business name, hours, menu items, etc.)
- Focus changes on: conversation flow, objection handling, conversion tactics, tone calibration
- Each variant should try a DIFFERENT strategy for improvement
- Keep the same overall structure and length
- Target: maximize {optimization_target}

Return as JSON:
{{
    "variants": [
        {{
            "id": 1,
            "strategy": "Description of what this variant changes",
            "prompt": "The full improved system prompt..."
        }},
        {{
            "id": 2,
            "strategy": "...",
            "prompt": "..."
        }},
        {{
            "id": 3,
            "strategy": "...",
            "prompt": "..."
        }}
    ]
}}"""

    variants_raw = await _llm_call(
        system="You are an expert prompt engineer for AI agents. Generate improved prompt variants.",
        user=variants_prompt,
        temperature=0.8,
        max_tokens=12000,
    )

    # Parse variants
    try:
        # Extract JSON from the response (handle markdown code blocks)
        json_str = variants_raw
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0]
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0]
        variants_data = json.loads(json_str)
        variants = variants_data.get("variants", [])
    except (json.JSONDecodeError, IndexError):
        logger.error("Failed to parse variants JSON, using raw output")
        variants = [{"id": 1, "strategy": "LLM-generated", "prompt": variants_raw}]

    if not variants:
        return {
            "evolved_prompt": current_prompt,
            "changes_made": ["No variants generated"],
            "estimated_improvement": 0.0,
            "cost": 0.0,
            "method": "lightweight (failed)",
        }

    # --- Step 4: Score each variant against test conversations ---
    test_convos = (worst_10[:3] + best_10[:3])  # Mix of good and bad
    variant_scores = []

    for variant in variants:
        prompt_text = variant.get("prompt", "")
        if not prompt_text or len(prompt_text) < 50:
            variant_scores.append(0.0)
            continue

        test_convos_json = json.dumps(
            [{"outcome": t.get("outcome"), "score": t.get("satisfaction_score"),
              "messages": t.get("messages", [])[:4]} for t in test_convos],
            ensure_ascii=False, indent=2,
        )[:3000]

        scoring_prompt = f"""Score this system prompt variant for an AI concierge agent.

## Prompt Variant
{prompt_text[:3000]}

## Test Conversations
{test_convos_json}

## Scoring Criteria ({optimization_target})
- Would this prompt have led to better outcomes in the failed conversations?
- Does it maintain quality in the already-successful conversations?
- Is the tone appropriate for Gulf Arab business context?
- Are the conversion tactics natural and non-pushy?

Return ONLY a JSON object: {{"score": 0.0-1.0, "reasoning": "brief explanation"}}"""

        score_raw = await _llm_call(
            system="You are evaluating AI agent prompts. Be objective and critical.",
            user=scoring_prompt,
            temperature=0.1,
            max_tokens=200,
        )

        try:
            score_str = score_raw
            if "```" in score_str:
                score_str = score_str.split("```")[1].split("```")[0]
                if score_str.startswith("json"):
                    score_str = score_str[4:]
            score_data = json.loads(score_str)
            variant_scores.append(float(score_data.get("score", 0.5)))
        except (json.JSONDecodeError, ValueError):
            variant_scores.append(0.5)

    # --- Step 5: Select the best variant ---
    if variant_scores:
        best_idx = variant_scores.index(max(variant_scores))
        best_variant = variants[best_idx]
        best_score = variant_scores[best_idx]
    else:
        best_variant = variants[0]
        best_score = 0.5

    # Parse analysis for changes_made
    changes_made = []
    try:
        analysis_str = analysis_raw
        if "```json" in analysis_str:
            analysis_str = analysis_str.split("```json")[1].split("```")[0]
        elif "```" in analysis_str:
            analysis_str = analysis_str.split("```")[1].split("```")[0]
        analysis_data = json.loads(analysis_str)
        changes_made = analysis_data.get("recommended_changes", [])
    except (json.JSONDecodeError, IndexError):
        changes_made = [best_variant.get("strategy", "LLM-optimized")]

    # Estimate cost (rough: ~3 LLM calls)
    estimated_cost = 0.03  # ~$0.01 per call with Claude Sonnet via OpenRouter

    return {
        "evolved_prompt": best_variant.get("prompt", current_prompt),
        "changes_made": changes_made,
        "estimated_improvement": round((best_score - 0.5) * 100, 1),
        "cost": estimated_cost,
        "method": "lightweight",
        "strategy": best_variant.get("strategy", ""),
        "all_scores": variant_scores,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def evolve_prompt(
    client_id: str,
    current_prompt: str,
    conversation_traces: list[dict],
    optimization_target: str = "booking_conversion",
) -> dict:
    """Run prompt optimization — tries full GEPA first, falls back to lightweight.

    Args:
        client_id: The client whose prompt to optimize
        current_prompt: The current system prompt text
        conversation_traces: List of conversation dicts with:
            - messages: list of message dicts
            - outcome: "booked" | "not_booked" | "inquiry" | etc.
            - satisfaction_score: 0.0 - 1.0
        optimization_target: What to optimize for:
            - "booking_conversion" — maximize bookings
            - "customer_satisfaction" — maximize satisfaction scores
            - "response_quality" — improve response naturalness/helpfulness

    Returns:
        {
            "evolved_prompt": str,        # The improved prompt
            "changes_made": [str],        # List of specific changes
            "estimated_improvement": float, # Expected improvement %
            "cost": float,                # Cost of the optimization run
            "method": str,                # "GEPA (full)" or "lightweight"
        }
    """
    if not conversation_traces:
        return {
            "evolved_prompt": current_prompt,
            "changes_made": [],
            "estimated_improvement": 0.0,
            "cost": 0.0,
            "method": "skipped (no traces)",
        }

    # Try full GEPA first
    result = await _evolve_with_gepa(
        current_prompt, conversation_traces, optimization_target
    )
    if result:
        return result

    # Fall back to lightweight
    logger.info("Using lightweight prompt evolution (GEPA not available)")
    return await _evolve_lightweight(
        current_prompt, conversation_traces, optimization_target
    )


async def run_evolution_cycle(client_id: str) -> dict:
    """Run a full evolution cycle for a client.

    End-to-end pipeline:
    1. Pull recent conversations from Supabase
    2. Extract traces with outcomes (booked / not booked)
    3. Run GEPA or lightweight optimization
    4. Save the evolved prompt as a candidate variant
    5. Return results for human review before applying

    Args:
        client_id: The client to optimize

    Returns:
        {
            "evolved_prompt": str,
            "changes_made": [str],
            "estimated_improvement": float,
            "variant_id": str,      # Saved variant for A/B testing
            "conversations_analyzed": int,
            "cost": float,
        }
    """
    logger.info("Starting evolution cycle for client=%s", client_id)

    # 1. Fetch current prompt
    current_prompt = await _fetch_current_prompt(client_id)
    if not current_prompt:
        return {"error": f"No system prompt found for client {client_id}"}

    # 2. Fetch recent conversations
    conversations = await _fetch_conversations(client_id, limit=100)
    if not conversations:
        return {"error": f"No conversations found for client {client_id}"}

    logger.info("Fetched %d conversations for analysis", len(conversations))

    # 3. Run evolution
    result = await evolve_prompt(
        client_id=client_id,
        current_prompt=current_prompt,
        conversation_traces=conversations,
        optimization_target="booking_conversion",
    )

    # 4. Save as candidate variant (for human review + A/B testing)
    variant_id = ""
    if result.get("evolved_prompt") and result["evolved_prompt"] != current_prompt:
        try:
            variant_id = await _save_prompt_variant(
                client_id=client_id,
                prompt=result["evolved_prompt"],
                metadata={
                    "changes_made": result.get("changes_made", []),
                    "estimated_improvement": result.get("estimated_improvement", 0),
                    "method": result.get("method", "unknown"),
                    "conversations_analyzed": len(conversations),
                    "created_by": "prompt_evolution",
                },
            )
            logger.info("Saved prompt variant %s for A/B testing", variant_id)
        except Exception as e:
            logger.error("Failed to save variant: %s", e)

    return {
        "evolved_prompt": result.get("evolved_prompt", ""),
        "changes_made": result.get("changes_made", []),
        "estimated_improvement": result.get("estimated_improvement", 0),
        "variant_id": variant_id,
        "conversations_analyzed": len(conversations),
        "cost": result.get("cost", 0),
        "method": result.get("method", "unknown"),
    }


async def compare_prompts(
    client_id: str,
    prompt_a: str,
    prompt_b: str,
    test_scenarios: Optional[list[dict]] = None,
) -> dict:
    """Compare two prompts head-to-head on test scenarios.

    Args:
        client_id: Client context
        prompt_a: First prompt (usually current)
        prompt_b: Second prompt (usually evolved)
        test_scenarios: Optional list of test conversations. If None,
                        pulls recent conversations from Supabase.

    Returns:
        {
            "winner": "A" | "B" | "tie",
            "score_a": float,
            "score_b": float,
            "details": [{"scenario": str, "score_a": float, "score_b": float}]
        }
    """
    if not test_scenarios:
        test_scenarios = await _fetch_conversations(client_id, limit=20)

    if not test_scenarios:
        return {"error": "No test scenarios available"}

    scenarios_json = json.dumps(
        [{"outcome": t.get("outcome"), "messages": t.get("messages", [])[:4]}
         for t in test_scenarios[:10]],
        ensure_ascii=False, indent=2,
    )[:4000]

    comparison_prompt = f"""Compare these two system prompts for an AI concierge agent.

## Prompt A
{prompt_a[:3000]}

## Prompt B
{prompt_b[:3000]}

{scenarios_json}

For each scenario, score both prompts (0-1) on:
1. Would it handle the conversation better?
2. Would it convert more inquiries to bookings?
3. Is the tone appropriate for Gulf Arab context?

Return JSON:
{{
    "winner": "A" or "B" or "tie",
    "score_a": 0.0-1.0,
    "score_b": 0.0-1.0,
    "reasoning": "brief explanation"
}}"""

    result_raw = await _llm_call(
        system="You are an objective AI prompt evaluator.",
        user=comparison_prompt,
        temperature=0.1,
    )

    try:
        result_str = result_raw
        if "```" in result_str:
            result_str = result_str.split("```")[1].split("```")[0]
            if result_str.startswith("json"):
                result_str = result_str[4:]
        return json.loads(result_str)
    except (json.JSONDecodeError, ValueError):
        return {"winner": "unknown", "raw_response": result_raw}


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    async def _main():
        if len(sys.argv) < 2:
            print("Usage: python prompt_evolution.py <client_id>")
            print("       python prompt_evolution.py test")
            return

        if sys.argv[1] == "test":
            # Demo with synthetic data
            test_prompt = """You are Nadia, an AI concierge for Saffron Restaurant.
You help customers make reservations, answer menu questions, and provide
information about the restaurant. Be warm, professional, and culturally
aware of Gulf Arab dining customs."""

            test_traces = [
                {
                    "messages": [
                        {"role": "user", "content": "Hi, do you have a table for tonight?"},
                        {"role": "assistant", "content": "Hello! I'd be happy to help. How many guests?"},
                        {"role": "user", "content": "4 people"},
                        {"role": "assistant", "content": "I have a lovely table for 4 at 8pm. Shall I book it?"},
                        {"role": "user", "content": "Yes please"},
                    ],
                    "outcome": "booked",
                    "satisfaction_score": 0.9,
                },
                {
                    "messages": [
                        {"role": "user", "content": "What's the price range?"},
                        {"role": "assistant", "content": "Our mains range from 45-120 AED."},
                        {"role": "user", "content": "That's expensive"},
                        {"role": "assistant", "content": "I understand. We also have set menus starting at 85 AED."},
                        {"role": "user", "content": "I'll think about it"},
                    ],
                    "outcome": "not_booked",
                    "satisfaction_score": 0.4,
                },
            ]

            print("Running lightweight prompt evolution (test mode)...")
            result = await evolve_prompt(
                client_id="test",
                current_prompt=test_prompt,
                conversation_traces=test_traces * 5,  # Duplicate for volume
                optimization_target="booking_conversion",
            )

            print(f"\nMethod: {result['method']}")
            print(f"Estimated improvement: {result['estimated_improvement']}%")
            print(f"Cost: ${result['cost']:.3f}")
            print(f"\nChanges made:")
            for change in result.get("changes_made", []):
                print(f"  - {change}")
            print(f"\nEvolved prompt (first 500 chars):")
            print(result["evolved_prompt"][:500])
        else:
            client_id = sys.argv[1]
            print(f"Running evolution cycle for client: {client_id}")
            result = await run_evolution_cycle(client_id)
            print(json.dumps(result, indent=2, ensure_ascii=False))

    asyncio.run(_main())
