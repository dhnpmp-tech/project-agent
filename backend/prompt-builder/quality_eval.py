"""Quality Evaluation Engine — DeepEval-powered AI response quality scoring.

Uses a hybrid approach:
1. DeepEval metrics (faithfulness, hallucination, relevancy) when OpenAI/OpenRouter is available
2. Rule-based fallback scoring that works without an external LLM

Scores every AI response on 4 dimensions:
- Faithfulness: does the response stick to knowledge base data?
- Hallucination: does the response contain claims not in the KB?
- Relevancy: does the response address the customer's actual question?
- Persona consistency: does the response match the persona voice?
"""

import os
import re
import json
import asyncio
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional

# ═══════════════════════════════════════════════════════
# SUPABASE CONFIG
# ═══════════════════════════════════════════════════════

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Ynpxa3RpcGltYm11anRvd296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwOTY5NCwiZXhwIjoyMDkwMDg1Njk0fQ.-DoNS5fZv3aUsFcugKg23yh9RqXXFIlgc5_9Hrk97bg")
_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# OpenRouter for LLM-based evaluation (optional — falls back to rule-based)
_OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")
_EVAL_MODEL = os.environ.get("EVAL_MODEL", "google/gemini-2.0-flash-001")  # cheap, fast eval model


# ═══════════════════════════════════════════════════════
# HELPERS — Supabase data access
# ═══════════════════════════════════════════════════════

async def _fetch_client(client_id: str) -> dict:
    """Fetch client record with metadata."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.get(
                f"{_SUPA_URL}/rest/v1/clients?id=eq.{client_id}&limit=1",
                headers=_SUPA_HEADERS,
            )
            rows = resp.json()
            if rows and isinstance(rows, list):
                return rows[0]
    except Exception as e:
        print(f"[quality] Error fetching client: {e}")
    return {}


async def _fetch_deployment(client_id: str) -> dict:
    """Fetch agent deployment config (persona, KB, brand voice)."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.get(
                f"{_SUPA_URL}/rest/v1/agent_deployments?client_id=eq.{client_id}&limit=1",
                headers=_SUPA_HEADERS,
            )
            rows = resp.json()
            if rows and isinstance(rows, list):
                return rows[0]
    except Exception as e:
        print(f"[quality] Error fetching deployment: {e}")
    return {}


async def _fetch_conversations(client_id: str, days: int = 1) -> list:
    """Fetch conversation messages from the last N days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S")
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            resp = await http.get(
                f"{_SUPA_URL}/rest/v1/conversation_messages"
                f"?client_id=eq.{client_id}"
                f"&created_at=gte.{cutoff}"
                f"&order=created_at.asc"
                f"&limit=500",
                headers=_SUPA_HEADERS,
            )
            rows = resp.json()
            if isinstance(rows, list):
                return rows
    except Exception as e:
        print(f"[quality] Error fetching conversations: {e}")
    return []


async def _log_quality_event(client_id: str, payload: dict, summary: str = None):
    """Store quality evaluation in activity_logs."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            await http.post(
                f"{_SUPA_URL}/rest/v1/activity_logs",
                headers=_SUPA_HEADERS,
                json={
                    "client_id": client_id,
                    "event_type": "quality_evaluation",
                    "summary": summary,
                    "payload": payload,
                },
            )
    except Exception as e:
        print(f"[quality] Error logging event: {e}")


def _group_into_conversations(messages: list) -> dict:
    """Group messages by customer_phone into conversation threads."""
    convos = {}
    for msg in messages:
        phone = msg.get("customer_phone", "unknown")
        if phone not in convos:
            convos[phone] = []
        convos[phone].append(msg)
    return convos


# ═══════════════════════════════════════════════════════
# RULE-BASED SCORING — works without external LLM
# ═══════════════════════════════════════════════════════

