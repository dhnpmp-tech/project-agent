"""Research Engine — Phase 4
Proactively investigates businesses, competitors, and customers.
Delivers weekly intelligence briefs to owners via WhatsApp.
"""

import os
import json
import httpx
import re
from datetime import datetime, timezone, timedelta
from typing import Optional

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Ynpxa3RpcGltYm11anRvd296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwOTY5NCwiZXhwIjoyMDkwMDg1Njk0fQ.-DoNS5fZv3aUsFcugKg23yh9RqXXFIlgc5_9Hrk97bg")
_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
}
_MINIMAX_KEY = os.environ.get("MINIMAX_API_KEY", "")
_MEM0_URL = os.environ.get("MEM0_URL", "http://172.17.0.1:8888")
_MEM0_KEY = os.environ.get("MEM0_API_KEY", "brain-mem0-admin-key-2026")


async def get_all_clients() -> list:
    """Fetch all active clients."""
    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/clients?status=eq.active&select=id,company_name,contact_phone",
            headers=_SUPA_HEADERS,
        )
        return r.json() if r.status_code == 200 else []


async def get_client_kb(client_id: str) -> dict:
    """Fetch business knowledge for a client."""
    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}&select=*",
            headers=_SUPA_HEADERS,
        )
        rows = r.json()
        return rows[0] if rows else {}


async def get_customer_stats(client_id: str) -> dict:
    """Deep analytics from active_bookings — patterns, failures, insights."""
    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/active_bookings?client_id=eq.{client_id}&select=id,customer_phone,status,created_at,booking_time,booking_date,party_size,occasion,guest_name,seating_preference,dietary_notes,last_updated_at",
            headers=_SUPA_HEADERS,
        )
        bookings = r.json() if r.status_code == 200 else []

    # Filter out test bookings
    TEST_PREFIXES = ("qa_", "stress_", "edge_", "ind_", "fix_", "demo_", "jareed_", "noor_", "onboard_", "analysis_", "minimax_", "jt_", "test_")
    bookings = [b for b in bookings if not any(b.get("customer_phone", "").startswith(p) for p in TEST_PREFIXES)]

    if not bookings:
        return {"total_bookings": 0, "unique_customers": 0, "insights": []}

    unique_phones = set(b.get("customer_phone", "") for b in bookings)
    statuses = {}
    occasions = {}
    party_sizes = []
    times = {}
    seating = {}
    dietary = {}
    names_collected = 0
    incomplete_bookings = 0
    repeat_customers = {}

    for b in bookings:
        s = b.get("status", "unknown")
        statuses[s] = statuses.get(s, 0) + 1

        occ = b.get("occasion")
        if occ:
            occasions[occ] = occasions.get(occ, 0) + 1

        ps = b.get("party_size")
        if ps:
            party_sizes.append(ps)

        t = b.get("booking_time")
        if t:
            times[t] = times.get(t, 0) + 1

        seat = b.get("seating_preference")
        if seat:
            seating[seat] = seating.get(seat, 0) + 1

        diet = b.get("dietary_notes")
        if diet:
            dietary[diet] = dietary.get(diet, 0) + 1

        if b.get("guest_name"):
            names_collected += 1

        # Incomplete = collecting status but no time or no date
        if s == "collecting" and (not t or not b.get("booking_date")):
            incomplete_bookings += 1

        # Track repeat customers
        phone = b.get("customer_phone", "")
        if phone:
            repeat_customers[phone] = repeat_customers.get(phone, 0) + 1

    # Find insights
    insights = []

    # Most popular time
    if times:
        top_time = max(times, key=times.get)
        insights.append(f"peak_time:{top_time} ({times[top_time]} bookings)")

    # Most popular seating
    if seating:
        top_seat = max(seating, key=seating.get)
        insights.append(f"popular_seating:{top_seat} ({seating[top_seat]})")

    # Dietary patterns
    if dietary:
        diet_str = ", ".join(f"{k}: {v}" for k, v in sorted(dietary.items(), key=lambda x: -x[1])[:3])
        insights.append(f"dietary_needs:{diet_str}")

    # Incomplete bookings (drop-offs)
    if incomplete_bookings > 0:
        drop_rate = round(incomplete_bookings * 100 / len(bookings))
        insights.append(f"drop_off_rate:{drop_rate}% ({incomplete_bookings} incomplete)")

    # Name collection rate
    name_rate = round(names_collected * 100 / len(bookings)) if bookings else 0
    if name_rate < 80:
        insights.append(f"name_collection:{name_rate}% — need to ask for names more")

    # Repeat customer rate
    repeaters = sum(1 for v in repeat_customers.values() if v > 1)
    if repeaters > 0:
        insights.append(f"repeat_customers:{repeaters} ({round(repeaters*100/len(unique_phones))}% return rate)")
    else:
        insights.append("no_repeat_customers — need retention strategy")

    # Average party size distribution
    if party_sizes:
        solo = sum(1 for p in party_sizes if p == 1)
        couples = sum(1 for p in party_sizes if p == 2)
        small_groups = sum(1 for p in party_sizes if 3 <= p <= 5)
        large_groups = sum(1 for p in party_sizes if p > 5)
        insights.append(f"party_distribution: solo {solo}, couples {couples}, small groups {small_groups}, large groups {large_groups}")

    # Most common occasion
    if occasions:
        top_occ = max(occasions, key=occasions.get)
        insights.append(f"top_occasion:{top_occ} ({occasions[top_occ]})")

    return {
        "total_bookings": len(bookings),
        "unique_customers": len(unique_phones),
        "statuses": statuses,
        "occasions": occasions,
        "avg_party_size": round(sum(party_sizes) / len(party_sizes), 1) if party_sizes else 0,
        "popular_times": dict(sorted(times.items(), key=lambda x: -x[1])[:5]),
        "seating_preferences": seating,
        "dietary_needs": dietary,
        "name_collection_rate": name_rate,
        "incomplete_bookings": incomplete_bookings,
        "repeat_customers": repeaters,
        "insights": insights,
    }


