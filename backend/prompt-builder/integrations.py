"""Custom integrations for tools not in Composio's catalog.
SevenRooms (reservations), Tabby (UAE BNPL), Tamara (KSA BNPL)."""

import httpx
import os
from typing import Optional
from datetime import datetime


# ═══════════════════════════════════════════════════════
# SEVENROOMS — Restaurant Reservations
# ═══════════════════════════════════════════════════════

class SevenRoomsClient:
    """SevenRooms API client for restaurant reservations."""

    BASE_URL = "https://api.sevenrooms.com/2_4"

    def __init__(self, client_id: str = "", client_secret: str = "", venue_id: str = ""):
        self.client_id = client_id or os.environ.get("SEVENROOMS_CLIENT_ID", "")
        self.client_secret = client_secret or os.environ.get("SEVENROOMS_CLIENT_SECRET", "")
        self.venue_id = venue_id or os.environ.get("SEVENROOMS_VENUE_ID", "")
        self._token: Optional[str] = None
        self._token_expires: float = 0

    async def _get_token(self) -> str:
        if self._token and datetime.now().timestamp() < self._token_expires:
            return self._token
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{self.BASE_URL}/auth",
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            data = resp.json()
            self._token = data["data"]["token"]
            self._token_expires = datetime.now().timestamp() + data["data"].get("expires_in", 3500)
            return self._token

    async def check_availability(self, date: str, party_size: int, time_start: str = "17:00", time_end: str = "23:00") -> dict:
        token = await self._get_token()
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self.BASE_URL}/venues/{self.venue_id}/availability",
                params={
                    "date": date,
                    "party_size": party_size,
                    "time_start": time_start,
                    "time_end": time_end,
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            data = resp.json()
            slots = []
            for block in data.get("data", {}).get("availability", []):
                for t in block.get("times", []):
                    if t.get("type") == "book":
                        slots.append({
                            "time": t["time"],
                            "description": t.get("public_time_slot_description", ""),
                        })
            return {"date": date, "party_size": party_size, "available_slots": slots}

    async def create_reservation(
        self, date: str, time: str, party_size: int,
        first_name: str, last_name: str, phone: str,
        email: str = "", notes: str = "", seating_area: str = ""
    ) -> dict:
        token = await self._get_token()
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.put(
                f"{self.BASE_URL}/venues/{self.venue_id}/book",
                data={
                    "date": date,
                    "time": time,
                    "party_size": str(party_size),
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone": phone,
                    "email": email,
                    "notes": notes,
                    "seating_area": seating_area,
                    "source": "kapso-agent",
                },
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
            data = resp.json()
            return {
                "status": "confirmed" if resp.status_code == 200 else "failed",
                "reservation_id": data.get("data", {}).get("id", ""),
                "confirmation": data.get("data", {}).get("reservation_reference_code", ""),
                "raw": data,
            }

    async def cancel_reservation(self, reservation_id: str) -> dict:
        token = await self._get_token()
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{self.BASE_URL}/reservations/{reservation_id}/cancel",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
            return {"status": "cancelled" if resp.status_code == 200 else "failed"}

    async def get_guest(self, client_id: str) -> dict:
        token = await self._get_token()
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self.BASE_URL}/clients/{client_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            return resp.json().get("data", {})


# ═══════════════════════════════════════════════════════
# TABBY — UAE BNPL (Buy Now Pay Later)
# ═══════════════════════════════════════════════════════

class TabbyClient:
    """Tabby API client for BNPL payments in UAE/GCC."""

    BASE_URL = "https://api.tabby.ai/api/v2"

    def __init__(self, secret_key: str = "", merchant_code: str = ""):
        self.secret_key = secret_key or os.environ.get("TABBY_SECRET_KEY", "")
        self.merchant_code = merchant_code or os.environ.get("TABBY_MERCHANT_CODE", "")

    async def create_checkout(
        self, amount: str, currency: str, description: str,
        buyer_name: str, buyer_phone: str, buyer_email: str = "",
        items: list = None, success_url: str = "", cancel_url: str = ""
    ) -> dict:
        if not items:
            items = [{"title": description, "quantity": 1, "unit_price": amount, "reference_id": "item-1", "category": "General"}]

        payload = {
            "payment": {
                "amount": amount,
                "currency": currency,
                "description": description,
                "buyer": {
                    "phone": buyer_phone,
                    "email": buyer_email or f"{buyer_phone}@placeholder.com",
                    "name": buyer_name,
                },
                "order": {
                    "tax_amount": "0.00",
                    "shipping_amount": "0.00",
                    "discount_amount": "0.00",
                    "reference_id": f"order-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    "items": items,
                },
            },
            "lang": "en",
            "merchant_code": self.merchant_code,
            "merchant_urls": {
                "success": success_url or "https://agents.dcp.sa/payment/success",
                "cancel": cancel_url or "https://agents.dcp.sa/payment/cancel",
                "failure": cancel_url or "https://agents.dcp.sa/payment/failure",
            },
        }

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{self.BASE_URL}/checkout",
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.secret_key}",
                    "Content-Type": "application/json",
                },
            )
            data = resp.json()
            checkout_url = ""
            products = data.get("configuration", {}).get("available_products", {})
            installments = products.get("installments", [])
            if installments:
                checkout_url = installments[0].get("web_url", "")
            return {
                "status": "created" if resp.status_code in (200, 201) else "failed",
                "checkout_url": checkout_url,
                "session_id": data.get("id", ""),
                "payment_id": data.get("payment", {}).get("id", ""),
            }

    async def check_payment(self, payment_id: str) -> dict:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self.BASE_URL}/payments/{payment_id}",
                headers={"Authorization": f"Bearer {self.secret_key}"},
            )
            data = resp.json()
            return {
                "status": data.get("status", "unknown"),
                "amount": data.get("amount", ""),
                "currency": data.get("currency", ""),
            }