def _score_faithfulness_rules(ai_response: str, kb_content: str) -> float:
    """Check if AI response references KB data vs. making things up.

    Scoring:
    - 1.0: Response clearly uses KB data or is a general greeting/acknowledgment
    - 0.7: Partially grounded
    - 0.3: Contains specific claims we can't verify in KB
    """
    if not kb_content or not kb_content.strip():
        # No KB to check against — assume faithful for general conversation
        return 0.8

    resp_lower = ai_response.lower()
    kb_lower = kb_content.lower()

    # Extract specific claims from response (prices, times, names, addresses)
    price_pattern = r'(?:aed|usd|\$|dhs?)\s*[\d,.]+|[\d,.]+\s*(?:aed|usd|dhs?|dirhams?)'
    time_pattern = r'\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)'
    phone_pattern = r'(?:\+?\d{1,3}[-.\s]?)?\d{7,}'

    resp_prices = set(re.findall(price_pattern, resp_lower))
    resp_times = set(re.findall(time_pattern, resp_lower))
    resp_phones = set(re.findall(phone_pattern, resp_lower))

    issues = 0
    checks = 0

    # Check if mentioned prices exist in KB
    for price in resp_prices:
        checks += 1
        # Extract just the number
        num = re.findall(r'[\d,.]+', price)
        if num and num[0] not in kb_lower:
            issues += 1

    # Check if mentioned times exist in KB
    for time_val in resp_times:
        checks += 1
        if time_val not in kb_lower:
            issues += 1

    # Check phone numbers
    for phone in resp_phones:
        checks += 1
        digits = re.sub(r'\D', '', phone)
        if digits not in re.sub(r'\D', '', kb_lower):
            issues += 1

    if checks == 0:
        # No verifiable claims — likely general conversation
        return 0.9

    score = max(0.0, 1.0 - (issues / checks))
    return round(score, 2)


def _score_hallucination_rules(ai_response: str, kb_content: str) -> float:
    """Detect hallucinations — claims not supported by KB.

    Returns 1.0 if NO hallucination detected (good), 0.0 if heavy hallucination.
    """
    if not kb_content or not kb_content.strip():
        return 0.8

    resp_lower = ai_response.lower()
    kb_lower = kb_content.lower()

    hallucination_signals = 0
    total_checks = 0

    # Check for invented menu items, services, locations
    # Look for "we have", "we offer", "our X" claims
    claim_patterns = [
        r'we (?:have|offer|serve|provide)\s+(.+?)(?:\.|,|!|\n)',
        r'our\s+(\w+(?:\s+\w+){0,3})\s+(?:is|are|has|features?)',
        r'located (?:at|in|on)\s+(.+?)(?:\.|,|!|\n)',
        r'open (?:from|at)\s+(.+?)(?:\.|,|to|\n)',
    ]

    for pattern in claim_patterns:
        matches = re.findall(pattern, resp_lower)
        for match in matches:
            total_checks += 1
            # Check if any significant words from the claim appear in KB
            words = [w for w in match.split() if len(w) > 3]
            found = sum(1 for w in words if w in kb_lower)
            if words and found < len(words) * 0.3:
                hallucination_signals += 1

    if total_checks == 0:
        return 0.95

    score = max(0.0, 1.0 - (hallucination_signals / total_checks))
    return round(score, 2)