async def get_memory_stats(client_id: str) -> dict:
    """Get memory stats from Mem0 — how many customers have memories."""
    # We don't have a per-client Mem0 query, so this is a placeholder
    return {"note": "Per-client memory stats require Mem0 metadata filtering"}


def _detect_client_language(kb: dict) -> str:
    """Detect client language from brand_voice or description."""
    brand = kb.get("brand_voice", "")
    desc = kb.get("business_description", "")
    text = brand + " " + desc
    arabic_chars = len(re.findall(r'[\u0600-\u06FF]', text))
    latin_chars = len(re.findall(r'[a-zA-Z]', text))
    return "ar" if arabic_chars > latin_chars else "en"


async def generate_weekly_brief(client_id: str) -> str:
    """Generate a weekly intelligence brief for a client in their language."""
    kb = await get_client_kb(client_id)
    stats = await get_customer_stats(client_id)

    company = kb.get("business_description", "Your business")[:100]
    cd = kb.get("crawl_data", {})
    industry = cd.get("industry", "general")
    lang = _detect_client_language(kb)

    # Build the brief in the client's language
    brief_parts = []
    insights = stats.get("insights", [])

    if lang == "ar":
        brief_parts.append(f"📊 التقرير الأسبوعي")
        brief_parts.append("")
        if stats["total_bookings"] > 0:
            brief_parts.append(f"📋 الطلبات: {stats['total_bookings']}")
            brief_parts.append(f"👥 زبائن فريدين: {stats['unique_customers']}")
            if stats.get("repeat_customers", 0) > 0:
                brief_parts.append(f"🔄 زبائن عائدين: {stats['repeat_customers']}")
            if stats["avg_party_size"] > 0:
                brief_parts.append(f"👨‍👩‍👧‍👦 متوسط المجموعة: {stats['avg_party_size']}")
            if stats.get("popular_times"):
                top_times = ", ".join(f"{t}" for t in list(stats["popular_times"].keys())[:3])
                brief_parts.append(f"⏰ أوقات الذروة: {top_times}")
            if stats.get("seating_preferences"):
                top_seat = max(stats["seating_preferences"], key=stats["seating_preferences"].get)
                brief_parts.append(f"💺 الجلسة المفضلة: {top_seat}")
            if stats["occasions"]:
                occ_str = "، ".join(f"{k}: {v}" for k, v in stats["occasions"].items())
                brief_parts.append(f"🎉 المناسبات: {occ_str}")
            if stats.get("dietary_needs"):
                diet_str = "، ".join(f"{k}: {v}" for k, v in stats["dietary_needs"].items())
                brief_parts.append(f"🥗 احتياجات غذائية: {diet_str}")
            if stats.get("incomplete_bookings", 0) > 0:
                brief_parts.append(f"⚠️ طلبات لم تكتمل: {stats['incomplete_bookings']}")
            if stats.get("name_collection_rate", 100) < 80:
                brief_parts.append(f"📝 نسبة جمع الأسماء: {stats['name_collection_rate']}%")
        else:
            brief_parts.append("لا توجد طلبات هذا الأسبوع بعد")
        suggestion_lang = "You are a business consultant. Analyze the data and give 3-5 specific, data-driven recommendations in Arabic (Arabic script only). Include: what's working, what's failing, what to change. Be specific with numbers. If there are drop-offs or incomplete bookings, explain why and how to fix. If there are patterns in timing or occasions, suggest how to capitalize. Be direct and actionable."
        fallback = ["- ابدأ بالترويج لمشروعك على انستقرام", "- اطلب من زبائنك الحاليين يرسلون أصدقائهم"]
    else:
        brief_parts.append(f"📊 Weekly Intelligence Report")
        brief_parts.append("")
        if stats["total_bookings"] > 0:
            brief_parts.append(f"📋 Total bookings: {stats['total_bookings']}")
            brief_parts.append(f"👥 Unique customers: {stats['unique_customers']}")
            if stats.get("repeat_customers", 0) > 0:
                brief_parts.append(f"🔄 Repeat customers: {stats['repeat_customers']}")
            else:
                brief_parts.append(f"🔄 Repeat customers: 0 — no one came back yet")
            if stats["avg_party_size"] > 0:
                brief_parts.append(f"👨‍👩‍👧‍👦 Avg party size: {stats['avg_party_size']}")
            if stats.get("popular_times"):
                top_times = ", ".join(f"{t} ({v})" for t, v in list(stats["popular_times"].items())[:3])
                brief_parts.append(f"⏰ Peak times: {top_times}")
            if stats.get("seating_preferences"):
                seat_str = ", ".join(f"{k}: {v}" for k, v in stats["seating_preferences"].items())
                brief_parts.append(f"💺 Seating: {seat_str}")
            if stats["occasions"]:
                occ_str = ", ".join(f"{k}: {v}" for k, v in stats["occasions"].items())
                brief_parts.append(f"🎉 Occasions: {occ_str}")
            if stats.get("dietary_needs"):
                diet_str = ", ".join(f"{k}: {v}" for k, v in stats["dietary_needs"].items())
                brief_parts.append(f"🥗 Dietary needs: {diet_str}")
            if stats.get("incomplete_bookings", 0) > 0:
                drop_pct = round(stats["incomplete_bookings"] * 100 / stats["total_bookings"])
                brief_parts.append(f"⚠️ Drop-offs: {stats['incomplete_bookings']} ({drop_pct}% didn't complete)")
            if stats.get("name_collection_rate", 100) < 80:
                brief_parts.append(f"📝 Name collection: {stats['name_collection_rate']}% — missing customer names")
        else:
            brief_parts.append("No bookings this week yet")
        suggestion_lang = "You are a business consultant. Analyze the data and give 3-5 specific, data-driven recommendations in English. Include: what's working well, what's failing, specific actions to take. Reference the actual numbers. If drop-off rate is high, explain likely causes. If certain times are popular, suggest promotions for slow times. If no repeat customers, suggest retention tactics. Be direct, no fluff."
        fallback = ["- Promote your business on Instagram", "- Ask existing customers to refer friends"]

    brief_parts.append("")
    brief_parts.append("💡 Analysis & Recommendations:" if lang == "en" else "💡 تحليل واقتراحات:")

    # Feed ALL data to the AI for intelligent analysis
    if stats["total_bookings"] > 0 and _MINIMAX_KEY:
        # Compact data summary for the AI
        data_lines = [
            f"Bookings: {stats['total_bookings']}, Unique customers: {stats['unique_customers']}",
            f"Repeat customers: {stats.get('repeat_customers', 0)}",
            f"Avg party size: {stats['avg_party_size']}",
            f"Peak times: {', '.join(f'{t}({v})' for t,v in list(stats.get('popular_times',{}).items())[:3])}",
            f"Seating: {', '.join(f'{k}:{v}' for k,v in stats.get('seating_preferences',{}).items())}",
            f"Occasions: {', '.join(f'{k}:{v}' for k,v in stats.get('occasions',{}).items())}",
            f"Dietary: {', '.join(f'{k}:{v}' for k,v in stats.get('dietary_needs',{}).items())}",
            f"Drop-off: {stats.get('incomplete_bookings', 0)} incomplete ({round(stats.get('incomplete_bookings',0)*100/max(stats['total_bookings'],1))}%)",
            f"Name collection: {stats.get('name_collection_rate', 0)}%",
        ]
        data_dump = "\n".join(data_lines)

        try:
            async with httpx.AsyncClient(timeout=90) as http:
                r = await http.post(
                    "https://api.minimax.io/v1/chat/completions",
                    headers={"Authorization": f"Bearer {_MINIMAX_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": "MiniMax-M2.7",
                        "messages": [
                            {"role": "system", "content": suggestion_lang},
                            {"role": "user", "content": f"Business: {company}\n\nFull data:\n{data_dump}\n\nAnalyze this data. What patterns do you see? What's working? What's failing? Give specific, actionable recommendations based on the actual numbers."},
                        ],
                        "max_tokens": 1000,
                    },
                )
                resp_data = r.json()
                print(f"[research] MiniMax status: {r.status_code}, has choices: {bool(resp_data.get('choices'))}")
                if resp_data.get("choices"):
                    raw_analysis = resp_data["choices"][0].get("message", {}).get("content", "")
                    # Remove think tags — but if everything is in think tags (no closing), extract the content
                    analysis = re.sub(r"<think>[\s\S]*?</think>\s*", "", raw_analysis).strip()
                    if not analysis and "<think>" in raw_analysis:
                        # Model put everything in think tags — extract what's inside
                        analysis = re.sub(r"</?think>", "", raw_analysis).strip()
                    analysis = re.sub(r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u0400-\u04ff]+', '', analysis)
                    if analysis:
                        brief_parts.append(analysis)
                    else:
                        print(f"[research] MiniMax returned empty content")
                        brief_parts.extend(fallback)
                else:
                    print(f"[research] MiniMax no choices: {str(resp_data)[:200]}")
                    brief_parts.extend(fallback)
        except Exception as e:
            print(f"[research] AI analysis failed: {e}")
            import traceback
            traceback.print_exc()
            brief_parts.extend(fallback)
    else:
        brief_parts.extend(fallback)

    return "\n".join(brief_parts)


