"""WhatsApp-based business onboarding — 5 questions, 2 minutes, done.

The owner texts a special onboarding number. The AI asks questions
and builds the KB automatically. No website, no dashboard, no forms.
"""

import os
import json
import re
import httpx
from datetime import datetime, timezone, timedelta
from collections import defaultdict

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Ynpxa3RpcGltYm11anRvd296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwOTY5NCwiZXhwIjoyMDkwMDg1Njk0fQ.-DoNS5fZv3aUsFcugKg23yh9RqXXFIlgc5_9Hrk97bg")
_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}
_MINIMAX_KEY = os.environ.get("MINIMAX_API_KEY", "")

# Onboarding state per phone number
_onboarding_sessions: dict[str, dict] = {}

# The onboarding questions in order
QUESTIONS = [
    {
        "key": "business_name",
        "ask_ar": "هلا وغلا! أنا بساعدك تسجل مشروعك عندنا.\n\nأول شي: وش اسم مشروعك؟",
        "ask_en": "Welcome! I'll help you register your business.\n\nFirst: what's your business name?",
    },
    {
        "key": "business_type",
        "ask_ar": "حلو! وش نوع مشروعك؟\n\n1. مطعم\n2. كافيه\n3. صالون تجميل\n4. عقارات\n5. عيادة\n6. متجر / بيع منتجات\n\nرد بالرقم أو اكتب النوع",
        "ask_en": "Nice! What type of business?\n\n1. Restaurant\n2. Cafe\n3. Salon / Beauty\n4. Real estate\n5. Healthcare / Clinic\n6. Retail / Shop\n\nReply with number or type",
    },
    {
        "key": "products",
        "ask_ar": "تمام! الحين قولي: وش تقدمون بالضبط؟\n\nاكتب المنتجات أو الخدمات مع الأسعار",
        "ask_en": "Got it! Now tell me: what do you offer?\n\nList your products or services with prices.",
    },
    {
        "key": "delivery",
        "ask_ar": "ممتاز! وين تخدمون؟\n\nمثلاً: الرياض بس، كل السعودية، أو أحياء معينة",
        "ask_en": "Great! Where do you serve?\n\nExample: Riyadh only, all of Saudi, specific areas",
    },
    {
        "key": "payment",
        "ask_ar": "حلو! كيف يدفعون الزبائن؟\n\nمثلاً: تحويل بنكي، كاش، STC Pay، مدى، أبل باي",
        "ask_en": "How do customers pay?\n\nExample: bank transfer, cash, STC Pay, mada, Apple Pay",
    },
    {
        "key": "contact",
        "ask_ar": "آخر شي! وش رقم الواتساب حق الطلبات؟ وعندك انستقرام أو موقع؟",
        "ask_en": "Last one! WhatsApp number for orders? Instagram or website?",
    },
]

# Map user responses to standard business types
BUSINESS_TYPE_MAP = {
    # Numbers
    "1": "restaurant", "2": "cafe", "3": "salon", "4": "real_estate", "5": "healthcare", "6": "retail",
    # English
    "restaurant": "restaurant", "cafe": "cafe", "coffee": "cafe", "salon": "salon",
    "beauty": "salon", "spa": "salon", "barber": "salon", "real estate": "real_estate",
    "property": "real_estate", "clinic": "healthcare", "hospital": "healthcare",
    "dental": "healthcare", "shop": "retail", "store": "retail", "retail": "retail",
    # Arabic
    "مطعم": "restaurant", "كافيه": "cafe", "قهوة": "cafe", "مقهى": "cafe",
    "صالون": "salon", "تجميل": "salon", "حلاق": "salon", "عقار": "real_estate",
    "عقارات": "real_estate", "عيادة": "healthcare", "مستشفى": "healthcare",
    "متجر": "retail", "محل": "retail", "بيع": "retail",
}


def _detect_language(text: str) -> str:
    """Detect if message is Arabic or English."""
    arabic = len(re.findall(r'[\u0600-\u06FF]', text))
    latin = len(re.findall(r'[a-zA-Z]', text))
    return "ar" if arabic >= latin else "en"


def get_onboarding_state(phone: str) -> dict:
    """Get or create onboarding session for a phone number."""
    if phone not in _onboarding_sessions:
        _onboarding_sessions[phone] = {
            "step": 0,
            "data": {},
            "lang": "ar",
            "started_at": datetime.now().isoformat(),
        }
    return _onboarding_sessions[phone]


