"""Karpathy Loop v2 — Self-Improvement Engine

Runs nightly per client:
1. Pull today's conversations from Supabase
2. Tag outcomes: booked / ghosted / complained
3. Find patterns: what converted, what didn't
4. Generate behavioral rules via AI
5. CONFLICT RESOLUTION — detect contradictions with existing rules
6. Apply rules to prompt (with performance baseline)
7. RULE VERIFICATION — measure impact, revert bad rules after 3 days
8. RULE BLOAT CONTROL — merge similar, expire stale, strict schema
"""

import os
import json
import re
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Ynpxa3RpcGltYm11anRvd296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwOTY5NCwiZXhwIjoyMDkwMDg1Njk0fQ.-DoNS5fZv3aUsFcugKg23yh9RqXXFIlgc5_9Hrk97bg")
_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}
_MINIMAX_KEY = os.environ.get("MINIMAX_API_KEY", "")

# ═══════════════════════════════════════════════════════
# RULE SCHEMA — strict format for all learned rules
# ═══════════════════════════════════════════════════════

# Each rule MUST follow this schema:
# {
#   "rule": str,           # The behavioral instruction (20-120 chars)
#   "added": str,          # ISO date when added
#   "reason": str,         # Why this rule was generated
#   "status": str,         # "active" | "probation" | "verified" | "reverted" | "expired" | "merged"
#   "metrics_at_add": dict | None,  # Snapshot of key metrics when rule was added
#   "metrics_after": dict | None,   # Snapshot after 3 days (for verification)
#   "expires_at": str | None,       # ISO date — auto-expire if no improvement
#   "parent_rules": list | None,    # If merged, which rules this replaced
# }

MAX_ACTIVE_RULES = 10
PROBATION_DAYS = 3
EXPIRY_DAYS = 7


def _make_rule(rule_text: str, reason: str, metrics: dict = None) -> dict:
    """Create a properly formatted rule object."""
    now = datetime.now(timezone.utc)
    return {
        "rule": rule_text[:120].strip(),
        "added": now.strftime("%Y-%m-%d"),
        "reason": reason[:200],
        "status": "probation",
        "metrics_at_add": metrics,
        "metrics_after": None,
        "expires_at": (now + timedelta(days=EXPIRY_DAYS)).strftime("%Y-%m-%d"),
        "parent_rules": None,
    }


def _migrate_old_rule(old_rule: dict) -> dict:
    """Migrate old-format rules to new schema."""
    if "status" in old_rule:
        return old_rule
    return {
        "rule": old_rule.get("rule", ""),
        "added": old_rule.get("added", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "reason": old_rule.get("reason", "legacy"),
        "status": "verified",  # Old rules are grandfathered as verified
        "metrics_at_add": old_rule.get("performance_at_add"),
        "metrics_after": None,
        "expires_at": None,
        "parent_rules": None,
    }


# ═══════════════════════════════════════════════════════
# DATA COLLECTION
# ═══════════════════════════════════════════════════════

async def get_todays_conversations(client_id: str) -> dict:
    """Get all conversation messages from today, grouped by customer."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/conversation_messages?client_id=eq.{client_id}&created_at=gte.{today}T00:00:00Z&select=customer_phone,direction,content,created_at&order=created_at.asc",
            headers=_SUPA_HEADERS,
        )
        messages = r.json() if r.status_code == 200 else []

    conversations = {}
    for msg in messages:
        phone = msg.get("customer_phone", "")
        if phone not in conversations:
            conversations[phone] = []
        conversations[phone].append({
            "direction": msg.get("direction", ""),
            "content": msg.get("content", ""),
        })

    return conversations


async def analyze_conversations(conversations: dict) -> dict:
    """Analyze conversation transcripts for patterns."""
    total_convos = len(conversations)
    total_messages = sum(len(msgs) for msgs in conversations.values())

    patterns = {
        "total_conversations": total_convos,
        "total_messages": total_messages,
        "avg_messages_per_convo": round(total_messages / max(total_convos, 1), 1),
        "short_convos": 0,
        "long_convos": 0,
        "customer_questions": [],
        "unanswered_needs": [],
        "successful_patterns": [],
        "drop_off_points": [],
    }

    for phone, msgs in conversations.items():
        msg_count = len(msgs)
        if msg_count <= 2:
            patterns["short_convos"] += 1
        elif msg_count >= 6:
            patterns["long_convos"] += 1

        last_customer = ""
        for msg in reversed(msgs):
            if msg["direction"] == "inbound":
                last_customer = msg["content"]
                break
        if last_customer and msg_count <= 3:
            patterns["drop_off_points"].append(last_customer[:100])

        for msg in msgs:
            if msg["direction"] == "inbound" and "?" in msg["content"]:
                patterns["customer_questions"].append(msg["content"][:100])

    patterns["drop_off_points"] = patterns["drop_off_points"][:10]
    patterns["customer_questions"] = patterns["customer_questions"][:10]

    return patterns


async def get_todays_bookings(client_id: str) -> list:
    """Get all bookings created or updated today."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/active_bookings?client_id=eq.{client_id}&created_at=gte.{today}T00:00:00Z&select=*&order=created_at.desc",
            headers=_SUPA_HEADERS,
        )
        return r.json() if r.status_code == 200 else []


async def analyze_outcomes(bookings: list) -> dict:
    """Tag each booking with an outcome."""
    outcomes = {
        "completed": 0,
        "confirmed": 0,
        "collecting": 0,
        "abandoned": 0,
        "cancelled": 0,
    }

    patterns = {
        "with_occasion": 0,
        "with_dietary": 0,
        "with_name": 0,
        "without_name": 0,
        "large_party": 0,
        "couple": 0,
    }

    now = datetime.now(timezone.utc)

    for b in bookings:
        status = b.get("status", "collecting")

        if status == "confirmed":
            outcomes["confirmed"] += 1
        elif status == "cancelled":
            outcomes["cancelled"] += 1
        elif status == "collecting":
            last_update = b.get("last_updated_at", "")
            if last_update:
                try:
                    updated = datetime.fromisoformat(last_update.replace("Z", "+00:00"))
                    if (now - updated).total_seconds() > 7200:
                        outcomes["abandoned"] += 1
                    else:
                        outcomes["collecting"] += 1
                except:
                    outcomes["collecting"] += 1
            else:
                outcomes["collecting"] += 1

        has_name = bool(b.get("guest_name"))
        has_time = bool(b.get("booking_time"))
        has_date = bool(b.get("booking_date"))
        has_party = bool(b.get("party_size"))

        if has_name and has_time and has_date and has_party:
            outcomes["completed"] += 1

        if b.get("occasion"):
            patterns["with_occasion"] += 1
        if b.get("dietary_notes"):
            patterns["with_dietary"] += 1
        if has_name:
            patterns["with_name"] += 1
        else:
            patterns["without_name"] += 1

        ps = b.get("party_size")
        if ps and ps >= 6:
            patterns["large_party"] += 1
        elif ps and ps == 2:
            patterns["couple"] += 1

    return {"outcomes": outcomes, "patterns": patterns, "total": len(bookings)}


# ═══════════════════════════════════════════════════════
# PERFORMANCE METRICS — baseline for rule verification
# ═══════════════════════════════════════════════════════

async def get_performance_snapshot(client_id: str, days: int = 1) -> dict:
    """Get key performance metrics for the last N days."""
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days)).isoformat()

    metrics = {
        "period_days": days,
        "total_conversations": 0,
        "total_bookings": 0,
        "confirmed_bookings": 0,
        "abandoned_bookings": 0,
        "conversion_rate": 0.0,
        "avg_messages_per_convo": 0.0,
        "name_collection_rate": 0.0,
        "measured_at": now.isoformat(),
    }

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            # Conversations
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/conversation_messages?client_id=eq.{client_id}&direction=eq.inbound&created_at=gte.{start}&select=customer_phone",
                headers=_SUPA_HEADERS,
            )
            msgs = r.json() if r.status_code == 200 else []
            unique_phones = set(m.get("customer_phone", "") for m in msgs)
            metrics["total_conversations"] = len(unique_phones)
            metrics["avg_messages_per_convo"] = round(len(msgs) / max(len(unique_phones), 1), 1)

            # Bookings
            r2 = await http.get(
                f"{_SUPA_URL}/rest/v1/active_bookings?client_id=eq.{client_id}&created_at=gte.{start}&select=status,guest_name",
                headers=_SUPA_HEADERS,
            )
            bookings = r2.json() if r2.status_code == 200 else []
            metrics["total_bookings"] = len(bookings)
            metrics["confirmed_bookings"] = sum(1 for b in bookings if b.get("status") == "confirmed")
            metrics["abandoned_bookings"] = sum(1 for b in bookings if b.get("status") == "collecting")

            with_name = sum(1 for b in bookings if b.get("guest_name"))
            metrics["name_collection_rate"] = round(with_name / max(len(bookings), 1) * 100, 1)

            if metrics["total_conversations"] > 0:
                metrics["conversion_rate"] = round(
                    metrics["confirmed_bookings"] / metrics["total_conversations"] * 100, 1
                )
    except:
        pass

    return metrics


