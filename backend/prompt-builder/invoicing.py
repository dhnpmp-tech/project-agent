"""Invoice Ninja Integration — Automatic invoicing for WhatsApp orders.

When a customer completes an order via WhatsApp, we:
1. Create/find the client in Invoice Ninja
2. Create an invoice with the order items
3. Download the PDF
4. Send via WhatsApp to the customer
5. Track payment status
"""

import os
import json
import httpx
from datetime import datetime, timezone

_NINJA_URL = os.environ.get("INVOICE_NINJA_URL", "http://localhost:8300")
_NINJA_TOKEN = os.environ.get("INVOICE_NINJA_TOKEN", "")

_HEADERS = {
    "X-Api-Token": _NINJA_TOKEN,
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
}


async def find_or_create_client(name: str, phone: str, email: str = "") -> dict:
    """Find existing client by phone or create new one."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            # Search by phone
            r = await http.get(
                f"{_NINJA_URL}/api/v1/clients?search={phone}",
                headers=_HEADERS,
            )
            clients = r.json().get("data", [])
            if clients:
                return clients[0]

            # Create new client
            r = await http.post(
                f"{_NINJA_URL}/api/v1/clients",
                headers=_HEADERS,
                json={
                    "name": name,
                    "phone": phone,
                    "address1": "",
                    "currency_id": "25",  # AED (use "44" for SAR)
                },
            )
            return r.json().get("data", {})
    except Exception as e:
        print(f"[invoicing] Client error: {e}")
        return {}


async def create_invoice(client_id: str, items: list, currency: str = "AED") -> dict:
    """Create an invoice from order items.
    items: [{"description": "1kg Arabic Coffee", "quantity": 1, "cost": 75}]
    """
    currency_id = "25" if currency == "AED" else "44"  # SAR

    line_items = []
    for item in items:
        line_items.append({
            "product_key": item.get("description", ""),
            "notes": item.get("notes", ""),
            "quantity": item.get("quantity", 1),
            "cost": item.get("cost", 0),
        })

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.post(
                f"{_NINJA_URL}/api/v1/invoices",
                headers=_HEADERS,
                json={
                    "client_id": client_id,
                    "line_items": line_items,
                    "auto_bill_enabled": False,
                },
            )
            return r.json().get("data", {})
    except Exception as e:
        print(f"[invoicing] Invoice error: {e}")
        return {}


async def get_invoice_pdf(invoice_id: str) -> bytes:
    """Download invoice PDF."""
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.get(
                f"{_NINJA_URL}/api/v1/invoices/{invoice_id}/download",
                headers=_HEADERS,
            )
            if r.status_code == 200:
                return r.content
    except Exception as e:
        print(f"[invoicing] PDF error: {e}")
    return b""


async def create_and_send_invoice(
    customer_name: str,
    customer_phone: str,
    items: list,
    currency: str = "AED",
    phone_number_id: str = "",
) -> dict:
    """Full flow: create client -> create invoice -> send PDF via WhatsApp."""
    # 1. Find or create client
    client = await find_or_create_client(customer_name, customer_phone)
    if not client or not client.get("id"):
        return {"error": "Could not create client"}

    # 2. Create invoice
    invoice = await create_invoice(client["id"], items, currency)
    if not invoice or not invoice.get("id"):
        return {"error": "Could not create invoice"}

    # 3. Get PDF
    pdf = await get_invoice_pdf(invoice["id"])

    # 4. Send via WhatsApp if we have the PDF and phone_number_id
    sent = False
    if pdf and phone_number_id:
        try:
            kapso_key = os.environ.get("KAPSO_PLATFORM_API_KEY", "")
            async with httpx.AsyncClient(timeout=15) as http:
                # Upload PDF
                files = {"file": ("invoice.pdf", pdf, "application/pdf")}
                r = await http.post(
                    f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/media",
                    headers={"X-API-Key": kapso_key},
                    files=files,
                    data={"messaging_product": "whatsapp", "type": "document"},
                )
                if r.status_code in (200, 201):
                    media_id = r.json().get("id", "")
                    if media_id:
                        await http.post(
                            f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages",
                            headers={"X-API-Key": kapso_key, "Content-Type": "application/json"},
                            json={
                                "messaging_product": "whatsapp",
                                "to": customer_phone,
                                "type": "document",
                                "document": {
                                    "id": media_id,
                                    "filename": f"invoice-{invoice.get('number', 'draft')}.pdf",
                                },
                            },
                        )
                        sent = True
        except Exception as e:
            print(f"[invoicing] WhatsApp send error: {e}")

    return {
        "invoice_id": invoice.get("id"),
        "invoice_number": invoice.get("number"),
        "amount": invoice.get("amount"),
        "currency": currency,
        "pdf_generated": len(pdf) > 0,
        "whatsapp_sent": sent,
    }


async def get_outstanding_invoices(client_phone: str = "") -> list:
    """Get unpaid invoices, optionally filtered by client phone."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            url = f"{_NINJA_URL}/api/v1/invoices?status=active&per_page=20"
            r = await http.get(url, headers=_HEADERS)
            invoices = r.json().get("data", [])
            if client_phone:
                # Filter by client phone (need to check each client)
                filtered = []
                for inv in invoices:
                    client = inv.get("client", {})
                    if client_phone in (client.get("phone", "") or ""):
                        filtered.append(inv)
                return filtered
            return invoices
    except Exception as e:
        print(f"[invoicing] List error: {e}")
        return []
