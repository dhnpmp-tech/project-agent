# Invoice Ninja - Research & Integration Analysis

**Date:** 2026-04-12
**Purpose:** Evaluate Invoice Ninja for integration with Project Agent by DCP

---

## 1. What is Invoice Ninja?

Invoice Ninja is a **source-available** invoicing, quoting, expense tracking, and time-tracking platform built with Laravel (PHP). It has been actively developed since 2013 and is currently on Version 5.13.4.

**GitHub Stats:**
- Repository: https://github.com/invoiceninja/invoiceninja
- Stars: ~9,650
- Forks: ~2,600
- Language: PHP (Laravel)
- Active development: Yes (last updated April 2026)

### Core Features

| Feature | Details |
|---------|---------|
| **Invoicing** | Create, send, and manage invoices with PDF generation |
| **Recurring Invoices** | Auto-generate invoices on schedule (weekly, monthly, yearly) |
| **Quotes / Proposals** | Create quotes, convert to invoices on acceptance |
| **Payments** | Track payments, partial payments, refunds |
| **Expenses** | Track and categorize business expenses |
| **Projects & Tasks** | Project management with time tracking |
| **Products** | Product catalog with inventory adjustment |
| **Credits** | Issue and manage credits |
| **Purchase Orders** | Vendor-facing purchase order management |
| **Client Portal** | Customers can view invoices, make payments, approve quotes |
| **E-Invoicing** | Peppol e-invoicing support (EU compliance) |
| **Bank Integration** | Connect bank accounts (via Yodlee) |
| **Multi-Company** | Manage multiple companies from one account |
| **Custom Designs** | Customizable invoice/quote templates |
| **Reports & Charts** | Financial reporting and analytics |
| **Tax Rates** | Configurable tax rates per region |

---

## 2. License

**Elastic License 2.0** - This is "source-available" but NOT traditional open source (not OSI-approved).

