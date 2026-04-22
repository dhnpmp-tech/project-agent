"""WhatsApp Number Provisioning — Post-payment setup flow.

After a client pays, we need to connect a WhatsApp number to their AI.
Two options:
1. Client connects their existing business number (via Kapso embedded signup)
2. We provision a new number for them (US instant via Kapso, or manual for UAE/KSA)

Flow:
  Payment confirmed → Send number choice message → Client responds
  → "1" (own number) → Generate Kapso setup link → Client clicks → Connected
  → "2" (new number) → Auto-provision US number via Kapso → Connected
  → Connected → Configure webhook → AI goes live → Send confirmation
"""

import os
import json
import re
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
_KAPSO_KEY = os.environ.get("KAPSO_PLATFORM_API_KEY", "")
_KAPSO_BASE = "https://api.kapso.ai/platform/v1"
_WEBHOOK_BASE = os.environ.get("WEBHOOK_BASE_URL", "https://n8n.srv1328172.hstgr.cloud")


# ═══════════════════════════════════════════════════════
# PROVISIONING STATE
# ═══════════════════════════════════════════════════════

# Track clients in the provisioning flow
_provisioning_sessions: dict[str, dict] = {}  # client_id -> {step, kapso_customer_id, ...}


def is_provisioning(client_id: str) -> bool:
    """Check if a client is in the provisioning flow."""
    return client_id in _provisioning_sessions


def get_provisioning_state(client_id: str) -> dict:
    """Get provisioning state for a client."""
    return _provisioning_sessions.get(client_id, {})


# ═══════════════════════════════════════════════════════
# KAPSO PLATFORM API
# ═══════════════════════════════════════════════════════

async def _kapso_request(method: str, path: str, body: dict = None) -> dict:
    """Make a request to Kapso Platform API."""
    if not _KAPSO_KEY:
        return {"error": "Kapso API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            kwargs = {
                "headers": {
                    "X-API-Key": _KAPSO_KEY,
                    "Content-Type": "application/json",
                },
            }
            if body:
                kwargs["json"] = body
            if method == "GET":
                r = await http.get(f"{_KAPSO_BASE}{path}", **kwargs)
            elif method == "POST":
                r = await http.post(f"{_KAPSO_BASE}{path}", **kwargs)
            else:
                r = await http.request(method, f"{_KAPSO_BASE}{path}", **kwargs)

            if r.status_code in (200, 201):
                return r.json()
            else:
                print(f"[provisioning] Kapso API error: {r.status_code} {r.text[:200]}")
                return {"error": f"Kapso API {r.status_code}", "detail": r.text[:200]}
    except Exception as e:
        print(f"[provisioning] Kapso request failed: {e}")
        return {"error": str(e)}


async def create_kapso_customer(client_id: str, company_name: str) -> dict:
    """Create a Kapso customer for this client."""
    result = await _kapso_request("POST", "/customers", {
        "name": company_name,
        "metadata": {"client_id": client_id},
    })
    if result.get("id"):
        # Store the Kapso customer ID
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                await http.patch(
                    f"{_SUPA_URL}/rest/v1/clients?id=eq.{client_id}",
                    headers=_SUPA_HEADERS,
                    json={"metadata": {"kapso_customer_id": result["id"]}},
                )
        except:
            pass
    return result


async def generate_setup_link(client_id: str, kapso_customer_id: str) -> dict:
    """Generate a Kapso embedded signup link for the client to connect their WhatsApp."""
    result = await _kapso_request("POST", f"/customers/{kapso_customer_id}/setup_links", {
        "success_redirect_url": f"{_WEBHOOK_BASE}/webhook/provisioning-complete?client_id={client_id}",
        "failure_redirect_url": f"{_WEBHOOK_BASE}/webhook/provisioning-failed?client_id={client_id}",
        "provision_phone_number": False,  # Client brings their own number
        "connection_type": "coexistence",
    })
    return result


async def generate_setup_link_with_number(client_id: str, kapso_customer_id: str) -> dict:
    """Generate a Kapso setup link that also provisions a new US number."""
    result = await _kapso_request("POST", f"/customers/{kapso_customer_id}/setup_links", {
        "success_redirect_url": f"{_WEBHOOK_BASE}/webhook/provisioning-complete?client_id={client_id}",
        "failure_redirect_url": f"{_WEBHOOK_BASE}/webhook/provisioning-failed?client_id={client_id}",
        "provision_phone_number": True,
        "phone_number_country_isos": ["US"],
        "connection_type": "coexistence",
    })
    return result


async def configure_webhook_for_client(client_id: str, kapso_customer_id: str) -> dict:
    """Set up webhook routing so this client's WhatsApp messages come to our pipeline."""
    result = await _kapso_request("POST", "/webhooks", {
        "url": f"{_WEBHOOK_BASE}/webhook/whatsapp",
        "events": ["messages", "statuses"],
        "customer_id": kapso_customer_id,
    })
    return result


# ═══════════════════════════════════════════════════════
# POST-PAYMENT FLOW
# ═══════════════════════════════════════════════════════