# ═══════════════════════════════════════════════════════
# CONFLICT RESOLUTION
# ═══════════════════════════════════════════════════════

# Antonym pairs for conflict detection
_CONFLICT_PAIRS = [
    (["always", "every", "must"], ["never", "don't", "avoid", "لا ت"]),
    (["immediately", "right away", "first"], ["wait", "delay", "after", "later", "بعد"]),
    (["ask", "ask for", "request", "اسأل", "اطلب"], ["don't ask", "skip", "omit", "لا تسأل"]),
    (["upsell", "suggest", "recommend", "offer", "قدم"], ["don't upsell", "don't suggest", "don't push", "لا تقدم"]),
    (["formal", "professional"], ["casual", "relaxed", "friendly"]),
    (["short", "brief", "concise"], ["detailed", "thorough", "comprehensive"]),
]


def _extract_topic(rule_text: str) -> str:
    """Extract the core topic/action from a rule for comparison."""
    # Remove common prefixes
    text = re.sub(r'^(always|never|if|when|after|before|don\'t|do not)\s+', '', rule_text.lower().strip())
    # Remove filler
    text = re.sub(r'\b(the|a|an|is|are|to|for|in|on|with|that)\b', '', text)
    # Keep first 5 meaningful words
    words = [w for w in text.split() if len(w) > 2][:5]
    return " ".join(words)


def detect_conflicts(new_rule: str, existing_rules: list) -> list:
    """Check if a new rule conflicts with any existing rules."""
    conflicts = []
    new_lower = new_rule.lower()

    for existing in existing_rules:
        if existing.get("status") in ("reverted", "expired", "merged"):
            continue

        ex_lower = existing["rule"].lower()

        # 1. Check antonym pairs
        for positives, negatives in _CONFLICT_PAIRS:
            new_has_pos = any(p in new_lower for p in positives)
            new_has_neg = any(n in new_lower for n in negatives)
            ex_has_pos = any(p in ex_lower for p in positives)
            ex_has_neg = any(n in ex_lower for n in negatives)

            # Same topic but opposite polarity
            if (new_has_pos and ex_has_neg) or (new_has_neg and ex_has_pos):
                # Check topic overlap (at least 2 shared words)
                new_words = set(new_lower.split())
                ex_words = set(ex_lower.split())
                shared = new_words & ex_words - {"the", "a", "an", "to", "for", "in", "on", "is", "are", "and", "or"}
                if len(shared) >= 2:
                    conflicts.append({
                        "existing_rule": existing["rule"],
                        "conflict_type": "antonym",
                        "shared_words": list(shared),
                    })

        # 2. Check near-duplicates (high word overlap)
        new_words = set(w for w in new_lower.split() if len(w) > 3)
        ex_words = set(w for w in ex_lower.split() if len(w) > 3)
        if new_words and ex_words:
            overlap = len(new_words & ex_words) / min(len(new_words), len(ex_words))
            if overlap >= 0.6:
                conflicts.append({
                    "existing_rule": existing["rule"],
                    "conflict_type": "duplicate",
                    "overlap": round(overlap, 2),
                })

    return conflicts


def resolve_conflict(new_rule: str, conflicting_rule: dict, conflict_type: str) -> str:
    """Decide what to do with a conflict. Returns: 'keep_new', 'keep_old', 'merge'."""
    # Newer rules take precedence (they're based on more recent data)
    if conflict_type == "antonym":
        return "keep_new"
    elif conflict_type == "duplicate":
        # If nearly identical, keep the existing one (it may already be verified)
        if conflicting_rule.get("status") == "verified":
            return "keep_old"
        return "keep_new"
    return "keep_new"


# ═══════════════════════════════════════════════════════
# RULE VERIFICATION — measure if rules improved metrics
# ═══════════════════════════════════════════════════════