async def send_owner_brief(client_id: str, phone_number_id: str = "", kapso_key: str = ""):
    """Send weekly brief to the business owner via WhatsApp."""
    clients = await get_all_clients()
    client = next((c for c in clients if c["id"] == client_id), None)
    if not client:
        return {"error": "Client not found"}

    brief = await generate_weekly_brief(client_id)

    if phone_number_id and kapso_key:
        # Send via WhatsApp
        owner_phone = client.get("contact_phone", "")
        if owner_phone:
            async with httpx.AsyncClient(timeout=15) as http:
                await http.post(
                    f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages",
                    headers={"X-API-Key": kapso_key, "Content-Type": "application/json"},
                    json={
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": owner_phone,
                        "type": "text",
                        "text": {"body": brief},
                    },
                )

    return {"client_id": client_id, "brief": brief, "sent": bool(phone_number_id)}


async def run_weekly_research():
    """Run research for all active clients and return briefs."""
    clients = await get_all_clients()
    results = []

    for client in clients:
        try:
            brief = await generate_weekly_brief(client["id"])
            results.append({
                "client_id": client["id"],
                "company": client["company_name"],
                "brief": brief,
            })
        except Exception as e:
            results.append({
                "client_id": client["id"],
                "company": client["company_name"],
                "error": str(e),
            })

    return results
