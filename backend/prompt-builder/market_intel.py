"""Market Intelligence — Social listening via last30days.

Searches 13+ platforms (Reddit, X, YouTube, TikTok, Instagram, HN, GitHub)
and synthesizes findings into actionable intelligence for:
- Owner Brain morning briefs
- Content Engine trending topics  
- Sales Rep prospect research
- Karpathy Loop external signals
- DCP competitive monitoring
"""

import os
import json
import subprocess
import httpx
from datetime import datetime, timezone, timedelta

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Ynpxa3RpcGltYm11anRvd296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwOTY5NCwiZXhwIjoyMDkwMDg1Njk0fQ.-DoNS5fZv3aUsFcugKg23yh9RqXXFIlgc5_9Hrk97bg")
_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}
_LAST30_PATH = "/opt/last30days"


async def research_topic(topic: str, quick: bool = True) -> dict:
    """Run a last30days research query on a topic.
    Returns structured findings from Reddit, X, YouTube, HN, etc."""
    try:
        cmd = ["python3", f"{_LAST30_PATH}/scripts/last30days.py", topic, "--emit=json"]
        if quick:
            cmd.append("--quick")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120, cwd=_LAST30_PATH)
        if result.returncode == 0 and result.stdout.strip():
            # The JSON may be preceded by status lines; extract just the JSON
            stdout = result.stdout.strip()
            # Find the first '{' that starts the JSON object
            json_start = stdout.find('{')
            if json_start >= 0:
                return json.loads(stdout[json_start:])
            return {"error": "no JSON in output", "topic": topic}
        return {"error": result.stderr[:200] if result.stderr else "no output", "topic": topic}
    except subprocess.TimeoutExpired:
        return {"error": "timeout", "topic": topic}
    except json.JSONDecodeError as e:
        return {"error": f"JSON parse error: {e}", "topic": topic}
    except Exception as e:
        return {"error": str(e), "topic": topic}


async def get_market_brief(client_id: str, lang: str = "en") -> str:
    """Generate a market intelligence brief for the Owner Brain.
    Searches for the business name + industry trends."""
    # Get client info
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/clients?id=eq.{client_id}&select=company_name,metadata",
                headers=_SUPA_HEADERS,
            )
            client = r.json()[0] if r.json() else {}
    except:
        client = {}
    
    company = client.get("company_name", "")
    meta = client.get("metadata", {})
    if isinstance(meta, str):
        try: meta = json.loads(meta)
        except: meta = {}
    industry = meta.get("industry", "restaurant")
    
    # Research the business and industry
    findings = await research_topic(f"{company} {industry}", quick=True)
    
    if findings.get("error"):
        if lang == "ar":
            return f"لم نجد معلومات جديدة عن {company} هذا الأسبوع."
        return f"No new market intelligence found for {company} this week."
    
    # Format for WhatsApp
    clusters = findings.get("clusters", findings.get("results", []))
    if not clusters:
        if lang == "ar":
            return f"لم نجد معلومات جديدة عن {company} هذا الأسبوع."
        return f"No new market intelligence found for {company} this week."
    
    lines = []
    if lang == "ar":
        lines.append(f"معلومات السوق — {company}")
        lines.append("")
        for i, item in enumerate(clusters[:5], 1):
            title = item.get("title", item.get("headline", ""))
            source = item.get("source", item.get("platform", ""))
            if not source:
                sources = item.get("sources", [])
                source = ", ".join(sources) if sources else ""
            engagement = item.get("engagement", item.get("score", ""))
            lines.append(f"{i}. {title}")
            if source:
                lines.append(f"   المصدر: {source}")
            if engagement:
                lines.append(f"   التفاعل: {engagement}")
            lines.append("")
    else:
        lines.append(f"Market Intelligence — {company}")
        lines.append("")
        for i, item in enumerate(clusters[:5], 1):
            title = item.get("title", item.get("headline", ""))
            source = item.get("source", item.get("platform", ""))
            if not source:
                sources = item.get("sources", [])
                source = ", ".join(sources) if sources else ""
            engagement = item.get("engagement", item.get("score", ""))
            lines.append(f"{i}. {title}")
            if source:
                lines.append(f"   Source: {source}")
            if engagement:
                lines.append(f"   Engagement: {engagement}")
            lines.append("")
    
    return "\n".join(lines)


async def get_trending_content_ideas(business_type: str = "restaurant", location: str = "Dubai") -> list:
    """Get trending content ideas from social platforms for the Content Engine."""
    findings = await research_topic(f"{business_type} trends {location} 2026", quick=True)
    ideas = []
    for item in (findings.get("clusters", findings.get("results", [])) or [])[:10]:
        ideas.append({
            "topic": item.get("title", item.get("headline", "")),
            "source": item.get("source", item.get("platform", "")),
            "engagement": item.get("engagement", item.get("score", 0)),
            "url": item.get("url", ""),
        })
    return ideas


async def research_prospect(business_name: str, location: str = "") -> dict:
    """Research a prospect for the Sales Rep before outreach."""
    query = f"{business_name} {location}".strip()
    findings = await research_topic(query, quick=True)
    return {
        "prospect": business_name,
        "findings": findings.get("clusters", findings.get("results", []))[:5],
        "social_presence": findings.get("sources_found", []),
        "sentiment": findings.get("sentiment", "neutral"),
    }


async def monitor_competitors(competitors: list) -> dict:
    """Monitor competitor activity for competitive intelligence."""
    results = {}
    for comp in competitors[:5]:
        findings = await research_topic(comp, quick=True)
        results[comp] = {
            "mentions": len(findings.get("clusters", findings.get("results", []))),
            "top_finding": (findings.get("clusters", findings.get("results", [{}]))[0] if findings.get("clusters", findings.get("results", [])) else {}),
        }
    return results


async def get_karpathy_signals(client_id: str) -> list:
    """Get external signals for the Karpathy Loop — what customers in this industry are talking about."""
    # Get client industry
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/clients?id=eq.{client_id}&select=metadata",
                headers=_SUPA_HEADERS,
            )
            meta = r.json()[0].get("metadata", {}) if r.json() else {}
            if isinstance(meta, str): meta = json.loads(meta)
    except:
        meta = {}
    
    industry = meta.get("industry", "restaurant")
    findings = await research_topic(f"{industry} customer complaints common questions UAE Saudi", quick=True)
    
    signals = []
    for item in (findings.get("clusters", findings.get("results", [])) or [])[:5]:
        signals.append({
            "topic": item.get("title", ""),
            "source": item.get("source", ""),
            "relevance": "Add to AI knowledge base if customers are asking about this",
        })
    return signals