# ═══════════════════════════════════════════════════════
# TAMARA — KSA BNPL (Buy Now Pay Later)
# ═══════════════════════════════════════════════════════

class TamaraClient:
    """Tamara API client for BNPL payments in KSA/GCC."""

    def __init__(self, api_token: str = "", sandbox: bool = False):
        self.api_token = api_token or os.environ.get("TAMARA_API_TOKEN", "")
        self.base_url = "https://api-sandbox.tamara.co" if sandbox else "https://api.tamara.co"

    async def create_checkout(
        self, amount: str, currency: str, description: str,
        buyer_first_name: str, buyer_last_name: str,
        buyer_phone: str, buyer_email: str = "",
        country_code: str = "SA", items: list = None,
        notification_url: str = ""
    ) -> dict:
        if not items:
            items = [{
                "reference_id": "item-1",
                "type": "Digital",
                "name": description,
                "sku": "SKU-001",
                "quantity": 1,
                "unit_price": {"amount": amount, "currency": currency},
                "total_amount": {"amount": amount, "currency": currency},
            }]

        payload = {
            "order_reference_id": f"order-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "total_amount": {"amount": amount, "currency": currency},
            "description": description,
            "country_code": country_code,
            "payment_type": "PAY_BY_INSTALMENTS",
            "instalments": 3,
            "locale": "en_US",
            "items": items,
            "consumer": {
                "first_name": buyer_first_name,
                "last_name": buyer_last_name,
                "phone_number": buyer_phone,
                "email": buyer_email or f"{buyer_phone}@placeholder.com",
            },
            "billing_address": {
                "first_name": buyer_first_name,
                "last_name": buyer_last_name,
                "line1": country_code,
                "city": "Riyadh" if country_code == "SA" else "Dubai",
                "country_code": country_code,
            },
            "shipping_address": {
                "first_name": buyer_first_name,
                "last_name": buyer_last_name,
                "line1": country_code,
                "city": "Riyadh" if country_code == "SA" else "Dubai",
                "country_code": country_code,
            },
            "merchant_url": {
                "success": "https://agents.dcp.sa/payment/success",
                "failure": "https://agents.dcp.sa/payment/failure",
                "cancel": "https://agents.dcp.sa/payment/cancel",
                "notification": notification_url or "https://n8n.dcp.sa/webhook/tamara-webhook",
            },
            "tax_amount": {"amount": "0.00", "currency": currency},
            "shipping_amount": {"amount": "0.00", "currency": currency},
        }

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{self.base_url}/checkout",
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.api_token}",
                    "Content-Type": "application/json",
                },
            )
            data = resp.json()
            return {
                "status": "created" if resp.status_code in (200, 201) else "failed",
                "checkout_url": data.get("checkout_url", ""),
                "order_id": data.get("order_id", ""),
            }

    async def authorize_order(self, order_id: str) -> dict:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{self.base_url}/orders/{order_id}/authorise",
                headers={
                    "Authorization": f"Bearer {self.api_token}",
                    "Content-Type": "application/json",
                },
            )
            return {"status": resp.json().get("status", "unknown"), "order_id": order_id}

    async def check_order(self, order_id: str) -> dict:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self.base_url}/orders/{order_id}",
                headers={"Authorization": f"Bearer {self.api_token}"},
            )
            data = resp.json()
            return {
                "status": data.get("status", "unknown"),
                "amount": data.get("total_amount", {}).get("amount", ""),
                "currency": data.get("total_amount", {}).get("currency", ""),
                "payment_type": data.get("payment_type", ""),
            }

    async def check_availability(self, amount: str, currency: str, country: str = "SA") -> dict:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{self.base_url}/checkout/payment-types",
                json={
                    "country": country,
                    "order_value": {"amount": amount, "currency": currency},
                },
                headers={
                    "Authorization": f"Bearer {self.api_token}",
                    "Content-Type": "application/json",
                },
            )
            return resp.json()