def _score_relevancy_rules(customer_message: str, ai_response: str) -> float:
    """Check if the AI response addresses the customer's question.

    Returns 1.0 if highly relevant, lower if the response misses the point.
    """
    if not customer_message.strip():
        return 0.8

    msg_lower = customer_message.lower()
    resp_lower = ai_response.lower()

    # Detect question type
    question_types = {
        "price": ["price", "cost", "how much", "pricing", "rate", "fee", "charge", "كم", "سعر"],
        "hours": ["open", "close", "hours", "time", "when", "schedule", "ساعات", "وقت", "متى"],
        "menu": ["menu", "food", "dish", "eat", "drink", "serve", "قائمة", "اكل", "طعام"],
        "booking": ["book", "reserve", "reservation", "table", "حجز", "طاولة"],
        "location": ["where", "address", "location", "directions", "وين", "عنوان", "موقع"],
        "contact": ["phone", "call", "email", "contact", "whatsapp", "رقم", "تواصل"],
    }

    detected_intent = None
    for intent, keywords in question_types.items():
        if any(kw in msg_lower for kw in keywords):
            detected_intent = intent
            break

    if detected_intent is None:
        # General conversation — check for basic topic overlap
        msg_words = set(w for w in msg_lower.split() if len(w) > 3)
        resp_words = set(w for w in resp_lower.split() if len(w) > 3)
        if not msg_words:
            return 0.85
        overlap = len(msg_words & resp_words) / len(msg_words)
        return round(min(1.0, 0.5 + overlap), 2)

    # Check if response contains relevant keywords for the detected intent
    response_keywords = {
        "price": ["price", "cost", "aed", "usd", "dhs", "$", "dirham", "per", "سعر", "درهم"],
        "hours": ["am", "pm", "open", "close", "hour", "daily", "sunday", "monday", "من", "الى"],
        "menu": ["dish", "serve", "menu", "special", "chef", "cuisine", "appetizer", "main"],
        "booking": ["book", "reserve", "table", "confirm", "date", "time", "party", "حجز"],
        "location": ["street", "road", "mall", "floor", "area", "district", "near", "شارع"],
        "contact": ["phone", "call", "number", "email", "whatsapp", "رقم"],
    }

    relevant_words = response_keywords.get(detected_intent, [])
    matches = sum(1 for w in relevant_words if w in resp_lower)

    if matches >= 2:
        return 1.0
    elif matches == 1:
        return 0.75
    else:
        # Response doesn't seem to address the question type
        return 0.4


def _score_persona_consistency(ai_response: str, persona_config: dict) -> float:
    """Check if response matches persona voice and character.

    Checks:
    - Does not break character (no "I'm an AI", "as an AI assistant")
    - Maintains consistent tone (casual vs formal based on persona)
    - Uses persona name/identity cues
    """
    resp_lower = ai_response.lower()

    score = 1.0
    issues = []

    # Critical: AI disclosure detection
    ai_disclosure_patterns = [
        r"i(?:'m| am) an? (?:ai|artificial|language model|bot|chatbot)",
        r"as an? (?:ai|artificial intelligence|language model)",
        r"i(?:'m| am) (?:just )?a (?:virtual|digital) assistant",
        r"i don'?t have (?:feelings|emotions|personal experiences)",
        r"i was (?:created|trained|programmed|designed) (?:by|to)",
        r"my (?:training|programming|algorithm)",
        r"openai|chatgpt|claude|gemini|minimax",
    ]

    for pattern in ai_disclosure_patterns:
        if re.search(pattern, resp_lower):
            score -= 0.4
            issues.append("ai_disclosure")
            break

    # Check response length — persona should be conversational (2-3 sentences)
    sentences = [s.strip() for s in re.split(r'[.!?]+', ai_response) if s.strip()]
    if len(sentences) > 8:
        score -= 0.15
        issues.append("too_verbose")

    # Check for corporate/robotic language
    corporate_patterns = [
        "i would be happy to assist",
        "thank you for your inquiry",
        "please do not hesitate",
        "at your earliest convenience",
        "we appreciate your patience",
        "is there anything else i can help you with today",
    ]
    corporate_count = sum(1 for p in corporate_patterns if p in resp_lower)
    if corporate_count >= 2:
        score -= 0.2
        issues.append("corporate_tone")

    # Check persona-specific traits
    brand_voice = persona_config.get("brandVoice", "").lower()
    if brand_voice:
        # If persona says "casual" or "friendly", check for overly formal language
        if any(w in brand_voice for w in ["casual", "friendly", "warm", "chill"]):
            formal_markers = ["furthermore", "nevertheless", "henceforth", "regarding", "pursuant"]
            if any(m in resp_lower for m in formal_markers):
                score -= 0.1
                issues.append("tone_mismatch")

    return round(max(0.0, score), 2)


# ═══════════════════════════════════════════════════════
# LLM-BASED SCORING — via OpenRouter (optional)
# ═══════════════════════════════════════════════════════