async def start_provisioning(client_id: str, owner_phone: str, lang: str = "ar") -> str:
    """Called after payment is confirmed. Sends the number choice to the owner.

    Returns the message to send via WhatsApp.
    """
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

    company = client.get("company_name", "Your business")

    # Create Kapso customer
    kapso_result = await create_kapso_customer(client_id, company)
    kapso_customer_id = kapso_result.get("id", "")

    # Store provisioning state
    _provisioning_sessions[client_id] = {
        "step": "choose_number",
        "owner_phone": owner_phone,
        "kapso_customer_id": kapso_customer_id,
        "company_name": company,
        "lang": lang,
        "started_at": datetime.now(timezone.utc).isoformat(),
    }

    if lang == "ar":
        return f"""تم الدفع بنجاح! شكراً لك.

الحين نحتاج نربط رقم واتساب بمساعدك الذكي.

عندك خيارين:

1. أربط رقم الواتساب حقي
   (رقمك التجاري الحالي — الزبائن يكلمونه ويرد عليهم الذكاء الاصطناعي)

2. أبغى رقم جديد
   (نعطيك رقم أمريكي جاهز — تقدر تستخدمه فوراً)

رد بـ 1 أو 2"""
    else:
        return f"""Payment confirmed! Thank you.

Now we need to connect a WhatsApp number to your AI assistant.

You have two options:

1. Connect my existing business number
   (Your current business WhatsApp — customers message it and the AI responds)

2. Get a new number
   (We give you a ready US number — you can start using it immediately)

Reply 1 or 2"""


async def process_provisioning_response(client_id: str, message: str) -> str:
    """Process the owner's response during provisioning."""
    session = _provisioning_sessions.get(client_id)
    if not session:
        return ""

    lang = session.get("lang", "en")
    step = session.get("step", "")
    kapso_customer_id = session.get("kapso_customer_id", "")

    msg = message.strip()

    if step == "choose_number":
        if msg in ("1", "١"):
            # Connect existing number
            if kapso_customer_id:
                link_result = await generate_setup_link(client_id, kapso_customer_id)
                setup_url = link_result.get("url", "")
            else:
                setup_url = ""

            session["step"] = "waiting_connection"
            session["method"] = "own_number"

            if setup_url:
                if lang == "ar":
                    return f"""ممتاز! اضغط على الرابط التالي لربط رقم الواتساب حقك:

{setup_url}

ملاحظة مهمة:
- بتسجل دخول بحساب الفيسبوك حقك
- تختار رقم الواتساب التجاري
- لو الرقم مربوط بتطبيق واتساب بزنس، بيتحول للـ API (ما تقدر تستخدم التطبيق على نفس الرقم)
- المحادثات القديمة بالتطبيق ما تنحذف بس ما تقدر ترد عليها من التطبيق بعدين

بعد ما تربط الرقم، بنفعّل مساعدك الذكي تلقائياً."""
                else:
                    return f"""Great choice! Tap this link to connect your WhatsApp number:

{setup_url}

Important notes:
- You'll log in with your Facebook account
- Select your business WhatsApp number
- If the number is on WhatsApp Business app, it will switch to API (you won't be able to use the app on that number anymore)
- Old chats in the app won't be deleted but you won't be able to reply from the app

Once connected, your AI assistant activates automatically."""
            else:
                if lang == "ar":
                    return "عذراً، ما قدرنا نسوي الرابط. تواصل معنا وبنساعدك."
                return "Sorry, we couldn't generate the setup link. Contact us for help."

        elif msg in ("2", "٢"):
            # Provision new US number
            if kapso_customer_id:
                link_result = await generate_setup_link_with_number(client_id, kapso_customer_id)
                setup_url = link_result.get("url", "")
            else:
                setup_url = ""

            session["step"] = "waiting_connection"
            session["method"] = "new_number"

            if setup_url:
                if lang == "ar":
                    return f"""تمام! بنعطيك رقم أمريكي جاهز.

اضغط على الرابط التالي لإكمال الربط:

{setup_url}

- بتسجل دخول بحساب الفيسبوك
- بنربط رقم جديد تلقائياً
- الرقم بيكون جاهز خلال دقائق

بعد ما تنتهي، بنرسلك الرقم الجديد وبنفعّل مساعدك الذكي."""
                else:
                    return f"""Got it! We'll set you up with a new number.

Tap this link to complete the setup:

{setup_url}

- You'll log in with Facebook
- A new number will be provisioned automatically
- It'll be ready in minutes

Once done, we'll send you the new number and activate your AI assistant."""
            else:
                if lang == "ar":
                    return "عذراً، ما قدرنا نسوي الرابط. تواصل معنا وبنساعدك."
                return "Sorry, we couldn't generate the setup link. Contact us for help."

        else:
            if lang == "ar":
                return "رد بـ 1 (ربط رقمك الحالي) أو 2 (رقم جديد)"
            return "Reply 1 (connect your number) or 2 (get a new number)"

    elif step == "waiting_connection":
        if lang == "ar":
            return "لسا ننتظر تربط الرقم من الرابط اللي أرسلناه. لو تحتاج مساعدة تواصل معنا."
        return "Still waiting for you to complete the number setup from the link we sent. Contact us if you need help."

    return ""