async def verify_rules(client_id: str, rules: list) -> list:
    """Check rules on probation — did they improve metrics?

    Rules enter as 'probation'. After PROBATION_DAYS:
    - If metrics improved: status → 'verified'
    - If metrics worsened: status → 'reverted'
    - If no data: extend probation by 2 days (once)
    """
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")

    # Get current performance
    current_metrics = await get_performance_snapshot(client_id, days=PROBATION_DAYS)

    updated_rules = []
    for rule in rules:
        rule = _migrate_old_rule(rule)

        if rule["status"] != "probation":
            updated_rules.append(rule)
            continue

        # Check if probation period has elapsed
        try:
            added_date = datetime.strptime(rule["added"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            days_active = (now - added_date).days
        except:
            days_active = 0

        if days_active < PROBATION_DAYS:
            updated_rules.append(rule)
            continue

        # Compare metrics
        baseline = rule.get("metrics_at_add") or {}
        rule["metrics_after"] = current_metrics

        baseline_rate = baseline.get("conversion_rate", 0)
        current_rate = current_metrics.get("conversion_rate", 0)
        baseline_name_rate = baseline.get("name_collection_rate", 0)
        current_name_rate = current_metrics.get("name_collection_rate", 0)

        # Not enough data — extend probation once
        if current_metrics.get("total_conversations", 0) < 3:
            if days_active < PROBATION_DAYS + 2:
                updated_rules.append(rule)
                continue
            # Still no data after extension — expire
            rule["status"] = "expired"
            print(f"[karpathy] Expired (no data): {rule['rule'][:60]}")
            updated_rules.append(rule)
            continue

        # Decision: did metrics improve or at least not worsen?
        improved = False
        worsened = False

        if baseline_rate > 0:
            change = current_rate - baseline_rate
            if change >= 2:  # 2 percentage point improvement
                improved = True
            elif change <= -5:  # 5 point decline
                worsened = True
        else:
            # No baseline — just check if current is reasonable
            improved = current_rate > 0

        if worsened:
            rule["status"] = "reverted"
            print(f"[karpathy] REVERTED (metrics declined): {rule['rule'][:60]}")
            print(f"[karpathy]   baseline={baseline_rate}%, current={current_rate}%")
        else:
            rule["status"] = "verified"
            print(f"[karpathy] VERIFIED: {rule['rule'][:60]}")

        updated_rules.append(rule)

    return updated_rules


# ═══════════════════════════════════════════════════════
# RULE BLOAT CONTROL — merge, expire, deduplicate
# ═══════════════════════════════════════════════════════

async def control_bloat(client_id: str, rules: list) -> list:
    """Manage rule bloat: merge similar, expire stale, enforce limits."""

    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")

    # 1. Expire old rules that haven't proven value
    active_rules = []
    for rule in rules:
        rule = _migrate_old_rule(rule)

        # Skip already dead rules
        if rule["status"] in ("reverted", "expired", "merged"):
            continue

        # Check expiry
        if rule.get("expires_at"):
            try:
                exp = datetime.strptime(rule["expires_at"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                if now > exp and rule["status"] != "verified":
                    rule["status"] = "expired"
                    print(f"[karpathy] Expired: {rule['rule'][:60]}")
                    continue
            except:
                pass

        active_rules.append(rule)

    # 2. Merge similar rules (>60% word overlap)
    merged_rules = []
    skip_indices = set()

    for i, rule_a in enumerate(active_rules):
        if i in skip_indices:
            continue

        words_a = set(w.lower() for w in rule_a["rule"].split() if len(w) > 3)
        merged_with = []

        for j, rule_b in enumerate(active_rules):
            if j <= i or j in skip_indices:
                continue

            words_b = set(w.lower() for w in rule_b["rule"].split() if len(w) > 3)
            if not words_a or not words_b:
                continue

            overlap = len(words_a & words_b) / min(len(words_a), len(words_b))
            if overlap >= 0.6:
                merged_with.append(j)
                skip_indices.add(j)

        if merged_with:
            # Keep the longest/most detailed version
            candidates = [rule_a] + [active_rules[j] for j in merged_with]
            best = max(candidates, key=lambda r: len(r["rule"]))
            best["status"] = "verified" if any(r["status"] == "verified" for r in candidates) else best["status"]
            best["parent_rules"] = [r["rule"][:60] for r in candidates if r["rule"] != best["rule"]]
            merged_rules.append(best)
            print(f"[karpathy] Merged {len(candidates)} rules → {best['rule'][:60]}")
        else:
            merged_rules.append(rule_a)

    # 3. Enforce max limit — keep verified first, then by recency
    if len(merged_rules) > MAX_ACTIVE_RULES:
        verified = [r for r in merged_rules if r["status"] == "verified"]
        others = [r for r in merged_rules if r["status"] != "verified"]
        others.sort(key=lambda r: r.get("added", ""), reverse=True)
        merged_rules = (verified + others)[:MAX_ACTIVE_RULES]
        print(f"[karpathy] Trimmed to {MAX_ACTIVE_RULES} rules (had {len(verified) + len(others)})")

    return merged_rules


# ═══════════════════════════════════════════════════════
# AI GENERATION — suggestions + prompt patches
# ═══════════════════════════════════════════════════════

async def generate_improvement_suggestions(client_id: str, analysis: dict, kb: dict) -> str:
    """Use AI to suggest prompt improvements based on conversation patterns."""
    if not _MINIMAX_KEY or analysis["total"] == 0:
        return "Not enough data for suggestions yet."

    cd = kb.get("crawl_data", {})
    lang = "ar" if len(re.findall(r'[\u0600-\u06FF]', kb.get("brand_voice", ""))) > len(re.findall(r'[a-zA-Z]', kb.get("brand_voice", ""))) else "en"
    prompt_lang = "Respond in Arabic" if lang == "ar" else "Respond in English"
    data_summary = json.dumps(analysis, ensure_ascii=False, indent=2)

    try:
        async with httpx.AsyncClient(timeout=90) as http:
            r = await http.post(
                "https://api.minimax.io/v1/chat/completions",
                headers={"Authorization": f"Bearer {_MINIMAX_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "MiniMax-M2.7",
                    "messages": [
                        {"role": "system", "content": f"You are an AI performance analyst. Analyze booking/order data and suggest specific improvements to the AI agent's behavior. {prompt_lang}. Be specific and actionable. Focus on: conversion rate, drop-offs, missing data collection, and customer experience."},
                        {"role": "user", "content": f"Here is today's performance data:\n{data_summary}\n\nBased on this data:\n1. What is working well?\n2. What needs improvement?\n3. Suggest 3 specific changes to the AI's conversation style or flow that would improve results.\n4. Are there any patterns the AI should learn from?"},
                    ],
                    "max_tokens": 800,
                },
            )
            content = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            content = re.sub(r"<think>[\s\S]*?</think>\s*", "", content).strip()
            if not content and "<think>" in r.json().get("choices", [{}])[0].get("message", {}).get("content", ""):
                content = re.sub(r"</?think>", "", r.json()["choices"][0]["message"]["content"]).strip()
            content = re.sub(r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u0400-\u04ff]+', '', content)
            return content or "Analysis completed but no suggestions generated."
    except Exception as e:
        return f"Analysis failed: {e}"


async def save_learning(client_id: str, analysis: dict, suggestions: str):
    """Save the learning to Supabase activity_logs."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            await http.post(
                f"{_SUPA_URL}/rest/v1/activity_logs",
                headers=_SUPA_HEADERS,
                json={
                    "client_id": client_id,
                    "event_type": "karpathy_loop",
                    "payload": {
                        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                        "analysis": analysis,
                        "suggestions": suggestions,
                    },
                },
            )
    except Exception as e:
        print(f"[karpathy] Failed to save learning: {e}")


async def generate_prompt_patch(client_id: str, analysis: dict, kb: dict) -> dict:
    """Generate a specific prompt patch — actual changes to apply."""
    if not _MINIMAX_KEY or analysis["total"] == 0:
        return {"action": "none", "reason": "No data"}

    cd = kb.get("crawl_data", {})
    current_persona = cd.get("persona", {}).get("voice_prompt", "")
    current_goals = cd.get("conversation_goals", {})
    lang = "ar" if len(re.findall(r'[\u0600-\u06FF]', kb.get("brand_voice", ""))) > len(re.findall(r'[a-zA-Z]', kb.get("brand_voice", ""))) else "en"

    # Include existing rules so AI knows what's already there
    existing_rules = cd.get("learned_rules", [])
    existing_rules_text = "\n".join(f"- {r.get('rule', r) if isinstance(r, dict) else r}" for r in existing_rules[-5:])

    data_summary = json.dumps(analysis, ensure_ascii=False)

    try:
        async with httpx.AsyncClient(timeout=90) as http:
            r = await http.post(
                "https://api.minimax.io/v1/chat/completions",
                headers={"Authorization": f"Bearer {_MINIMAX_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "MiniMax-M2.7",
                    "messages": [
                        {"role": "system", "content": f"""You are an AI prompt engineer. Based on performance data, generate SPECIFIC conversation rules to improve booking/order completion.

IMPORTANT: Do NOT use <think> tags. Output ONLY a JSON object. Nothing else.

EXISTING RULES (do NOT repeat these or generate contradictions):
{existing_rules_text or "(none yet)"}

Format:
{{"add_rules": ["rule 1", "rule 2", "rule 3"], "reason": "brief why"}}

Rules must be behavioral instructions like:
- "Always ask for the customer's name in your first reply"
- "If party size is missing after 2 messages, ask directly"
- "Confirm booking details after collecting 3 required fields"

NOT data summaries. NOT analysis. NOT duplicates of existing rules. Just NEW rules. Max 3.
{"Rules in Arabic." if lang == "ar" else "Rules in English."}"""},
                        {"role": "user", "content": f"Performance data:\n{data_summary}\n\nSample transcripts:\n{chr(10).join(analysis.get('sample_transcripts', [])[:3])}\n\nDrop-off points:\n{chr(10).join(analysis.get('conversation_patterns', {}).get('drop_off_points', []))}\n\nCustomer questions:\n{chr(10).join(analysis.get('conversation_patterns', {}).get('customer_questions', []))}\n\nWhat specific NEW rules should be added?"},
                    ],
                    "max_tokens": 500,
                },
            )
            raw = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            content = re.sub(r"<think>[\s\S]*?</think>\s*", "", raw).strip()
            if not content and "<think>" in raw:
                content = re.sub(r"</?think>", "", raw).strip()
            content = re.sub(r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u0400-\u04ff]+', '', content)
            print(f"[karpathy] Patch content: {content[:100]}")

            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    print(f"[karpathy] Invalid JSON in patch: {json_match.group()[:200]}")

            if content:
                rules = re.findall(r'[-•]\s*(.+?)(?:\n|$)', content)
                behavioral_rules = []
                for rule in rules:
                    rule = rule.strip().strip('"').strip("'")
                    data_words = ['total', 'only', 'rate', '%', 'conversations', 'completed', 'confirmed', 'abandoned', 'collecting', 'bookings', '/']
                    if any(w in rule.lower() for w in data_words):
                        continue
                    if len(rule) < 20:
                        continue
                    action_words = ['ask', 'always', 'never', 'after', 'before', 'if', 'when', 'use', 'confirm', 'suggest', 'offer', 'اسأل', 'اطلب', 'بعد', 'قبل', 'لا ت', 'دائم']
                    if any(w in rule.lower() for w in action_words):
                        behavioral_rules.append(rule)

                if behavioral_rules:
                    return {"add_rules": behavioral_rules[:3], "reason": "Extracted from conversation analysis"}

    except Exception as e:
        print(f"[karpathy] Prompt patch generation failed: {e}")

    return {"action": "none", "reason": "Generation failed"}


# ═══════════════════════════════════════════════════════
# APPLY RULES — with conflict resolution + metrics baseline
# ═══════════════════════════════════════════════════════

async def apply_prompt_patch(client_id: str, patch: dict, kb: dict) -> dict:
    """Apply the prompt patch with conflict resolution and performance tracking.

    Returns: {applied: int, conflicts_resolved: int, duplicates_skipped: int}
    """
    if not patch.get("add_rules"):
        return {"applied": 0}

    cd = kb.get("crawl_data", {})
    learned_rules = [_migrate_old_rule(r) for r in cd.get("learned_rules", [])]

    # Get current metrics as baseline for new rules
    metrics = await get_performance_snapshot(client_id, days=1)

    result = {"applied": 0, "conflicts_resolved": 0, "duplicates_skipped": 0}

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    data_words = ['total', 'only', 'rate', '%', 'conversations', 'completed', 'confirmed', 'abandoned', 'collecting', 'bookings']

    for rule_text in patch.get("add_rules", []):
        # Basic validation
        if any(w in rule_text.lower() for w in data_words) and len(rule_text) < 80:
            print(f"[karpathy] Rejected data summary: {rule_text[:60]}")
            continue
        if len(rule_text) < 20:
            continue

        # Conflict check
        conflicts = detect_conflicts(rule_text, learned_rules)

        if conflicts:
            for conflict in conflicts:
                if conflict["conflict_type"] == "duplicate":
                    print(f"[karpathy] Skipped duplicate: {rule_text[:60]}")
                    result["duplicates_skipped"] += 1
                    break  # Skip this rule entirely
                elif conflict["conflict_type"] == "antonym":
                    resolution = resolve_conflict(rule_text, conflict, "antonym")
                    if resolution == "keep_new":
                        # Mark the old conflicting rule as reverted
                        for existing in learned_rules:
                            if existing["rule"] == conflict["existing_rule"]:
                                existing["status"] = "reverted"
                                print(f"[karpathy] Resolved conflict: reverted '{existing['rule'][:40]}' in favor of '{rule_text[:40]}'")
                        result["conflicts_resolved"] += 1
                    elif resolution == "keep_old":
                        print(f"[karpathy] Kept existing rule over new: {rule_text[:60]}")
                        continue
            else:
                # No blocking conflicts (only antonyms were resolved)
                if any(c["conflict_type"] == "duplicate" for c in conflicts):
                    continue

        # Add the new rule with schema + metrics baseline
        new_rule = _make_rule(rule_text, patch.get("reason", ""), metrics)
        learned_rules.append(new_rule)
        result["applied"] += 1
        print(f"[karpathy] Added rule (probation): {rule_text[:60]}")

    # Run bloat control
    learned_rules = await control_bloat(client_id, learned_rules)

    # Save to Supabase
    cd["learned_rules"] = learned_rules
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            await http.patch(
                f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}",
                headers=_SUPA_HEADERS,
                json={"crawl_data": cd},
            )
            print(f"[karpathy] Saved {len(learned_rules)} rules for {client_id}")
    except Exception as e:
        print(f"[karpathy] Failed to save: {e}")

    return result


# ═══════════════════════════════════════════════════════
# MAIN LOOP — orchestrates everything
# ═══════════════════════════════════════════════════════

async def run_karpathy_loop(client_id: str) -> dict:
    """Run the full Karpathy Loop v2 — analyze, verify, resolve, apply, log."""
    print(f"[karpathy] Running v2 for client {client_id}")

    # Get today's bookings
    bookings = await get_todays_bookings(client_id)
    if not bookings:
        return {"client_id": client_id, "status": "no_data", "message": "No bookings today"}

    # Analyze outcomes
    analysis = await analyze_outcomes(bookings)

    # Analyze conversations
    conversations = await get_todays_conversations(client_id)
    convo_analysis = await analyze_conversations(conversations)
    analysis["conversation_patterns"] = convo_analysis

    # Build sample transcripts
    sample_transcripts = []
    for phone, msgs in list(conversations.items())[:5]:
        transcript = "\n".join(f"{'Customer' if m['direction']=='inbound' else 'AI'}: {m['content'][:150]}" for m in msgs[:10])
        sample_transcripts.append(transcript)
    analysis["sample_transcripts"] = sample_transcripts

    # Get KB
    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}&select=*",
            headers=_SUPA_HEADERS,
        )
        kb = r.json()[0] if r.json() else {}

    cd = kb.get("crawl_data", {})

    # ── STEP 1: Verify existing rules on probation ──
    existing_rules = [_migrate_old_rule(r) for r in cd.get("learned_rules", [])]
    verified_rules = await verify_rules(client_id, existing_rules)

    # Count changes from verification
    verified_count = sum(1 for r in verified_rules if r["status"] == "verified" and
                         any(er.get("status") == "probation" for er in existing_rules if er.get("rule") == r["rule"]))
    reverted_count = sum(1 for r in verified_rules if r["status"] == "reverted")

    # Update KB with verified rules before generating new ones
    cd["learned_rules"] = verified_rules
    kb["crawl_data"] = cd

    # ── STEP 2: Generate AI suggestions ──
    suggestions = await generate_improvement_suggestions(client_id, analysis, kb)

    # ── STEP 3: Generate + apply new rules (with conflict resolution) ──
    patch = await generate_prompt_patch(client_id, analysis, kb)
    apply_result = {"applied": 0}
    if patch.get("add_rules"):
        apply_result = await apply_prompt_patch(client_id, patch, kb)

    # ── STEP 4: Save learning log ──
    await save_learning(client_id, analysis, suggestions)

    # Count final rule states
    final_kb = kb.get("crawl_data", {})
    final_rules = final_kb.get("learned_rules", [])
    rule_stats = {
        "total": len(final_rules),
        "active": sum(1 for r in final_rules if r.get("status") in ("active", "probation", "verified")),
        "probation": sum(1 for r in final_rules if r.get("status") == "probation"),
        "verified": sum(1 for r in final_rules if r.get("status") == "verified"),
        "reverted": reverted_count,
    }

    return {
        "client_id": client_id,
        "status": "completed",
        "version": 2,
        "bookings_analyzed": analysis["total"],
        "outcomes": analysis["outcomes"],
        "patterns": analysis["patterns"],
        "suggestions": suggestions,
        "new_rules_applied": apply_result.get("applied", 0),
        "conflicts_resolved": apply_result.get("conflicts_resolved", 0),
        "duplicates_skipped": apply_result.get("duplicates_skipped", 0),
        "rules_verified": verified_count,
        "rules_reverted": reverted_count,
        "rule_stats": rule_stats,
        "patch_reason": patch.get("reason", ""),
    }


async def run_all_clients():
    """Run Karpathy Loop for all active clients."""
    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/clients?status=eq.active&select=id,company_name",
            headers=_SUPA_HEADERS,
        )
        clients = r.json() if r.status_code == 200 else []

    results = []
    for client in clients:
        result = await run_karpathy_loop(client["id"])
        result["company_name"] = client["company_name"]
        results.append(result)

    return results


# ═══════════════════════════════════════════════════════
# DIAGNOSTICS — inspect rule state
# ═══════════════════════════════════════════════════════

async def get_rule_status(client_id: str) -> dict:
    """Get the current state of all learned rules for a client."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}&select=crawl_data",
                headers=_SUPA_HEADERS,
            )
            kb = r.json()
            if not kb:
                return {"rules": [], "total": 0}

            rules = kb[0].get("crawl_data", {}).get("learned_rules", [])
            rules = [_migrate_old_rule(r) for r in rules]

            return {
                "total": len(rules),
                "active": sum(1 for r in rules if r.get("status") in ("active", "probation", "verified")),
                "by_status": {
                    "probation": [r for r in rules if r.get("status") == "probation"],
                    "verified": [r for r in rules if r.get("status") == "verified"],
                    "reverted": [r for r in rules if r.get("status") == "reverted"],
                    "expired": [r for r in rules if r.get("status") == "expired"],
                },
                "rules": rules,
            }
    except Exception as e:
        return {"error": str(e)}


# ═══════════════════════════════════════════════════════
# CUSTOMER RESEARCH — insight extraction + confidence
# ═══════════════════════════════════════════════════════

# Confidence levels for generated rules
CONFIDENCE_LEVELS = {
    "high": {"min_conversations": 3, "description": "Unprompted mention, cross-segment consistency"},
    "medium": {"min_conversations": 2, "description": "Prompted or limited sample"},
    "low": {"min_conversations": 1, "description": "Single conversation, potential outlier"},
}


async def extract_customer_insights(client_id: str, days: int = 7) -> dict:
    """Extract customer insights from conversation history using 5-part method.

    1. Jobs to Be Done: What functional/emotional outcomes customers seek
    2. Pain Points: Unprompted frustrations and complaints
    3. Trigger Events: What prompted them to reach out
    4. Desired Outcomes: How customers define success
    5. Language & Vocabulary: Exact phrases for copy leverage

    Uses MiniMax to analyze conversation transcripts.
    Returns: {jtbd: [], pain_points: [], triggers: [], outcomes: [], language: [], confidence: str}
    """
    # Fetch conversations from the last N days
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/conversation_messages"
            f"?client_id=eq.{client_id}&created_at=gte.{start_date}T00:00:00Z"
            f"&select=customer_phone,direction,content,created_at"
            f"&order=created_at.asc",
            headers=_SUPA_HEADERS,
        )
        messages = r.json() if r.status_code == 200 else []

    if not messages:
        return {
            "jtbd": [], "pain_points": [], "triggers": [],
            "outcomes": [], "language": [], "confidence": "low",
        }

    # Group by customer
    conversations = {}
    for msg in messages:
        phone = msg.get("customer_phone", "")
        if phone not in conversations:
            conversations[phone] = []
        conversations[phone].append({
            "direction": msg.get("direction", ""),
            "content": msg.get("content", ""),
        })

    # Build transcripts for AI analysis
    transcripts = []
    for phone, msgs in list(conversations.items())[:20]:
        transcript = "\n".join(
            f"{'Customer' if m['direction'] == 'inbound' else 'AI'}: {m['content'][:200]}"
            for m in msgs[:15]
        )
        transcripts.append(transcript)

    convo_count = len(conversations)

    # Determine confidence from conversation count
    if convo_count >= CONFIDENCE_LEVELS["high"]["min_conversations"]:
        confidence = "high"
    elif convo_count >= CONFIDENCE_LEVELS["medium"]["min_conversations"]:
        confidence = "medium"
    else:
        confidence = "low"

    if not _MINIMAX_KEY:
        return {
            "jtbd": [], "pain_points": [], "triggers": [],
            "outcomes": [], "language": [], "confidence": confidence,
            "conversation_count": convo_count,
        }

    all_transcripts = "\n---\n".join(transcripts[:10])

    try:
        async with httpx.AsyncClient(timeout=90) as http:
            r = await http.post(
                "https://api.minimax.io/v1/chat/completions",
                headers={"Authorization": f"Bearer {_MINIMAX_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "MiniMax-M2.7",
                    "messages": [
                        {"role": "system", "content": """You are a customer research analyst. Analyze conversation transcripts and extract insights using a 5-part framework.

IMPORTANT: Do NOT use <think> tags. Output ONLY valid JSON. Nothing else.

Output format:
{"jtbd": ["job 1", "job 2"], "pain_points": ["pain 1", "pain 2"], "triggers": ["trigger 1"], "outcomes": ["outcome 1"], "language": ["exact phrase 1", "exact phrase 2"]}

- jtbd: What functional/emotional outcomes customers are seeking (Jobs to Be Done)
- pain_points: Unprompted frustrations and complaints (NOT things you asked about)
- triggers: What prompted them to reach out right now
- outcomes: How customers define success / what they want to happen
- language: Exact words and phrases customers use (for marketing copy)

Be specific. Use the customer's actual words where possible. Max 5 items per category."""},
                        {"role": "user", "content": f"Analyze these {convo_count} conversations:\n\n{all_transcripts}"},
                    ],
                    "max_tokens": 800,
                },
            )
            raw = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            content = re.sub(r"<think>[\s\S]*?</think>\s*", "", raw).strip()
            if not content and "<think>" in raw:
                content = re.sub(r"</?think>", "", raw).strip()
            content = re.sub(r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u0400-\u04ff]+', '', content)

            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                text = re.sub(r",\s*([}\]])", r"\1", json_match.group())
                try:
                    parsed = json.loads(text)
                    parsed["confidence"] = confidence
                    parsed["conversation_count"] = convo_count
                    return parsed
                except json.JSONDecodeError:
                    pass
    except Exception as e:
        print(f"[karpathy] Insight extraction failed: {e}")

    return {
        "jtbd": [], "pain_points": [], "triggers": [],
        "outcomes": [], "language": [], "confidence": confidence,
        "conversation_count": convo_count,
    }


async def label_rule_confidence(rule: dict, conversations: dict) -> str:
    """Assign confidence level to a behavioral rule based on evidence.
    High: 3+ conversations, unprompted, cross-segment
    Medium: 2 conversations or prompted-only
    Low: Single conversation, potential outlier
    """
    rule_text = rule.get("rule", "").lower()
    if not rule_text or not conversations:
        return "low"

    # Count conversations where the rule's core topic appears
    topic_words = set(w for w in rule_text.split() if len(w) > 3)
    if not topic_words:
        return "low"

    supporting_convos = 0
    unprompted_mentions = 0

    for phone, msgs in conversations.items():
        convo_text = " ".join(m.get("content", "").lower() for m in msgs)
        convo_words = set(convo_text.split())

        # Check if topic appears in this conversation
        overlap = len(topic_words & convo_words)
        if overlap >= 2:
            supporting_convos += 1

            # Check if customer mentioned it first (unprompted)
            for msg in msgs:
                if msg.get("direction") == "inbound":
                    customer_words = set(msg.get("content", "").lower().split())
                    if len(topic_words & customer_words) >= 2:
                        unprompted_mentions += 1
                        break

    if supporting_convos >= CONFIDENCE_LEVELS["high"]["min_conversations"] and unprompted_mentions >= 2:
        return "high"
    elif supporting_convos >= CONFIDENCE_LEVELS["medium"]["min_conversations"]:
        return "medium"
    return "low"


async def generate_rules_with_inversion(client_id: str, analysis: dict) -> list:
    """Generate rules using inversion thinking.
    Ask: 'What would guarantee a terrible customer experience?'
    Then invert each answer into a preventive rule.
    E.g., 'Ignoring dietary needs' → 'Always ask about dietary restrictions within first 3 messages'
    """
    if not _MINIMAX_KEY or not analysis:
        return []

    data_summary = json.dumps(analysis, ensure_ascii=False)

    try:
        async with httpx.AsyncClient(timeout=90) as http:
            r = await http.post(
                "https://api.minimax.io/v1/chat/completions",
                headers={"Authorization": f"Bearer {_MINIMAX_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "MiniMax-M2.7",
                    "messages": [
                        {"role": "system", "content": """You are a customer experience strategist using INVERSION thinking.

IMPORTANT: Do NOT use <think> tags. Output ONLY a JSON array. Nothing else.

Step 1: Think about what would GUARANTEE a terrible customer experience for this business.
Step 2: Invert each terrible practice into a specific preventive rule.

Example:
- Terrible: "Ignoring dietary restrictions" → Rule: "Always ask about dietary restrictions within first 3 messages"
- Terrible: "Making customer repeat info" → Rule: "Summarize collected details before asking for new information"

Output format:
[{"terrible": "what would go wrong", "rule": "the preventive behavioral rule"}]

Max 3 rules. Rules must be actionable behavioral instructions (20-120 chars)."""},
                        {"role": "user", "content": f"Business performance data:\n{data_summary}\n\nWhat would guarantee terrible customer experiences here? Invert each into a preventive rule."},
                    ],
                    "max_tokens": 600,
                },
            )
            raw = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            content = re.sub(r"<think>[\s\S]*?</think>\s*", "", raw).strip()
            if not content and "<think>" in raw:
                content = re.sub(r"</?think>", "", raw).strip()
            content = re.sub(r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u0400-\u04ff]+', '', content)

            json_match = re.search(r'\[[\s\S]*\]', content)
            if json_match:
                text = re.sub(r",\s*([}\]])", r"\1", json_match.group())
                try:
                    items = json.loads(text)
                    return [
                        _make_rule(
                            item.get("rule", ""),
                            f"Inversion: prevent '{item.get('terrible', '')[:60]}'",
                        )
                        for item in items
                        if item.get("rule") and len(item["rule"]) >= 20
                    ][:3]
                except json.JSONDecodeError:
                    pass
    except Exception as e:
        print(f"[karpathy] Inversion rule generation failed: {e}")

    return []


async def get_insight_brief(client_id: str, lang: str = "en") -> str:
    """Generate a WhatsApp-friendly insight brief from extracted customer data.
    Shows top JTBD, pain points, and language patterns.
    """
    insights = await extract_customer_insights(client_id, days=7)

    if not insights.get("jtbd") and not insights.get("pain_points"):
        if lang == "ar":
            return "لا توجد بيانات كافية لإنشاء ملخص. نحتاج إلى المزيد من المحادثات."
        return "Not enough data to generate an insight brief. Need more conversations."

    confidence = insights.get("confidence", "low")
    convo_count = insights.get("conversation_count", 0)

    if lang == "ar":
        lines = [f"📊 *ملخص رؤى العملاء* ({convo_count} محادثة، ثقة: {confidence})"]
        if insights.get("jtbd"):
            lines.append("\n*ما يبحث عنه العملاء:*")
            for item in insights["jtbd"][:3]:
                lines.append(f"• {item}")
        if insights.get("pain_points"):
            lines.append("\n*نقاط الألم:*")
            for item in insights["pain_points"][:3]:
                lines.append(f"• {item}")
        if insights.get("language"):
            lines.append("\n*عبارات العملاء:*")
            for item in insights["language"][:3]:
                lines.append(f'• "{item}"')
    else:
        lines = [f"Customer Insights ({convo_count} conversations, confidence: {confidence})"]
        if insights.get("jtbd"):
            lines.append("\n*What customers want:*")
            for item in insights["jtbd"][:3]:
                lines.append(f"- {item}")
        if insights.get("pain_points"):
            lines.append("\n*Pain points:*")
            for item in insights["pain_points"][:3]:
                lines.append(f"- {item}")
        if insights.get("language"):
            lines.append("\n*Their exact words:*")
            for item in insights["language"][:3]:
                lines.append(f'- "{item}"')

    return "\n".join(lines)


# ═══════════════════════════════════════════════════════
# CONTENT LEARNINGS — Self-improving content intelligence
# ═══════════════════════════════════════════════════════

# Structure for persistent learnings per client (stored in crawl_data.content_learnings)
LEARNINGS_SCHEMA = {
    "best_hooks": [],        # [{style: str, text: str, engagement: float, count: int}]
    "best_times": {},        # {monday: "18:00", tuesday: "12:00", ...}
    "best_styles": {},       # {dark_minimal: {views: int, count: int}, bright_food: {...}}
    "best_topics": [],       # [{topic: str, engagement: float, count: int}]
    "worst_performers": [],  # [{type: str, reason: str, avoid: bool}]
    "audience_language": [], # [most common customer phrases/words from conversations]
    "post_history": [],      # [{date, type, topic, engagement, platform}] — rolling 100
    "conversation_patterns": {
        "peak_hours": {},    # {hour: message_count} — when customers message most
        "common_questions": [],  # top 20 questions asked
        "drop_off_triggers": [], # what messages cause customers to stop responding
        "conversion_phrases": [], # what the AI said right before a booking was confirmed
    },
    "updated_at": "",
}


async def get_content_learnings(client_id: str) -> dict:
    """Get the current content learnings for a client. Creates default if none exist."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}&select=crawl_data",
                headers=_SUPA_HEADERS,
            )
            rows = r.json() if r.status_code == 200 else []
            if not rows:
                return dict(LEARNINGS_SCHEMA)

            cd = rows[0].get("crawl_data", {})
            learnings = cd.get("content_learnings")
            if learnings:
                return learnings

            # No learnings yet — return default schema
            return dict(LEARNINGS_SCHEMA)
    except Exception as e:
        print(f"[karpathy] Failed to get content learnings: {e}")
        return dict(LEARNINGS_SCHEMA)


async def update_content_learnings(client_id: str, new_data: dict) -> dict:
    """Merge new learning data into existing learnings.
    Keeps rolling windows (100 posts, top 20 questions, etc.)"""
    learnings = await get_content_learnings(client_id)

    # Merge best_hooks — deduplicate by text, keep top 20 by engagement
    if new_data.get("best_hooks"):
        existing_texts = {h["text"] for h in learnings.get("best_hooks", [])}
        for hook in new_data["best_hooks"]:
            if hook.get("text") and hook["text"] not in existing_texts:
                learnings.setdefault("best_hooks", []).append(hook)
                existing_texts.add(hook["text"])
        learnings["best_hooks"] = sorted(
            learnings.get("best_hooks", []),
            key=lambda h: h.get("engagement", 0), reverse=True,
        )[:20]

    # Merge best_times — overwrite per day (newer data wins)
    if new_data.get("best_times"):
        learnings.setdefault("best_times", {}).update(new_data["best_times"])

    # Merge best_styles — accumulate views and count
    if new_data.get("best_styles"):
        for style, stats in new_data["best_styles"].items():
            existing = learnings.setdefault("best_styles", {}).get(style, {"views": 0, "count": 0})
            existing["views"] = existing.get("views", 0) + stats.get("views", 0)
            existing["count"] = existing.get("count", 0) + stats.get("count", 0)
            learnings["best_styles"][style] = existing

    # Merge best_topics — deduplicate by topic, keep top 20
    if new_data.get("best_topics"):
        existing_topics = {t["topic"]: t for t in learnings.get("best_topics", [])}
        for topic in new_data["best_topics"]:
            name = topic.get("topic", "")
            if name in existing_topics:
                existing_topics[name]["engagement"] = (
                    existing_topics[name].get("engagement", 0) + topic.get("engagement", 0)
                ) / 2
                existing_topics[name]["count"] = existing_topics[name].get("count", 0) + topic.get("count", 0)
            else:
                existing_topics[name] = topic
        learnings["best_topics"] = sorted(
            list(existing_topics.values()),
            key=lambda t: t.get("engagement", 0), reverse=True,
        )[:20]

    # Merge worst_performers — keep last 10
    if new_data.get("worst_performers"):
        learnings.setdefault("worst_performers", []).extend(new_data["worst_performers"])
        learnings["worst_performers"] = learnings["worst_performers"][-10:]

    # Merge audience_language — deduplicate, keep top 50
    if new_data.get("audience_language"):
        existing_phrases = set(learnings.get("audience_language", []))
        for phrase in new_data["audience_language"]:
            existing_phrases.add(phrase)
        learnings["audience_language"] = list(existing_phrases)[:50]

    # Merge post_history — rolling 100
    if new_data.get("post_history"):
        learnings.setdefault("post_history", []).extend(new_data["post_history"])
        learnings["post_history"] = learnings["post_history"][-100:]

    # Merge conversation_patterns
    if new_data.get("conversation_patterns"):
        cp = learnings.setdefault("conversation_patterns", {
            "peak_hours": {}, "common_questions": [],
            "drop_off_triggers": [], "conversion_phrases": [],
        })
        new_cp = new_data["conversation_patterns"]

        # Peak hours — accumulate
        if new_cp.get("peak_hours"):
            for hour, count in new_cp["peak_hours"].items():
                cp["peak_hours"][hour] = cp.get("peak_hours", {}).get(hour, 0) + count

        # Common questions — deduplicate, keep top 20
        if new_cp.get("common_questions"):
            existing_q = set(cp.get("common_questions", []))
            for q in new_cp["common_questions"]:
                existing_q.add(q)
            cp["common_questions"] = list(existing_q)[:20]

        # Drop-off triggers — deduplicate, keep top 15
        if new_cp.get("drop_off_triggers"):
            existing_d = set(cp.get("drop_off_triggers", []))
            for d in new_cp["drop_off_triggers"]:
                existing_d.add(d)
            cp["drop_off_triggers"] = list(existing_d)[:15]

        # Conversion phrases — deduplicate, keep top 20
        if new_cp.get("conversion_phrases"):
            existing_c = set(cp.get("conversion_phrases", []))
            for c in new_cp["conversion_phrases"]:
                existing_c.add(c)
            cp["conversion_phrases"] = list(existing_c)[:20]

        learnings["conversation_patterns"] = cp

    learnings["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Persist to Supabase
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            # Fetch current crawl_data to merge
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}&select=crawl_data",
                headers=_SUPA_HEADERS,
            )
            rows = r.json() if r.status_code == 200 else []
            cd = rows[0].get("crawl_data", {}) if rows else {}
            cd["content_learnings"] = learnings

            await http.patch(
                f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}",
                headers=_SUPA_HEADERS,
                json={"crawl_data": cd},
            )
            print(f"[karpathy] Updated content learnings for {client_id}")
    except Exception as e:
        print(f"[karpathy] Failed to save content learnings: {e}")

    return learnings


async def analyze_conversation_patterns(client_id: str, days: int = 7) -> dict:
    """Analyze conversation data to extract patterns:
    - Peak messaging hours
    - Most common questions (top 20)
    - Drop-off triggers (what was said before customer went silent)
    - Conversion phrases (what AI said before booking confirmed)
    - Customer vocabulary (most used words/phrases by customers)

    Stores results in content_learnings.conversation_patterns"""
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

    async with httpx.AsyncClient(timeout=10) as http:
        # Fetch messages
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/conversation_messages"
            f"?client_id=eq.{client_id}&created_at=gte.{start_date}T00:00:00Z"
            f"&select=customer_phone,direction,content,created_at"
            f"&order=created_at.asc",
            headers=_SUPA_HEADERS,
        )
        messages = r.json() if r.status_code == 200 else []

        # Fetch confirmed bookings to find conversion phrases
        r2 = await http.get(
            f"{_SUPA_URL}/rest/v1/active_bookings"
            f"?client_id=eq.{client_id}&status=eq.confirmed&created_at=gte.{start_date}T00:00:00Z"
            f"&select=customer_phone",
            headers=_SUPA_HEADERS,
        )
        confirmed_bookings = r2.json() if r2.status_code == 200 else []

    if not messages:
        return {"peak_hours": {}, "common_questions": [], "drop_off_triggers": [], "conversion_phrases": [], "audience_language": []}

    confirmed_phones = {b.get("customer_phone", "") for b in confirmed_bookings}

    # Group by customer
    conversations = {}
    for msg in messages:
        phone = msg.get("customer_phone", "")
        if phone not in conversations:
            conversations[phone] = []
        conversations[phone].append(msg)

    # 1. Peak hours
    peak_hours = {}
    for msg in messages:
        try:
            ts = msg.get("created_at", "")
            hour = ts[11:13] if len(ts) > 13 else "00"
            peak_hours[hour] = peak_hours.get(hour, 0) + 1
        except (IndexError, TypeError):
            pass

    # 2. Common questions — extract questions from inbound messages
    questions = []
    for msg in messages:
        if msg.get("direction") == "inbound" and "?" in msg.get("content", ""):
            q = msg["content"].strip()[:150]
            questions.append(q)

    # Deduplicate similar questions (basic: exact match after lowering)
    seen = set()
    unique_questions = []
    for q in questions:
        q_lower = q.lower().strip()
        if q_lower not in seen:
            seen.add(q_lower)
            unique_questions.append(q)
    # Sort by frequency (count occurrences of lowered version)
    q_counts = {}
    for q in questions:
        key = q.lower().strip()
        q_counts[key] = q_counts.get(key, 0) + 1
    unique_questions.sort(key=lambda q: q_counts.get(q.lower().strip(), 0), reverse=True)
    common_questions = unique_questions[:20]

    # 3. Drop-off triggers — last customer message in short conversations (<=3 msgs, no booking)
    drop_off_triggers = []
    for phone, msgs in conversations.items():
        if phone in confirmed_phones:
            continue
        if len(msgs) <= 3:
            # Find the last AI message before customer went silent
            last_ai_msg = ""
            for m in reversed(msgs):
                if m.get("direction") == "outbound":
                    last_ai_msg = m.get("content", "")[:150]
                    break
            if last_ai_msg:
                drop_off_triggers.append(last_ai_msg)
    drop_off_triggers = drop_off_triggers[:15]

    # 4. Conversion phrases — AI messages right before a confirmed booking customer's last message
    conversion_phrases = []
    for phone in confirmed_phones:
        if phone not in conversations:
            continue
        msgs = conversations[phone]
        # Find last AI message before the booking confirmation
        for i in range(len(msgs) - 1, -1, -1):
            if msgs[i].get("direction") == "outbound":
                conversion_phrases.append(msgs[i].get("content", "")[:150])
                break
    conversion_phrases = conversion_phrases[:20]

    # 5. Customer vocabulary — most common words from inbound messages (excluding stop words)
    stop_words = {
        "the", "a", "an", "is", "are", "was", "were", "i", "me", "my", "we", "you",
        "your", "it", "its", "this", "that", "do", "does", "did", "have", "has", "had",
        "be", "been", "being", "will", "would", "could", "should", "can", "to", "of",
        "in", "for", "on", "with", "at", "by", "from", "and", "or", "but", "not", "no",
        "yes", "ok", "okay", "hi", "hello", "hey", "thanks", "thank", "please",
        "هل", "في", "من", "على", "إلى", "و", "أن", "ان", "هذا", "هذه", "لا", "نعم",
        "مرحبا", "شكرا", "لو", "ممكن", "يا",
    }
    word_counts = {}
    for msg in messages:
        if msg.get("direction") == "inbound":
            words = re.findall(r'[\w\u0600-\u06FF]+', msg.get("content", "").lower())
            for w in words:
                if w not in stop_words and len(w) > 2:
                    word_counts[w] = word_counts.get(w, 0) + 1
    audience_language = sorted(word_counts.keys(), key=lambda w: word_counts[w], reverse=True)[:30]

    patterns = {
        "peak_hours": peak_hours,
        "common_questions": common_questions,
        "drop_off_triggers": drop_off_triggers,
        "conversion_phrases": conversion_phrases,
        "audience_language": audience_language,
    }

    # Store in content learnings
    await update_content_learnings(client_id, {
        "conversation_patterns": patterns,
        "audience_language": audience_language,
    })

    return patterns


async def generate_learning_report(client_id: str, lang: str = "en") -> str:
    """WhatsApp-friendly report of what the AI has learned about this business.
    Shows: best performing content, peak hours, common questions, conversion patterns.
    Designed for the Owner Brain morning brief."""
    learnings = await get_content_learnings(client_id)

    if not learnings or learnings.get("updated_at") == "":
        if lang == "ar":
            return "لا توجد بيانات تعلم بعد. سيتم إنشاء التقرير بعد تحليل المحادثات."
        return "No learning data yet. Report will be available after conversation analysis runs."

    if lang == "ar":
        lines = ["*ما تعلمه الذكاء الاصطناعي عن عملك*\n"]

        # Peak hours
        ph = learnings.get("conversation_patterns", {}).get("peak_hours", {})
        if ph:
            sorted_hours = sorted(ph.items(), key=lambda x: x[1], reverse=True)[:3]
            peak_str = ", ".join(f"{h}:00" for h, _ in sorted_hours)
            lines.append(f"*ساعات الذروة:* {peak_str}")

        # Common questions
        cq = learnings.get("conversation_patterns", {}).get("common_questions", [])
        if cq:
            lines.append(f"\n*أكثر الأسئلة شيوعاً ({len(cq)}):*")
            for q in cq[:5]:
                lines.append(f"• {q}")

        # Best hooks
        bh = learnings.get("best_hooks", [])
        if bh:
            lines.append(f"\n*أفضل المقدمات ({len(bh)}):*")
            for h in bh[:3]:
                lines.append(f'• "{h.get("text", "")}" ({h.get("engagement", 0):.0%})')

        # Best topics
        bt = learnings.get("best_topics", [])
        if bt:
            lines.append(f"\n*أفضل المواضيع:*")
            for t in bt[:3]:
                lines.append(f"• {t.get('topic', '')} ({t.get('engagement', 0):.0%})")

        # Conversion phrases
        cp = learnings.get("conversation_patterns", {}).get("conversion_phrases", [])
        if cp:
            lines.append(f"\n*عبارات تؤدي إلى الحجز:*")
            for c in cp[:3]:
                lines.append(f'• "{c}"')

        # Drop-off triggers
        dot = learnings.get("conversation_patterns", {}).get("drop_off_triggers", [])
        if dot:
            lines.append(f"\n*عبارات تسبب فقدان العميل:*")
            for d in dot[:3]:
                lines.append(f'• "{d}"')

        lines.append(f"\nآخر تحديث: {learnings.get('updated_at', 'N/A')[:10]}")
    else:
        lines = ["*What Your AI Has Learned*\n"]

        # Peak hours
        ph = learnings.get("conversation_patterns", {}).get("peak_hours", {})
        if ph:
            sorted_hours = sorted(ph.items(), key=lambda x: x[1], reverse=True)[:3]
            peak_str = ", ".join(f"{h}:00" for h, _ in sorted_hours)
            lines.append(f"*Peak hours:* {peak_str}")

        # Common questions
        cq = learnings.get("conversation_patterns", {}).get("common_questions", [])
        if cq:
            lines.append(f"\n*Top questions ({len(cq)} total):*")
            for q in cq[:5]:
                lines.append(f"- {q}")

        # Best hooks
        bh = learnings.get("best_hooks", [])
        if bh:
            lines.append(f"\n*Best hooks ({len(bh)} tracked):*")
            for h in bh[:3]:
                lines.append(f'- "{h.get("text", "")}" ({h.get("engagement", 0):.0%})')

        # Best topics
        bt = learnings.get("best_topics", [])
        if bt:
            lines.append(f"\n*Top topics:*")
            for t in bt[:3]:
                lines.append(f"- {t.get('topic', '')} ({t.get('engagement', 0):.0%})")

        # Conversion phrases
        cp = learnings.get("conversation_patterns", {}).get("conversion_phrases", [])
        if cp:
            lines.append(f"\n*What the AI says before bookings:*")
            for c in cp[:3]:
                lines.append(f'- "{c}"')

        # Drop-off triggers
        dot = learnings.get("conversation_patterns", {}).get("drop_off_triggers", [])
        if dot:
            lines.append(f"\n*Messages that lose customers:*")
            for d in dot[:3]:
                lines.append(f'- "{d}"')

        # Worst performers
        wp = learnings.get("worst_performers", [])
        if wp:
            lines.append(f"\n*Avoid:*")
            for w in wp[:3]:
                lines.append(f"- {w.get('type', '')}: {w.get('reason', '')}")

        lines.append(f"\nLast updated: {learnings.get('updated_at', 'N/A')[:10]}")

    return "\n".join(lines)


async def apply_learnings_to_prompt(client_id: str) -> dict:
    """Use content learnings to improve the AI's system prompt.
    - If customers ask about X a lot, add X to the knowledge base
    - If drop-offs happen after Y, adjust conversation flow
    - If peak hours are Z, schedule proactive messages accordingly
    Returns: {improvements_applied: int, details: [...]}"""
    learnings = await get_content_learnings(client_id)
    result = {"improvements_applied": 0, "details": []}

    if not learnings or learnings.get("updated_at") == "":
        return result

    # Fetch current KB
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}&select=crawl_data",
                headers=_SUPA_HEADERS,
            )
            rows = r.json() if r.status_code == 200 else []
            if not rows:
                return result
            cd = rows[0].get("crawl_data", {})
    except Exception as e:
        print(f"[karpathy] Failed to fetch KB for learnings application: {e}")
        return result

    existing_rules = [_migrate_old_rule(r) for r in cd.get("learned_rules", [])]
    metrics = await get_performance_snapshot(client_id, days=1)
    new_rules = []

    # 1. Common questions → generate FAQ rules
    common_questions = learnings.get("conversation_patterns", {}).get("common_questions", [])
    if len(common_questions) >= 3:
        # Check if we already have a FAQ rule
        has_faq_rule = any("faq" in r.get("rule", "").lower() or "common question" in r.get("rule", "").lower() for r in existing_rules)
        if not has_faq_rule:
            top_q = ", ".join(common_questions[:3])
            rule_text = f"Proactively address common questions: {top_q[:90]}"
            if len(rule_text) >= 20:
                new_rules.append(_make_rule(rule_text, "Derived from common customer questions", metrics))
                result["details"].append(f"Added FAQ rule from {len(common_questions)} common questions")

    # 2. Drop-off triggers → generate avoidance rules
    drop_offs = learnings.get("conversation_patterns", {}).get("drop_off_triggers", [])
    if len(drop_offs) >= 2:
        has_dropoff_rule = any("drop" in r.get("rule", "").lower() or "lose" in r.get("rule", "").lower() for r in existing_rules)
        if not has_dropoff_rule:
            # Use AI to summarize the pattern
            if _MINIMAX_KEY:
                try:
                    trigger_list = "\n".join(f"- {d}" for d in drop_offs[:5])
                    async with httpx.AsyncClient(timeout=90) as http:
                        r = await http.post(
                            "https://api.minimax.io/v1/chat/completions",
                            headers={"Authorization": f"Bearer {_MINIMAX_KEY}", "Content-Type": "application/json"},
                            json={
                                "model": "MiniMax-M2.7",
                                "messages": [
                                    {"role": "system", "content": "You are a conversation designer. Given messages that caused customers to stop responding, write ONE short behavioral rule (20-100 chars) to prevent this. Output ONLY the rule text, nothing else. No <think> tags."},
                                    {"role": "user", "content": f"Messages that caused drop-offs:\n{trigger_list}"},
                                ],
                                "max_tokens": 100,
                            },
                        )
                        raw = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                        rule_text = re.sub(r"<think>[\s\S]*?</think>\s*", "", raw).strip()
                        rule_text = re.sub(r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u0400-\u04ff]+', '', rule_text).strip()
                        if rule_text and 20 <= len(rule_text) <= 120:
                            conflicts = detect_conflicts(rule_text, existing_rules)
                            if not any(c["conflict_type"] == "duplicate" for c in conflicts):
                                new_rules.append(_make_rule(rule_text, "Derived from drop-off pattern analysis", metrics))
                                result["details"].append(f"Added anti-dropoff rule from {len(drop_offs)} triggers")
                except Exception as e:
                    print(f"[karpathy] Drop-off rule generation failed: {e}")

    # 3. Peak hours → store as scheduling recommendation
    peak_hours = learnings.get("conversation_patterns", {}).get("peak_hours", {})
    if peak_hours:
        sorted_hours = sorted(peak_hours.items(), key=lambda x: x[1], reverse=True)[:3]
        cd.setdefault("scheduling", {})["peak_hours"] = [{"hour": h, "volume": c} for h, c in sorted_hours]
        result["details"].append(f"Updated peak hours: {', '.join(h + ':00' for h, _ in sorted_hours)}")
        result["improvements_applied"] += 1

    # 4. Audience language → enrich brand voice with customer vocabulary
    audience_lang = learnings.get("audience_language", [])
    if audience_lang:
        cd.setdefault("audience_vocabulary", [])
        existing_vocab = set(cd["audience_vocabulary"])
        new_words = [w for w in audience_lang[:20] if w not in existing_vocab]
        if new_words:
            cd["audience_vocabulary"] = list(existing_vocab | set(new_words))[:50]
            result["details"].append(f"Added {len(new_words)} customer vocabulary words")
            result["improvements_applied"] += 1

    # 5. Conversion phrases → highlight what works
    conv_phrases = learnings.get("conversation_patterns", {}).get("conversion_phrases", [])
    if conv_phrases:
        cd["winning_phrases"] = conv_phrases[:10]
        result["details"].append(f"Stored {len(conv_phrases[:10])} conversion phrases")
        result["improvements_applied"] += 1

    # Apply new rules (with conflict detection)
    for rule in new_rules:
        conflicts = detect_conflicts(rule["rule"], existing_rules)
        if not any(c["conflict_type"] == "duplicate" for c in conflicts):
            existing_rules.append(rule)
            result["improvements_applied"] += 1
            print(f"[karpathy] Applied learning-based rule: {rule['rule'][:60]}")

    # Run bloat control on final rule set
    existing_rules = await control_bloat(client_id, existing_rules)
    cd["learned_rules"] = existing_rules

    # Save to Supabase
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            await http.patch(
                f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}",
                headers=_SUPA_HEADERS,
                json={"crawl_data": cd},
            )
            print(f"[karpathy] Applied {result['improvements_applied']} learning-based improvements for {client_id}")
    except Exception as e:
        print(f"[karpathy] Failed to save learning-based improvements: {e}")

    return result