async def _llm_evaluate(customer_msg: str, ai_response: str, kb_content: str, persona_desc: str) -> dict:
    """Use an LLM via OpenRouter to evaluate quality. Returns scores dict or None on failure."""
    if not _OPENROUTER_KEY:
        return None

    eval_prompt = f"""You are a quality evaluation judge. Score the AI assistant's response on these 4 dimensions (0.0 to 1.0 each):

1. **faithfulness** (1.0 = fully grounded in KB, 0.0 = completely made up)
2. **hallucination_free** (1.0 = no hallucinations, 0.0 = heavy hallucination)
3. **relevancy** (1.0 = perfectly addresses the question, 0.0 = completely off-topic)
4. **persona_consistency** (1.0 = perfectly in character, 0.0 = breaks character)

KNOWLEDGE BASE:
{kb_content[:3000]}

PERSONA DESCRIPTION:
{persona_desc[:500]}

CUSTOMER MESSAGE:
{customer_msg}

AI RESPONSE:
{ai_response}

Respond ONLY with valid JSON, no markdown:
{{"faithfulness": 0.0, "hallucination_free": 0.0, "relevancy": 0.0, "persona_consistency": 0.0, "issues": ["issue1"], "notes": "brief explanation"}}"""

    try:
        async with httpx.AsyncClient(timeout=30) as http:
            resp = await http.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {_OPENROUTER_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": _EVAL_MODEL,
                    "messages": [{"role": "user", "content": eval_prompt}],
                    "temperature": 0.1,
                    "max_tokens": 300,
                },
            )
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            # Parse JSON from response
            content = content.strip()
            if content.startswith("```"):
                content = re.sub(r'^```(?:json)?\s*', '', content)
                content = re.sub(r'\s*```$', '', content)
            return json.loads(content)
    except Exception as e:
        print(f"[quality] LLM eval failed: {e}")
        return None


# ═══════════════════════════════════════════════════════
# MAIN EVALUATION FUNCTIONS
# ═══════════════════════════════════════════════════════

async def evaluate_conversation(client_id: str, customer_phone: str, messages: list) -> dict:
    """Score a conversation using DeepEval metrics (hybrid: LLM + rule-based).

    Args:
        client_id: The client UUID
        customer_phone: Customer phone number
        messages: List of message dicts with {direction, content, message_type, created_at}

    Returns:
        {overall_score, faithfulness, hallucination_free, relevancy, persona_consistency,
         message_scores: [...], issues: [...]}
    """
    # Fetch KB and persona data
    deployment = await _fetch_deployment(client_id)
    config = deployment.get("config", {})
    kb_content = config.get("knowledgeBaseContent", "")
    brand_voice = config.get("brandVoice", "")
    business_desc = config.get("businessDescription", "")

    # Build reference context
    reference_context = f"{kb_content}\n{business_desc}".strip()
    persona_desc = f"Brand voice: {brand_voice}" if brand_voice else ""

    # Pair inbound (customer) with outbound (AI) messages
    pairs = []
    for i, msg in enumerate(messages):
        if msg.get("direction") == "inbound":
            # Find next outbound message
            for j in range(i + 1, len(messages)):
                if messages[j].get("direction") == "outbound":
                    pairs.append({
                        "customer_msg": msg.get("content", ""),
                        "ai_response": messages[j].get("content", ""),
                        "timestamp": messages[j].get("created_at", ""),
                    })
                    break

    if not pairs:
        return {
            "overall_score": None,
            "message": "No conversation pairs found to evaluate",
            "total_pairs": 0,
        }

    message_scores = []
    total_faithfulness = 0
    total_hallucination = 0
    total_relevancy = 0
    total_persona = 0
    all_issues = []

    for pair in pairs:
        customer_msg = pair["customer_msg"]
        ai_response = pair["ai_response"]

        # Try LLM-based evaluation first
        llm_result = await _llm_evaluate(customer_msg, ai_response, reference_context, persona_desc)

        if llm_result:
            faithfulness = llm_result.get("faithfulness", 0.8)
            hallucination_free = llm_result.get("hallucination_free", 0.8)
            relevancy = llm_result.get("relevancy", 0.8)
            persona = llm_result.get("persona_consistency", 0.8)
            issues = llm_result.get("issues", [])
            eval_method = "llm"
        else:
            # Fall back to rule-based scoring
            faithfulness = _score_faithfulness_rules(ai_response, reference_context)
            hallucination_free = _score_hallucination_rules(ai_response, reference_context)
            relevancy = _score_relevancy_rules(customer_msg, ai_response)
            persona = _score_persona_consistency(ai_response, config)
            issues = []
            eval_method = "rules"

            # Collect issues
            if faithfulness < 0.6:
                issues.append("low_faithfulness")
            if hallucination_free < 0.6:
                issues.append("possible_hallucination")
            if relevancy < 0.5:
                issues.append("off_topic")
            if persona < 0.6:
                issues.append("persona_break")

        overall = round((faithfulness * 0.3 + hallucination_free * 0.3 + relevancy * 0.25 + persona * 0.15), 2)

        score_entry = {
            "customer_msg": customer_msg[:100],
            "ai_response": ai_response[:150],
            "timestamp": pair["timestamp"],
            "faithfulness": faithfulness,
            "hallucination_free": hallucination_free,
            "relevancy": relevancy,
            "persona_consistency": persona,
            "overall": overall,
            "eval_method": eval_method,
            "issues": issues,
        }
        message_scores.append(score_entry)

        total_faithfulness += faithfulness
        total_hallucination += hallucination_free
        total_relevancy += relevancy
        total_persona += persona
        all_issues.extend(issues)

    n = len(message_scores)
    avg_scores = {
        "overall_score": round((total_faithfulness / n * 0.3 + total_hallucination / n * 0.3 + total_relevancy / n * 0.25 + total_persona / n * 0.15), 2),
        "faithfulness": round(total_faithfulness / n, 2),
        "hallucination_free": round(total_hallucination / n, 2),
        "relevancy": round(total_relevancy / n, 2),
        "persona_consistency": round(total_persona / n, 2),
        "total_pairs": n,
        "customer_phone": customer_phone,
        "issues": list(set(all_issues)),
        "message_scores": message_scores,
    }

    return avg_scores