def is_onboarding(phone: str) -> bool:
    """Check if this phone is in an onboarding session."""
    return phone in _onboarding_sessions and _onboarding_sessions[phone]["step"] < len(QUESTIONS)


async def process_onboarding_message(phone: str, message: str, contact_name: str = "") -> str:
    """Process a message in the onboarding flow. Returns the reply."""
    session = get_onboarding_state(phone)

    # Detect language on first message
    if session["step"] == 0 and not session["data"]:
        session["lang"] = _detect_language(message)

    lang = session["lang"]
    step = session["step"]

    # First message — start the flow
    if step == 0 and not session["data"].get("_started"):
        session["data"]["_started"] = True
        q = QUESTIONS[0]
        return q["ask_ar"] if lang == "ar" else q["ask_en"]

    # Save the answer to the current question
    if step < len(QUESTIONS):
        key = QUESTIONS[step]["key"]
        session["data"][key] = message
        session["step"] = step + 1

    # If there are more questions, ask the next one
    if session["step"] < len(QUESTIONS):
        q = QUESTIONS[session["step"]]
        return q["ask_ar"] if lang == "ar" else q["ask_en"]

    # All questions answered — build the business
    result = await _create_business(phone, session["data"], contact_name, lang)

    # Clean up session
    del _onboarding_sessions[phone]

    return result