# ═══════════════════════════════════════════════════════
# CONNECTION COMPLETION
# ═══════════════════════════════════════════════════════

async def handle_provisioning_complete(client_id: str, phone_number_id: str = "", display_number: str = "") -> dict:
    """Called when Kapso confirms the WhatsApp number is connected.

    This is triggered by:
    - The success redirect URL callback
    - Or a Kapso webhook event (whatsapp.phone_number.created)
    """
    session = _provisioning_sessions.get(client_id, {})
    kapso_customer_id = session.get("kapso_customer_id", "")
    owner_phone = session.get("owner_phone", "")
    lang = session.get("lang", "en")
    company = session.get("company_name", "")

    # Configure webhook for this client's messages
    if kapso_customer_id:
        await configure_webhook_for_client(client_id, kapso_customer_id)

    # Store the phone_number_id in the client record
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            # Get existing metadata
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/clients?id=eq.{client_id}&select=metadata",
                headers=_SUPA_HEADERS,
            )
            existing = r.json()[0].get("metadata", {}) if r.json() else {}
            if isinstance(existing, str):
                try:
                    existing = json.loads(existing)
                except:
                    existing = {}

            existing["phone_number_id"] = phone_number_id
            existing["display_number"] = display_number
            existing["kapso_customer_id"] = kapso_customer_id
            existing["provisioned_at"] = datetime.now(timezone.utc).isoformat()
            existing["subscription_status"] = "active"

            await http.patch(
                f"{_SUPA_URL}/rest/v1/clients?id=eq.{client_id}",
                headers=_SUPA_HEADERS,
                json={"metadata": existing},
            )

            # Also register in the PHONE_TO_CLIENT routing table
            # (this is done in app.py's memory, but we also store it)
            await http.post(
                f"http://localhost:8200/register-route",
                json={"phone_number_id": phone_number_id, "client_id": client_id},
            )
    except Exception as e:
        print(f"[provisioning] Failed to store phone_number_id: {e}")

    # Clean up provisioning session
    _provisioning_sessions.pop(client_id, None)

    # Send confirmation to owner
    number_display = display_number or phone_number_id or "your new number"

    if lang == "ar":
        confirmation = f"""تم التفعيل! مساعدك الذكي لـ «{company}» شغّال الحين!

الرقم: {number_display}

مساعدك الذكي الحين:
- يرد على زبائنك ٢٤/٧
- يتذكر كل عميل وتفضيلاته
- يتعلم ويتحسن كل يوم
- يرسلك تقرير يومي كل صباح

أرسل لنا أي أمر — مثلاً:
  'تقرير العملاء'
  'مبيعات'
  'محتوى'
  'قوقل'

مبروك! 🎉"""
    else:
        confirmation = f"""Activated! Your AI assistant for «{company}» is now live!

Number: {number_display}

Your AI is now:
- Responding to customers 24/7
- Remembering every customer and their preferences
- Learning and improving every day
- Sending you a daily scorecard every morning

Send any command — for example:
  'guest report'
  'sales'
  'content'
  'google'

Congratulations! 🎉"""

    # Send via Kapso if we have the owner's phone
    if owner_phone and phone_number_id:
        try:
            kapso_msg_key = os.environ.get("KAPSO_PLATFORM_API_KEY", "")
            async with httpx.AsyncClient(timeout=15) as http:
                await http.post(
                    f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages",
                    headers={"X-API-Key": kapso_msg_key, "Content-Type": "application/json"},
                    json={
                        "messaging_product": "whatsapp",
                        "to": owner_phone,
                        "type": "text",
                        "text": {"body": confirmation},
                    },
                )
        except:
            pass

    return {
        "status": "active",
        "client_id": client_id,
        "phone_number_id": phone_number_id,
        "display_number": display_number,
        "message": confirmation,
    }


# ═══════════════════════════════════════════════════════
# STATUS CHECK
# ═══════════════════════════════════════════════════════

async def get_provisioning_status(client_id: str) -> dict:
    """Check where a client is in the provisioning flow."""
    session = _provisioning_sessions.get(client_id)
    if session:
        return {
            "status": "in_progress",
            "step": session.get("step", ""),
            "method": session.get("method", ""),
            "started_at": session.get("started_at", ""),
        }

    # Check if already provisioned
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/clients?id=eq.{client_id}&select=metadata",
                headers=_SUPA_HEADERS,
            )
            meta = r.json()[0].get("metadata", {}) if r.json() else {}
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except:
                    meta = {}

            if meta.get("phone_number_id"):
                return {
                    "status": "active",
                    "phone_number_id": meta["phone_number_id"],
                    "display_number": meta.get("display_number", ""),
                    "provisioned_at": meta.get("provisioned_at", ""),
                }
    except:
        pass

    return {"status": "not_started"}