What this means for us:
- We CAN self-host it freely
- We CAN modify it for our own use
- We CANNOT offer it as a managed SaaS service to others (that competes with Invoice Ninja's hosted offering)
- We CAN integrate it as an internal component of our platform
- White-label license: **$40/year** removes Invoice Ninja branding from client-facing parts

**Verdict:** Perfectly fine for our use case. We're embedding it as an internal billing engine, not reselling invoicing software.

---

## 3. Self-Hosting

**YES - fully self-hostable.** Multiple deployment options:

| Method | Details |
|--------|---------|
| **Docker** | Official Docker image on Docker Hub |
| **Server/VM** | Standard Laravel deployment (PHP 8.1+, MySQL/PostgreSQL) |
| **Cloudron** | One-click install |
| **Softaculous** | cPanel-based install |
| **Elestio** | Managed self-hosting |
| **YunoHost** | Self-hosting platform |

**Requirements:**
- PHP 8.1+
- MySQL 5.7+ or PostgreSQL
- Composer
- Web server (Nginx/Apache)
- Redis (recommended)

**Docker quick start:**
```bash
git clone --depth 1 -b v5.13.4 https://github.com/invoiceninja/invoiceninja.git
cp .env.example .env
composer i -o --no-dev
php artisan serve
```

We can deploy it on our VPS (76.13.179.86) alongside our existing stack or on a separate container.

---

## 4. API Capabilities

**YES - comprehensive REST API.** Documentation: https://api-docs.invoicing.co/

### Key API Resources (Full CRUD)

| Resource | Endpoints |
|----------|-----------|
| `invoices` | index, create, show, update, destroy, bulk, download PDF, delivery note |
| `recurring_invoices` | index, create, show, update, destroy, bulk |
| `clients` | index, create, show, update, destroy, merge, purge, bulk |
| `payments` | index, create, show, update, destroy, refund, bulk |
| `products` | index, create, show, update, destroy, bulk |
| `quotes` | index, create, show, update, destroy, bulk, download PDF |
| `credits` | index, create, show, update, destroy, bulk |
| `expenses` | index, create, show, update, destroy, bulk |
| `projects` | index, create, show, update, destroy |
| `tasks` | index, create, show, update, destroy |
| `purchase_orders` | index, create, show, update, destroy |
| `vendors` | index, create, show, update, destroy |
| `subscriptions` | index, create, show, update, destroy |
| `webhooks` | index, create, show, update, destroy, bulk, retry |
| `tax_rates` | index, create, show, update, destroy |
| `designs` | index, create, show, update, destroy |
| `documents` | index, create, show, update, destroy, download |
| `company_gateways` | index, create, show, update, destroy, test, clone |

### Authentication
- API tokens (created in Settings > Account Management > Integrations)
- All requests over HTTPS
- Token passed in `X-Api-Token` header

### Webhook System
- Configurable outbound webhooks for events (invoice created, payment received, client created, etc.)
- Webhook retry mechanism
- Supports custom webhook endpoints

### Example: Create Invoice via API
```bash
curl -X POST https://your-instance.com/api/v1/invoices \
  -H "X-Api-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "abc123",
    "line_items": [
      {
        "product_key": "Booking",
        "notes": "Restaurant booking - Table for 4",
        "cost": 500,
        "quantity": 1
      }
    ]
  }'
```

---

## 5. Automatic Invoice Generation

**YES.** Two mechanisms:

### A. Recurring Invoices (Built-in)
- Set frequency: daily, weekly, monthly, quarterly, yearly, custom
- Auto-send to client on generation
- Auto-charge stored payment methods
- Start/stop dates
- API endpoint: `POST /api/v1/recurring_invoices`

### B. API-Driven (Our Approach)
- When our AI agent confirms a booking/order, our FastAPI backend calls Invoice Ninja API to create an invoice
- Can trigger PDF generation and email delivery automatically
- Can download PDF via API for WhatsApp delivery

---

## 6. Currency Support (AED/SAR)

**YES - both AED and SAR are natively supported.**

Confirmed in the currency seeder database:

| ID | Currency | Code | Symbol | Precision |
|----|----------|------|--------|-----------|
| 25 | United Arab Emirates Dirham | AED | DH | 2 |
| 44 | Saudi Riyal | SAR | (none) | 2 |
| 74 | Qatari Riyal | QAR | QR | 2 |
| 80 | Moroccan Dirham | MAD | MAD | 2 |

- Multi-currency support per client (each client can have a different currency)
- Currency exchange rate support built in

---

## 7. Arabic Language Support

**PARTIAL - with known limitations.**

- Arabic (`ar`) locale files exist in the repository under `resources/lang/ar/`
- The UI can be set to Arabic
- **Known issue:** Arabic text rendering in PDF invoices has historical problems (characters not displaying correctly)
- This is documented in GitHub Issue #214 and forum posts

**Workarounds for our use case:**
1. Use our own PDF generation for Arabic invoices (via our existing stack)
2. Use Invoice Ninja API for data/logic, generate our own bilingual PDF templates
3. Monitor for fixes in newer versions (active development may have resolved this)

---

## 8. WhatsApp Integration

**NOT built-in, but achievable through our architecture.**

### Option A: Via Automation Platforms
- n8n has both Invoice Ninja and WhatsApp Business Cloud nodes
- Zapier, Make, Pipedream all support Invoice Ninja + WhatsApp

### Option B: Our Custom Integration (Recommended)
Since we already have a WhatsApp pipeline (Meta Cloud API), the flow would be:

```
Booking Confirmed (AI Agent)
    |
    v
FastAPI Backend
    |
    v
Invoice Ninja API (create invoice)
    |
    v
Download Invoice PDF (via API)
    |
    v
Send PDF via WhatsApp (our existing pipeline)
    |
    v
Customer receives invoice in WhatsApp chat
```

This is the cleanest approach since we control both ends.

---

## 9. Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Laravel (PHP 8.1+) |
| **Database** | MySQL 5.7+ / PostgreSQL |
| **Admin Frontend** | React (react.invoicing.co) |
| **Client Portal** | Laravel Blade / React |
| **Mobile Apps** | Flutter (iOS, Android, F-Droid) |
| **Desktop Apps** | Flutter (macOS, Windows, Linux) |
| **PDF Generation** | Internal engine + PhantomJS option |
| **API Format** | RESTful JSON (Fractal transformers) |
| **Authentication** | Token-based + OAuth |
| **Queue** | Laravel Queue (Redis/database) |
| **Email** | SMTP / Postmark / Mailgun / Brevo |
| **Containerization** | Docker support |

---

## 10. White-Labeling

**YES - $40/year white-label license.**

- Removes all "Invoice Ninja" branding from client-facing parts
- Client portal shows your brand
- Invoices, quotes, emails show your brand
- Self-hosted version includes all Pro/Enterprise features regardless
- Custom domain for client portal

For our use case: each restaurant/salon/business client's customers would see the business's branding, not Invoice Ninja's and not ours.

---

## 11. Payment Gateways

### Built-in Gateway Drivers

| Gateway | Type |
|---------|------|
| **Stripe** | Cards, ACH, SEPA, iDEAL, Bancontact, etc. |
| **PayPal (PPCP)** | PayPal, Venmo, Pay Later |
| **PayPal REST** | Legacy PayPal |
| **Authorize.net** | Cards |
| **Braintree** | Cards, PayPal |
| **Checkout.com** | Cards |
| **GoCardless** | Direct Debit (UK/EU) |
| **Mollie** | Cards, iDEAL, SOFORT, Bancontact |
| **Square** | Cards, Cash App |
| **Razorpay** | Cards, UPI, NetBanking (India) |
| **PayTrace** | Cards |
| **PayFast** | Cards (South Africa) |
| **Eway** | Cards (Australia) |
| **Forte** | Cards, ACH |
| **WePay** | Cards |
| **Rotessa** | Direct Debit (Canada) |
| **BTCPay** | Bitcoin/crypto |
| **Blockonomics** | Bitcoin |
| **CBA PowerBoard** | Cards (Australia) |
| **Custom** | `CustomPaymentDriver.php` - build your own |

### Tap Payments Integration

**Not natively supported.** However, there are two paths:

1. **Custom Payment Driver:** Invoice Ninja has a `CustomPaymentDriver.php` base class. We can build a Tap Payments driver by extending it. Tap has a REST API that's straightforward to integrate.

2. **Stripe as bridge:** Since Tap Payments and Stripe both operate in the MENA region, we could use Stripe as the primary gateway (Stripe supports AED/SAR) and handle Tap separately in our main platform.

3. **Webhook approach:** Use Invoice Ninja for invoicing only (no payment collection through it), and handle payments through our own Tap integration. When payment is received, update Invoice Ninja via API to mark the invoice as paid.

**Recommended approach:** Option 3 - keep Invoice Ninja for invoicing, use Tap Payments directly in our platform, sync payment status via API.

---

## 12. Integration Architecture for Project Agent

### Use Case A: Customer Invoicing (Booking/Order Confirmation)

```
Customer confirms booking via WhatsApp
    |
    v
AI Agent processes confirmation
    |
    v
FastAPI Backend
    |-- Creates/updates client in Invoice Ninja
    |-- Creates invoice with line items
    |-- Triggers invoice finalization
    |
    v
Invoice Ninja generates PDF
    |
    v
FastAPI downloads PDF via API
    |
    v
Sends PDF to customer via WhatsApp
    |
    v
Customer pays via Tap Payments link (in WhatsApp message)
    |
    v
Tap webhook confirms payment
    |
    v
FastAPI marks invoice as paid in Invoice Ninja
```

### Use Case B: Monthly Client Billing (DCP billing its own clients)

```
Invoice Ninja Recurring Invoices
    |-- AED 3,000 setup fee (one-time)
    |-- AED 1,500-8,000/mo subscription
    |-- Per-conversation overage charges
    |
    v
Auto-generated monthly, sent via email + WhatsApp
    |
    v
Payment via Tap Payments
    |
    v
Auto-reconciliation
```

### Use Case C: Multi-Tenant Setup

```
Invoice Ninja Multi-Company Feature
    |
    |-- Company 1: DCP (our billing)
    |-- Company 2: Saffron Demo Restaurant (their customer invoices)
    |-- Company 3: Desert Bloom Salon (their customer invoices)
    |-- Company N: New client onboarded
    |
    v
Each company has its own:
    - Currency (AED/SAR)
    - Tax rates (5% VAT UAE, 15% VAT KSA)
    - Invoice templates
    - Client database
    - Payment gateway config
```

---

## 13. Implementation Plan

### Phase 1: Deploy & Configure (1-2 days)
- Docker deploy on VPS
- Configure AED/SAR currencies
- Set up white-label license ($40/year)
- Create API tokens
- Test API endpoints

### Phase 2: FastAPI Integration (2-3 days)
- Build Invoice Ninja service layer in our FastAPI backend
- Client sync (our Supabase clients <-> Invoice Ninja clients)
- Invoice creation on booking confirmation
- PDF download and WhatsApp delivery
- Payment status sync

### Phase 3: DCP Client Billing (1-2 days)
- Set up recurring invoices for our clients
- Configure Stripe/manual payment tracking
- Monthly billing automation

### Phase 4: Advanced Features (ongoing)
- Custom Tap Payments driver (if needed)
- Arabic invoice templates (custom PDF generation)
- Financial reporting dashboard integration
- Expense tracking for client businesses

---

## 14. Cost Analysis

| Item | Cost |
|------|------|
| Invoice Ninja Self-Hosted | Free |
| White-Label License | $40/year (~AED 147/year) |
| VPS Resources (additional) | ~$5-10/month |
| Development Time | ~5-7 days |
| **Total Year 1** | **~$160 + dev time** |

Compare to alternatives:
- Stripe Invoicing: 0.4-0.5% per invoice
- QuickBooks Online: $30-200/month
- Zoho Invoice: $15-100/month
- FreshBooks: $19-60/month

**Invoice Ninja self-hosted is essentially free.** The $40/year white-label is negligible.

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Arabic PDF rendering issues | Generate our own PDFs using our stack; use Invoice Ninja for data only |
| No native Tap Payments | Use webhook approach (Invoice Ninja for invoicing, Tap for payment, sync via API) |
| Elastic License restrictions | We're not reselling invoicing software, so no conflict |
| PHP stack adds complexity | Containerize with Docker; minimal maintenance needed once deployed |
| API rate limits (self-hosted) | No rate limits on self-hosted; we control the server |

---

## 16. Verdict

**STRONG YES for integration.** Invoice Ninja is an excellent fit for Project Agent:

1. **Free self-hosted** with all features included
2. **Comprehensive API** covers 100% of our needs
3. **AED/SAR currencies** natively supported
4. **Multi-company** architecture aligns with our multi-tenant model
5. **White-label** at $40/year is practically free
6. **Recurring invoices** handle our client billing automatically
7. **Webhook system** enables real-time event processing
8. **Docker deployment** fits our existing infrastructure
9. **Active development** (9,650 stars, regular releases, responsive forum)

The only gaps (Arabic PDF rendering, Tap Payments, WhatsApp delivery) are all solvable through our existing architecture.

---

## Sources

- [Invoice Ninja GitHub Repository](https://github.com/invoiceninja/invoiceninja)
- [Invoice Ninja API Documentation](https://api-docs.invoicing.co/)
- [Invoice Ninja Self-Hosted Installation Guide](https://invoiceninja.github.io/en/self-host-installation/)
- [Invoice Ninja Developer Guide](https://invoiceninja.github.io/en/developer-guide/)
- [Invoice Ninja Self-Hosted Site](https://www.invoiceninja.org/)
- [Invoice Ninja Payment Gateways](https://invoiceninja.github.io/en/gateways/)
- [Invoice Ninja Languages & Currencies](https://invoiceninja.com/languages/)
- [Invoice Ninja White Label Discussion](https://forum.invoiceninja.com/t/white-label-licence/12737)
- [Invoice Ninja WhatsApp Integration Forum](https://forum.invoiceninja.com/t/whatsapp-integration/12782)
- [n8n Invoice Ninja + WhatsApp Integration](https://n8n.io/integrations/invoice-ninja/and/whatsapp-business-cloud/)
- [Pipedream Invoice Ninja + WhatsApp Integration](https://pipedream.com/apps/invoice-ninja/integrations/whatsapp-business)
- [Arabic Language Issue #214](https://github.com/invoiceninja/invoiceninja/issues/214)
