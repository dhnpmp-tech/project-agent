# Next Steps: Connecting Everything Together

This guide walks you through the manual setup steps that require your accounts,
credentials, and server access. Follow these in order.

---

## Step 1: Set Up Supabase (30 minutes)

### 1A. Create the Supabase Project

1. Go to https://supabase.com and create a free account
2. Click "New Project"
   - Name: `project-agent` (or your brand name)
   - Region: Choose closest to UAE — **Frankfurt (eu-central-1)** or **Bahrain** if available
   - Set a strong database password (save it somewhere secure)
3. Wait for the project to provision (~2 minutes)

### 1B. Run the Database Migrations

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Run each migration file **in order**. Copy-paste each file's content:
   - `packages/supabase/migrations/001_clients.sql` → Run
   - `packages/supabase/migrations/002_agent_deployments.sql` → Run
   - `packages/supabase/migrations/003_activity_logs.sql` → Run
   - `packages/supabase/migrations/004_api_keys.sql` → Run
   - `packages/supabase/migrations/005_rls_policies.sql` → Run
3. (Optional) Run `packages/supabase/seed.sql` to add demo data for testing

### 1C. Get Your Supabase Credentials

Go to **Settings → API** in the Supabase dashboard. You need:

| Credential | Where to find it | What it's for |
|-----------|-----------------|--------------|
| `SUPABASE_URL` | Settings → API → Project URL | All API calls |
| `SUPABASE_ANON_KEY` | Settings → API → anon/public | Client dashboard (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role | n8n workflows + provisioning (server-side only, NEVER expose in browser) |

### 1D. Set Up Supabase Auth

1. Go to **Authentication → Providers**
2. Enable **Email** provider (for client dashboard login)
3. (Optional) Enable **Magic Link** for passwordless login
4. Go to **Authentication → URL Configuration**
   - Set Site URL to your dashboard domain (e.g., `https://dashboard.yourdomain.com`)
   - Add redirect URLs: `https://dashboard.yourdomain.com/**`

### 1E. Create Your First Auth User (for testing)

1. Go to **Authentication → Users → Add User**
2. Create a user with your email
3. In the user's metadata, add: `{"client_id": "<UUID from clients table>"}`
   - This links the auth user to a client record for RLS isolation

---

## Step 2: Get Your API Keys (1-2 hours, some have approval waits)

### Anthropic (Claude API)
1. Go to https://console.anthropic.com
2. Create an API key
3. Save as `ANTHROPIC_API_KEY`
4. Note: If using Claude Max 20x subscription ($200/mo), you get generous usage included

### WhatsApp Business API
This is the longest approval process. Start it NOW.

**Option A: Via Meta directly (free, but slower)**
1. Go to https://developers.facebook.com
2. Create a Business app
3. Add the WhatsApp product
4. Apply for WhatsApp Business API access
5. Once approved, you get: Phone Number ID, Business Account ID, and a permanent token
6. Timeline: 1-5 business days for approval

**Option B: Via WATI or Interakt (faster, paid)**
1. Sign up at https://www.wati.io or https://www.interakt.shop
2. They handle the Meta approval process for you
3. You get API credentials within 24-48 hours
4. Cost: $50-200/month depending on message volume

Save these:
- `WHATSAPP_API_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`

### SendGrid (Email)
1. Go to https://sendgrid.com → Create free account
2. Create an API key (Settings → API Keys → Create)
3. Save as `SENDGRID_API_KEY`
4. **Important**: Set up sender authentication (Settings → Sender Authentication)
   - Verify your sending domain (e.g., `team.yourdomain.com`)
   - This takes 24-48 hours for DNS propagation

### Calendly
1. Go to https://calendly.com → Create account (Teams plan, $16/mo)
2. Create your "AI Audit" event type (30 minutes)
3. Get API key: Integrations → API → Personal Access Tokens
4. Save as `CALENDLY_API_KEY`
5. Save your booking link for the website

### Cloudflare (DNS)
1. Go to https://cloudflare.com → Add your domain
2. Point your domain nameservers to Cloudflare
3. Create an API token: My Profile → API Tokens → Create Token
   - Permissions: Zone → DNS → Edit
4. Save as `CLOUDFLARE_API_TOKEN`
5. Get your Zone ID from the domain overview page → save as `CLOUDFLARE_ZONE_ID`

### Optional APIs (can add later)
- **Apollo.io** ($49/mo) — for lead enrichment in SDR agent
- **Perplexity API** — for content research in CEA
- **MiniMax M27 API** — for video generation in CEA
- **Buffer API** — for social media scheduling in CEA
- **HubSpot** — free CRM tier, for lead/contact management

---

## Step 3: Set Up Your Server (1-2 hours)

### Option A: Your Own Server (if you already have one)
Make sure it has:
- Docker installed (`docker --version` should show 24.x+)
- Docker Compose v2 (`docker compose version`)
- At least 4GB RAM, 2 vCPU
- Ports 80 and 443 open
- A public IP address

### Option B: Rent a VPS
Recommended providers for UAE latency:

| Provider | Plan | Cost | Notes |
|----------|------|------|-------|
| Hetzner Cloud | CX31 (4 vCPU, 8GB) | €15/mo | Frankfurt — good UAE latency |
| Contabo | VPS M (6 vCPU, 16GB) | €10/mo | Budget option |
| DigitalOcean | 4GB Droplet | $24/mo | Frankfurt datacenter |
| AWS Lightsail | 4GB | $20/mo | Bahrain region (me-south-1) — best for UAE data residency |

### Install Docker on your server

```bash
# SSH into your server
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com | sh

# Verify
docker --version
docker compose version
```

### Point your domain to the server

In Cloudflare (or your DNS provider):
1. Create an **A record**: `yourdomain.com` → `your-server-ip`
2. Create a **wildcard A record**: `*.yourdomain.com` → `your-server-ip`
   - This enables client subdomains like `client-a.yourdomain.com`

---

## Step 4: Deploy the Master Stack (30 minutes)

### 4A. Clone the repo to your server

```bash
ssh root@your-server-ip
git clone https://github.com/dhnpmp-tech/project-agent.git
cd project-agent
```

### 4B. Create your .env file

```bash
cp .env.example .env
nano .env   # or vim .env
```

Fill in ALL the values you collected in Steps 1-2:

```bash
PLATFORM_DOMAIN=yourdomain.com
ACME_EMAIL=your@email.com
MASTER_N8N_HOST=admin.yourdomain.com
N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
MASTER_DB_USER=n8n_master
MASTER_DB_PASSWORD=$(openssl rand -hex 24)
REDIS_PASSWORD=$(openssl rand -hex 24)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
# ... etc
```

### 4C. Start the master stack

```bash
cd infrastructure
docker compose -f docker-compose.master.yml up -d
```

### 4D. Verify everything is running

```bash
# Check containers
docker ps

# You should see:
# traefik        - Running
# master-n8n     - Running
# master-postgres - Running
# redis          - Running

# Check Traefik is serving
curl -I https://admin.yourdomain.com
# Should return 200 or 401 (n8n auth)
```

### 4E. Access Master n8n

1. Open `https://admin.yourdomain.com` in your browser
2. Create your owner account (first visit sets up the account)
3. This is YOUR internal n8n — only you access this, never clients

---

## Step 5: Set Up Master n8n Provisioning Workflow (1-2 hours)

This is done in the n8n UI at `https://admin.yourdomain.com`.

### 5A. Create the Provisioning Workflow

1. Click **Add Workflow** → name it "Client Provisioning"
2. Build this flow using n8n's visual editor:

```
[Webhook] → [Validate] → [Insert to Supabase] → [Execute Command: provision-client.sh]
  → [Wait for Health] → [Import Workflows via n8n API] → [Update Supabase: active]
  → [Send Welcome Email via SendGrid] → [Slack Notification]
```

Key nodes to add:
- **Webhook Trigger**: POST method, path `/provision`
- **HTTP Request** (to Supabase): Insert client record
- **Execute Command**: `/scripts/provision-client.sh {{slug}} /tmp/config.json`
- **HTTP Request** (to client n8n): Import workflow JSON
- **HTTP Request** (SendGrid): Send welcome email

### 5B. Create the Intake Form

Use Tally (free), Typeform, or n8n's built-in Form Trigger:
- Business name, slug, contact info
- WhatsApp Business number
- Package (Starter/Professional)
- CRM type (HubSpot/Airtable/none)
- 10-15 FAQ answers (feeds knowledge base)
- Payment confirmation

The form submits to your provisioning webhook:
`https://admin.yourdomain.com/webhook/provision`

---

## Step 6: Deploy the Client Dashboard (30 minutes)

### Option A: Vercel (recommended, free)

1. Go to https://vercel.com → Import Git repository
2. Select `dhnpmp-tech/project-agent`
3. Set Root Directory to `apps/client-dashboard`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
   - `MASTER_N8N_WEBHOOK_URL` = `https://admin.yourdomain.com/webhook/change-request`
5. Deploy
6. Set custom domain: `dashboard.yourdomain.com`

### Option B: Self-hosted

```bash
cd apps/client-dashboard
pnpm install
pnpm build
pnpm start
# Or use Docker: add a Dockerfile and run alongside master stack
```

---

## Step 7: Deploy the Marketing Website (30 minutes)

Same as dashboard but for the website:

1. Vercel → Import same repo
2. Root Directory: `apps/website`
3. Deploy
4. Set custom domain: `yourdomain.com` or `www.yourdomain.com`
5. Replace the Calendly placeholder in `/book-audit` with your actual Calendly embed code

---

## Step 8: Test the Full Flow (1-2 hours)

### Test 1: Manual Client Provisioning
```bash
# On your server, manually provision a test client
cd /path/to/project-agent/infrastructure
./scripts/provision-client.sh test-client /tmp/test-config.json
```

Create `/tmp/test-config.json`:
```json
{
  "client_id": "some-uuid-from-supabase",
  "platform_domain": "yourdomain.com",
  "anthropic_api_key": "sk-ant-...",
  "supabase_url": "https://xxx.supabase.co",
  "supabase_service_role_key": "eyJ...",
  "redis_password": "your-redis-password"
}
```

Verify: `https://test-client.yourdomain.com` should show n8n login.

### Test 2: WhatsApp Agent
1. In the test client's n8n, import `agent-templates/whatsapp-intelligence-agent/workflow.json`
2. Set up Anthropic credentials in n8n (Settings → Credentials → New)
3. Activate the workflow
4. Send a test message to your WhatsApp Business number
5. Verify the agent responds

### Test 3: Dashboard
1. Log into `dashboard.yourdomain.com`
2. Verify agent status cards appear
3. Verify activity feed shows the test WhatsApp interaction

---

## Step 9: Go Live Checklist

Before taking your first real client:

- [ ] Server running stable for 48+ hours
- [ ] SSL certificates auto-renewed (Traefik handles this)
- [ ] WhatsApp Business API approved and tested
- [ ] At least 1 agent template tested end-to-end with real messages
- [ ] Dashboard accessible and showing correct data
- [ ] Website live with your branding and Calendly link
- [ ] SendGrid sender domain verified
- [ ] Backup script tested (`backup-client.sh`)
- [ ] .env file backed up securely (NOT in git)
- [ ] Supabase RLS tested (one client can't see another's data)

---

## Timeline Summary

| Step | Time | Dependencies |
|------|------|-------------|
| 1. Supabase setup | 30 min | None |
| 2. API keys | 1-2 hours (WhatsApp may take days) | None |
| 3. Server setup | 1-2 hours | Domain ownership |
| 4. Master stack deploy | 30 min | Steps 1-3 |
| 5. n8n provisioning workflow | 1-2 hours | Step 4 |
| 6. Dashboard deploy | 30 min | Step 1 |
| 7. Website deploy | 30 min | Calendly account |
| 8. Testing | 1-2 hours | Steps 4-7 |
| **Total** | **~6-10 hours** (spread over 2-3 days due to approval waits) |

**Start the WhatsApp Business API application first** — it has the longest
approval time and everything else can proceed in parallel.