async def run_daily_evaluation(client_id: str, days: int = 1) -> dict:
    """Run evaluation on all conversations from the last N days.

    Returns:
        {total_evaluated, avg_score, per_conversation: [...],
         issues_found: [...], recommendations: [...]}
    """
    messages = await _fetch_conversations(client_id, days)
    if not messages:
        result = {
            "total_evaluated": 0,
            "avg_score": None,
            "message": f"No conversations found in the last {days} day(s)",
            "issues_found": [],
            "recommendations": [],
        }
        await _log_quality_event(client_id, result, f"Quality eval: 0 conversations ({days}d)")
        return result

    # Group by customer
    convos = _group_into_conversations(messages)

    per_conversation = []
    total_score = 0
    all_issues = []
    evaluated = 0

    for phone, msgs in convos.items():
        eval_result = await evaluate_conversation(client_id, phone, msgs)
        if eval_result.get("overall_score") is not None:
            per_conversation.append({
                "customer_phone": phone,
                "overall_score": eval_result["overall_score"],
                "faithfulness": eval_result["faithfulness"],
                "hallucination_free": eval_result["hallucination_free"],
                "relevancy": eval_result["relevancy"],
                "persona_consistency": eval_result["persona_consistency"],
                "total_pairs": eval_result["total_pairs"],
                "issues": eval_result["issues"],
            })
            total_score += eval_result["overall_score"]
            all_issues.extend(eval_result["issues"])
            evaluated += 1

    avg_score = round(total_score / evaluated, 2) if evaluated > 0 else None

    # Generate recommendations based on common issues
    issue_counts = {}
    for issue in all_issues:
        issue_counts[issue] = issue_counts.get(issue, 0) + 1

    recommendations = []
    if issue_counts.get("low_faithfulness", 0) > evaluated * 0.3:
        recommendations.append("Update knowledge base — AI is making claims not supported by current KB data")
    if issue_counts.get("possible_hallucination", 0) > evaluated * 0.3:
        recommendations.append("Review AI responses for invented details — consider adding guardrails to the prompt")
    if issue_counts.get("off_topic", 0) > evaluated * 0.2:
        recommendations.append("AI frequently goes off-topic — review conversation goals and add more specific guidance")
    if issue_counts.get("persona_break", 0) > evaluated * 0.2:
        recommendations.append("Persona consistency issues detected — review persona prompt for clarity")
    if issue_counts.get("ai_disclosure", 0) > 0:
        recommendations.append("CRITICAL: AI revealed it is an AI — strengthen 'never break character' instructions")
    if issue_counts.get("too_verbose", 0) > evaluated * 0.3:
        recommendations.append("Responses are too long for WhatsApp — reinforce 2-3 sentence limit")
    if issue_counts.get("corporate_tone", 0) > evaluated * 0.2:
        recommendations.append("Tone is too corporate/robotic — make persona instructions more conversational")

    if not recommendations and avg_score and avg_score >= 0.8:
        recommendations.append("Quality is strong! Consider A/B testing new persona variations to optimize further.")

    result = {
        "total_evaluated": evaluated,
        "total_conversations": len(convos),
        "total_messages": len(messages),
        "avg_score": avg_score,
        "per_conversation": per_conversation,
        "issues_found": list(set(all_issues)),
        "issue_counts": issue_counts,
        "recommendations": recommendations,
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "period_days": days,
    }

    # Store in activity_logs
    # Trim per_conversation detail for storage (keep summary)
    storage_payload = {**result}
    storage_payload["per_conversation"] = [
        {k: v for k, v in c.items() if k != "message_scores"}
        for c in per_conversation
    ]
    await _log_quality_event(
        client_id,
        storage_payload,
        f"Quality eval: {evaluated} convos, avg={avg_score}, issues={len(set(all_issues))}",
    )

    return result