async def _create_business(phone: str, data: dict, contact_name: str, lang: str) -> str:
    """Create the business in Supabase from collected answers."""
    import uuid

    client_id = str(uuid.uuid4())
    biz_name = data.get("business_name", "My Business")
    biz_type_raw = data.get("business_type", "retail").strip().lower()
    biz_type = BUSINESS_TYPE_MAP.get(biz_type_raw, "retail")
    products = data.get("products", "")
    delivery = data.get("delivery", "")
    payment = data.get("payment", "")
    contact = data.get("contact", phone)

    # Parse products into structured format
    product_lines = [l.strip() for l in products.replace("،", "\n").replace(",", "\n").replace("-", "\n").split("\n") if l.strip()]

    # Build description
    description = f"{biz_name} ({biz_type}). المنتجات: {products}. التوصيل: {delivery}. الدفع: {payment}. التواصل: {contact}"

    # Business-type-specific goal and category name
    _GOALS = {
        "restaurant": "حجز الطاولات وأخذ الطلبات. اسألي عن الاسم والتاريخ والوقت وعدد الأشخاص.",
        "cafe": "أخذ طلبات القهوة والتوصيل. اقترحي المنتجات الأكثر مبيعاً.",
        "salon": "حجز المواعيد. اسألي عن الخدمة المطلوبة والتاريخ والوقت المفضل.",
        "real_estate": "جمع بيانات العميل ومتطلباته. اسألي عن الميزانية والموقع المفضل.",
        "healthcare": "حجز المواعيد. اسألي عن التخصص المطلوب والتاريخ المفضل.",
        "retail": "بيع المنتجات وأخذ الطلبات. اقترحي منتجات إضافية.",
    }
    _CATEGORIES = {
        "restaurant": "القائمة", "cafe": "المنتجات", "salon": "الخدمات",
        "real_estate": "العقارات", "healthcare": "الخدمات", "retail": "المنتجات",
    }

    goal = _GOALS.get(biz_type, _GOALS["retail"])
    category = _CATEGORIES.get(biz_type, "المنتجات")

    # Build voice prompt for the persona
    voice_prompt = f"""أنا مساعد {biz_name} على الواتساب.

{category}:
{products}

التوصيل/الموقع: {delivery}
طرق الدفع: {payment}
التواصل: {contact}

طريقتي:
- أرحب بكل عميل بحرارة
- أساعده يختار المناسب
- {goal}
- أكون فعّالة وأقترح إضافات
- أتابع مع العميل بعد الخدمة
- كل ردودي بالعربي بالحروف العربية إلا لو العميل كلمني بالإنجليزي
- ما أبيع أي شي غير المذكور فوق"""

    crawl_data = {
        "business_type": biz_type,
        "industry": biz_type,
        "persona": {"voice_prompt": voice_prompt, "name": f"مساعد {biz_name}"},
        "menu_highlights": [{"category": category, "items": product_lines}],
        "daily_specials": [],
        "conversation_goals": {"primary_goal": goal},
        "learned_rules": [],
    }

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            # Create client
            await http.post(
                f"{_SUPA_URL}/rest/v1/clients",
                headers=_SUPA_HEADERS,
                json={
                    "id": client_id,
                    "slug": (re.sub(r'[^a-z0-9]', '-', biz_name.lower()).strip('-')[:30] or f"biz-{client_id[:8]}"),
                    "company_name": biz_name,
                    "contact_name": contact_name or biz_name,
                    "contact_email": f"{phone}@placeholder.com",
                    "contact_phone": phone,
                    "country": "SA",
                    "plan": "starter",
                    "status": "active",
                    "metadata": {"subscription_status": "trialing", "industry": biz_type},
                },
            )

            # Create KB
            await http.post(
                f"{_SUPA_URL}/rest/v1/business_knowledge",
                headers=_SUPA_HEADERS,
                json={
                    "client_id": client_id,
                    "business_description": description,
                    "brand_voice": "دافئ وشخصي. لهجة سعودية. فعّال بالبيع.",
                    "business_hours": "متاح على الواتساب من ٩ صباحاً لـ ١٠ مساءً",
                    "contact_info": {"phone": phone, "whatsapp": contact, "instagram": ""},
                    "services": product_lines,
                    "crawl_data": crawl_data,
                },
            )

            print(f"[onboarding] Business created: {biz_name} ({client_id})")

    except Exception as e:
        print(f"[onboarding] Error creating business: {e}")
        if lang == "ar":
            return "عذراً، صار خطأ. حاول مرة ثانية"
        return "Sorry, something went wrong. Please try again."

    # Generate payment link
    payment_url = ""
    try:
        from billing import create_tap_checkout
        checkout = await create_tap_checkout(client_id, "starter", "AED", include_setup=True)
        payment_url = checkout.get("checkout_url", "")
    except Exception as e:
        print(f"[onboarding] Payment link failed: {e}")

    # Auto-detect Google Business Profile in background
    gbp_result = ""
    try:
        from google_business import auto_detect_gbp
        gbp = await auto_detect_gbp(client_id, biz_name, delivery)
        if gbp.get("found"):
            score = gbp.get("audit_score", 0)
            rating = gbp.get("profile", {}).get("rating", 0)
            reviews = gbp.get("profile", {}).get("reviews_count", 0)
            if lang == "ar":
                gbp_result = f"\n\nلقينا ملفك على قوقل! تقييمك {rating}/5 ({reviews} تقييم). نتيجة الملف: {score}/100"
                tips = gbp.get("top_recommendations", [])
                if tips:
                    gbp_result += "\nنصائح لتحسين ظهورك:"
                    for tip in tips[:2]:
                        t = tip if isinstance(tip, str) else tip.get("text_ar", tip.get("text", ""))
                        if t:
                            gbp_result += f"\n- {t}"
            else:
                gbp_result = f"\n\nFound your Google profile! Rating: {rating}/5 ({reviews} reviews). Profile score: {score}/100"
                tips = gbp.get("top_recommendations", [])
                if tips:
                    gbp_result += "\nTips to improve visibility:"
                    for tip in tips[:2]:
                        t = tip if isinstance(tip, str) else tip.get("text_en", tip.get("text", ""))
                        if t:
                            gbp_result += f"\n- {t}"
        print(f"[onboarding] GBP auto-detect: found={gbp.get('found')}, score={gbp.get('audit_score')}")
    except Exception as e:
        print(f"[onboarding] GBP auto-detect skipped: {e}")

    payment_line_en = f"\nActivate your AI assistant:\n{payment_url}" if payment_url else "\nContact us to activate your plan."
    payment_line_ar = f"\nفعّل مساعدك الذكي:\n{payment_url}" if payment_url else "\nتواصل معنا لتفعيل اشتراكك."

    if lang == "ar":
        return f"""تم! مشروعك «{biz_name}» مسجل.

مساعدك الذكي جاهز — بس يحتاج تفعيل:
- يرد على زبائنك ٢٤/٧ على الواتساب
- يتعلم ويتحسن من كل محادثة
- يتذكر كل عميل وتفضيلاته
- تقرير يومي على واتسابك
{gbp_result}
{payment_line_ar}"""
    else:
        return f"""Done! Your business «{biz_name}» is registered.

Your AI assistant is ready — just needs activation:
- Responds to customers 24/7 on WhatsApp
- Learns and improves from every conversation
- Remembers every customer and their preferences
- Daily scorecard delivered to your WhatsApp
{gbp_result}
{payment_line_en}"""
