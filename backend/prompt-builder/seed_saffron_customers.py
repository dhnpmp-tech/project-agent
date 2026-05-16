"""Seed synthetic customer threads for Saffron Kitchen.

Why this exists: Saffron's marketing pages claim a live customer-memory
dashboard, but the demo number has 2 real customers (both founder
test traffic, both stale). A prospect who lands on /dashboard/customers
to evaluate the platform sees an almost-empty table.

This script injects six realistic customer threads spanning the
persona archetypes we advertise (VIP regular, lapsed, at-risk,
group organizer, new, allergic). Every inserted message carries
metadata.synthetic = true so the rows are trivially auditable
(SELECT ... WHERE metadata @> '{"synthetic": true}').

After running this, customer_memory_analyzer.analyze_tenant() will
produce real LLM-derived profiles against the synthetic transcripts,
and /dashboard/customers will look lived-in.

Idempotent: re-running deletes the prior synthetic rows first.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from database import db

logger = logging.getLogger("seed_saffron_customers")

SAFFRON_CLIENT_ID = "3bd50557-6680-43b9-bb8e-261c7f8a19d2"

# Phones in the Etisalat 971-599 range, distinct from real Saffron traffic.
# Last digits encode persona archetype for easy mental mapping.
PERSONAS: list[dict[str, Any]] = [
    {
        "phone": "971599100001",
        "persona": "vip_regular",
        "name": "Maya Khalil",
        "weeks_ago_first": 14,
        "weeks_ago_last": 1,
        "thread": [
            ("inbound",  "Hi! Maya here. Same Friday 8pm table for two? Outdoor."),
            ("outbound", "Welcome back Maya. Booked: Friday 8pm, outdoor terrace, two guests. Should I have the Châteauneuf-du-Pape '18 decanted at 7:45 as usual?"),
            ("inbound",  "Yes please. And ask the chef about the saffron risotto, can he make it without parmesan? My partner is dairy-free this month."),
            ("outbound", "Noted — dairy-free risotto for guest 2. I'll flag it to chef. See you Friday."),
            ("inbound",  "Perfect, thanks. Also — we're celebrating our anniversary, can we get a small dessert plate at the end? No singing."),
            ("outbound", "Of course. Anniversary dessert, no singing, no candles parade. The team will know. Congrats both of you 🌹"),
            ("inbound",  "Amazing as always 🥂"),
        ],
    },
    {
        "phone": "971599100002",
        "persona": "lapsed",
        "name": "Omar Nasser",
        "weeks_ago_first": 32,
        "weeks_ago_last": 18,
        "thread": [
            ("inbound",  "Hello, I'd like to book a table for 4 this Saturday at 7:30pm please."),
            ("outbound", "Hi Omar. Saturday 7:30pm, four guests confirmed. Booked under your name. Any allergies for the party?"),
            ("inbound",  "No allergies, but my mother prefers a quiet corner. She's not great with crowds."),
            ("outbound", "Booth in the back room reserved — quietest spot in the restaurant. See you Saturday."),
            ("inbound",  "Great. We had a wonderful evening last time, please thank chef again."),
            ("outbound", "He'll be happy to hear. See you soon!"),
        ],
    },
    {
        "phone": "971599100003",
        "persona": "at_risk_complaint",
        "name": "Sara Mahmoud",
        "weeks_ago_first": 9,
        "weeks_ago_last": 7,
        "thread": [
            ("inbound",  "Hi, I want to give feedback about Saturday's dinner. We waited 35 minutes for our mains and the lamb was overcooked. Three of us had the same dish."),
            ("outbound", "Sara, I'm really sorry. That's not the standard. Can I send your feedback directly to the head chef? Also — would you allow us to invite you back as our guests so we can make it right?"),
            ("inbound",  "Yes please pass it on. I don't want a free meal, I just want to know if it's worth coming back."),
            ("outbound", "Understood. The kitchen is reviewing service-time issues from that night. I'd like to keep your number in case the chef wants to follow up personally — only if you're OK with that."),
            ("inbound",  "Sure, that's fine."),
            ("outbound", "Thank you for the honesty Sara. It genuinely helps."),
        ],
    },
    {
        "phone": "971599100004",
        "persona": "group_organizer",
        "name": "Karim Al-Abbasi",
        "weeks_ago_first": 6,
        "weeks_ago_last": 2,
        "thread": [
            ("inbound",  "Hi! I'm organizing a birthday dinner for 12 people on the 28th. Can we get the private area?"),
            ("outbound", "Hi Karim. The private alcove fits 14 max, 12 is comfortable. Date and time?"),
            ("inbound",  "Friday the 28th, 9pm. Set menu would be great — what are the options?"),
            ("outbound", "Three set menus: 220 AED (3 courses), 295 AED (4 courses incl. signature lamb), 380 AED (chef's tasting, 6 courses). All can be made halal-only, vegan-only, or pescatarian on request."),
            ("inbound",  "Let's do the 295 menu, mostly halal but two of my friends are vegetarian — can they get an alt main?"),
            ("outbound", "Yes — eggplant moussaka or saffron risotto for the two vegetarians, same course count. I'll lock the booking and send a confirmation."),
            ("inbound",  "Perfect. Birthday cake — can you arrange one? Chocolate, name is 'Layla'. No big surprise, she hates that."),
            ("outbound", "Small chocolate cake, plate brought to table without song. Done. See you the 28th."),
            ("inbound",  "You're the best. Thanks!"),
        ],
    },
    {
        "phone": "971599100005",
        "persona": "new_lead",
        "name": None,  # Hasn't shared name yet
        "weeks_ago_first": 0,
        "weeks_ago_last": 0,
        "thread": [
            ("inbound",  "hi, is this saffron?"),
            ("outbound", "Yes! This is Saffron Kitchen, Dubai. How can I help?"),
            ("inbound",  "do you have parking?"),
            ("outbound", "We have valet from 6pm onwards (15 AED), and there's a public lot 2 minutes walk away that's free after 8pm."),
            ("inbound",  "okay. and do you have a menu i can see?"),
            ("outbound", "Of course — here's the full menu: saffronkitchen.ae/menu. Anything specific I can flag? We're known for the lamb shoulder and the saffron risotto."),
            ("inbound",  "thanks, ill check"),
        ],
    },
    {
        "phone": "971599100006",
        "persona": "allergic",
        "name": "Fatima Al-Hashimi",
        "weeks_ago_first": 20,
        "weeks_ago_last": 3,
        "thread": [
            ("inbound",  "Hi! Fatima here, I have a confirmed allergy to gluten (celiac, not preference). Last time you were very careful, can I book again for Thursday 7pm, two guests?"),
            ("outbound", "Welcome back Fatima. Thursday 7pm for two, booked. The kitchen has your celiac flag from your previous visits — chef will handle the order personally as before."),
            ("inbound",  "Thank you. My friend is coming for the first time. He has no allergies but doesn't eat shellfish."),
            ("outbound", "Noted: guest 2, no shellfish. We'll quietly steer recommendations away from the prawn risotto. Have a lovely evening Thursday."),
            ("inbound",  "Also — can the bread basket be replaced with the chickpea crackers like last time?"),
            ("outbound", "Yes — gluten-free chickpea crackers will be at the table when you sit. See you Thursday."),
            ("inbound",  "You're so good at this. Truly."),
        ],
    },
]


async def _clear_synthetic_rows() -> int:
    """Remove prior synthetic conversation rows + customer_memory rows for Saffron."""
    # Delete synthetic conversation_messages
    result = await db.query(
        """
        DELETE FROM conversation_messages
        WHERE client_id = $1 AND metadata @> '{"synthetic": true}'::jsonb
        RETURNING id
        """,
        SAFFRON_CLIENT_ID,
    )
    msg_count = len(result)
    # Delete customer_memory rows for synthetic phones
    phones = [p["phone"] for p in PERSONAS]
    for phone in phones:
        await db.query(
            "DELETE FROM customer_memory WHERE client_id = $1 AND phone_number = $2",
            SAFFRON_CLIENT_ID,
            phone,
        )
    return msg_count


async def _insert_thread(persona: dict[str, Any]) -> None:
    """Insert a single persona's message thread with realistic timestamps."""
    phone = persona["phone"]
    weeks_ago_first = persona["weeks_ago_first"]
    weeks_ago_last = persona["weeks_ago_last"]
    thread = persona["thread"]
    n_msgs = len(thread)
    # Spread messages from weeks_ago_first → weeks_ago_last
    now = datetime.now(timezone.utc)
    start = now - timedelta(weeks=weeks_ago_first)
    end = now - timedelta(weeks=weeks_ago_last)
    span = (end - start).total_seconds()
    step = span / max(1, n_msgs - 1) if n_msgs > 1 else 0

    metadata = {
        "synthetic": True,
        "persona": persona["persona"],
        "name_hint": persona.get("name"),
    }

    for i, (direction, content) in enumerate(thread):
        ts = start + timedelta(seconds=i * step)
        await db.query(
            """
            INSERT INTO conversation_messages
              (client_id, customer_phone, direction, content, message_type, metadata, created_at)
            VALUES ($1, $2, $3, $4, 'text', $5::jsonb, $6)
            """,
            SAFFRON_CLIENT_ID,
            phone,
            direction,
            content,
            json.dumps(metadata),
            ts,
        )


async def seed() -> dict[str, Any]:
    cleared = await _clear_synthetic_rows()
    inserted = 0
    for persona in PERSONAS:
        await _insert_thread(persona)
        inserted += len(persona["thread"])
    return {
        "cleared_synthetic_messages": cleared,
        "inserted_messages": inserted,
        "personas": len(PERSONAS),
        "client_id": SAFFRON_CLIENT_ID,
    }


if __name__ == "__main__":
    async def _main() -> None:
        r = await seed()
        print(json.dumps(r, indent=2))

    asyncio.run(_main())