async def get_quality_dashboard(client_id: str, days: int = 7) -> dict:
    """Quality metrics over time for the owner dashboard.

    Pulls stored quality evaluations from activity_logs and trends them.
    """
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S")
        async with httpx.AsyncClient(timeout=15) as http:
            resp = await http.get(
                f"{_SUPA_URL}/rest/v1/activity_logs"
                f"?client_id=eq.{client_id}"
                f"&event_type=eq.quality_evaluation"
                f"&created_at=gte.{cutoff}"
                f"&order=created_at.desc"
                f"&limit=30",
                headers=_SUPA_HEADERS,
            )
            logs = resp.json()
    except Exception as e:
        print(f"[quality] Error fetching dashboard data: {e}")
        logs = []

    if not logs or not isinstance(logs, list):
        # No stored evaluations — run a fresh one
        fresh = await run_daily_evaluation(client_id, days)
        return {
            "period_days": days,
            "current": fresh,
            "trend": [],
            "summary": {
                "avg_score": fresh.get("avg_score"),
                "total_evaluated": fresh.get("total_evaluated", 0),
                "top_issues": fresh.get("issues_found", [])[:5],
                "recommendations": fresh.get("recommendations", []),
            },
        }

    # Build trend from stored evaluations
    trend = []
    scores = []
    all_issues = []
    total_evaluated = 0

    for log in logs:
        payload = log.get("payload", {})
        if not payload:
            continue
        entry = {
            "date": log.get("created_at", "")[:10],
            "avg_score": payload.get("avg_score"),
            "total_evaluated": payload.get("total_evaluated", 0),
            "issues": payload.get("issues_found", []),
        }
        trend.append(entry)
        if payload.get("avg_score") is not None:
            scores.append(payload["avg_score"])
        total_evaluated += payload.get("total_evaluated", 0)
        all_issues.extend(payload.get("issues_found", []))

    # Calculate overall averages
    avg_overall = round(sum(scores) / len(scores), 2) if scores else None

    # Score trend (improving or declining?)
    trend_direction = "stable"
    if len(scores) >= 3:
        recent = sum(scores[:len(scores) // 2]) / (len(scores) // 2)
        older = sum(scores[len(scores) // 2:]) / (len(scores) - len(scores) // 2)
        if recent > older + 0.05:
            trend_direction = "improving"
        elif recent < older - 0.05:
            trend_direction = "declining"

    # Top issues across all evaluations
    issue_freq = {}
    for issue in all_issues:
        issue_freq[issue] = issue_freq.get(issue, 0) + 1
    top_issues = sorted(issue_freq.items(), key=lambda x: x[1], reverse=True)[:5]

    # Latest recommendations
    latest_recs = []
    for log in logs:
        recs = log.get("payload", {}).get("recommendations", [])
        if recs:
            latest_recs = recs
            break

    return {
        "period_days": days,
        "summary": {
            "avg_score": avg_overall,
            "total_evaluated": total_evaluated,
            "evaluations_count": len(logs),
            "trend_direction": trend_direction,
            "top_issues": [{"issue": k, "count": v} for k, v in top_issues],
            "recommendations": latest_recs,
        },
        "trend": trend,
        "score_grade": _score_to_grade(avg_overall),
    }


def _score_to_grade(score: float) -> str:
    """Convert numeric score to letter grade."""
    if score is None:
        return "N/A"
    if score >= 0.9:
        return "A+"
    if score >= 0.85:
        return "A"
    if score >= 0.8:
        return "B+"
    if score >= 0.7:
        return "B"
    if score >= 0.6:
        return "C"
    if score >= 0.5:
        return "D"
    return "F"


async def get_quality_brief(client_id: str, lang: str = "en") -> str:
    """WhatsApp-friendly quality summary for the Owner Brain.

    Returns a short message suitable for sending via WhatsApp.
    """
    # Get latest evaluation
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            resp = await http.get(
                f"{_SUPA_URL}/rest/v1/activity_logs"
                f"?client_id=eq.{client_id}"
                f"&event_type=eq.quality_evaluation"
                f"&order=created_at.desc"
                f"&limit=1",
                headers=_SUPA_HEADERS,
            )
            logs = resp.json()
    except Exception:
        logs = []

    if not logs or not isinstance(logs, list) or not logs:
        # Run a fresh evaluation
        eval_result = await run_daily_evaluation(client_id, 1)
    else:
        eval_result = logs[0].get("payload", {})

    avg_score = eval_result.get("avg_score")
    total = eval_result.get("total_evaluated", 0)
    issues = eval_result.get("issues_found", [])
    recommendations = eval_result.get("recommendations", [])
    grade = _score_to_grade(avg_score)

    if lang == "ar":
        if avg_score is None:
            return "لا توجد محادثات كافية للتقييم حاليا"

        brief = f"تقرير جودة الذكاء الاصطناعي\n\n"
        brief += f"التقييم: {grade} ({avg_score}/1.0)\n"
        brief += f"المحادثات المقيّمة: {total}\n\n"

        if issues:
            brief += "المشاكل المكتشفة:\n"
            issue_ar = {
                "low_faithfulness": "ردود غير مستندة للبيانات",
                "possible_hallucination": "معلومات مختلقة محتملة",
                "off_topic": "ردود خارج الموضوع",
                "persona_break": "خروج عن الشخصية",
                "ai_disclosure": "كشف انه ذكاء اصطناعي",
                "too_verbose": "ردود طويلة جدا",
                "corporate_tone": "لهجة رسمية جدا",
            }
            for issue in issues[:3]:
                brief += f"- {issue_ar.get(issue, issue)}\n"

        if recommendations:
            brief += f"\nتوصية: {recommendations[0]}"

        return brief

    # English
    if avg_score is None:
        return "No conversations to evaluate yet."

    brief = f"AI Quality Report\n\n"
    brief += f"Grade: {grade} ({avg_score}/1.0)\n"
    brief += f"Conversations evaluated: {total}\n\n"

    if issues:
        brief += "Issues found:\n"
        for issue in issues[:3]:
            readable = issue.replace("_", " ").title()
            brief += f"- {readable}\n"

    if recommendations:
        brief += f"\nTop recommendation: {recommendations[0]}"

    return brief
