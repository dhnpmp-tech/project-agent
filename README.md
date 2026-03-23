# Project Agent

Multi-tenant AI agent deployment platform for SMBs in the UAE and Saudi Arabia.

## Architecture

- **5 Agent Templates**: WhatsApp Intelligence, AI SDR, Content Engine, HR Screening, Financial Intelligence
- **Infrastructure**: Docker-per-client isolation, Traefik reverse proxy, Supabase central DB
- **Provisioning**: Automated client onboarding from intake form to live agent in <48 hours
- **Client Dashboard**: Next.js app showing agent status, metrics, and activity (clients never see n8n)
- **Marketing Website**: Next.js site with services, pricing, case study, and Calendly booking

## Structure

```
project-agent/
├── infrastructure/          # Docker Compose, Traefik, provisioning scripts
├── packages/
│   ├── shared-types/        # TypeScript types for clients, agents, activities
│   ├── supabase/            # Database migrations and seed data
│   └── provisioning-sdk/    # Client provisioning automation (Docker, n8n API, DNS)
├── agent-templates/         # n8n workflow JSON + system prompts + config schemas
│   ├── whatsapp-intelligence-agent/
│   ├── ai-sdr-agent/
│   ├── content-engine-agent/
│   ├── hr-screening-agent/
│   └── financial-intelligence-agent/
├── apps/
│   ├── client-dashboard/    # Next.js client portal
│   └── website/             # Next.js marketing site
└── docs/                    # Architecture and operational documentation
```

## Tech Stack

- **Orchestration**: n8n (self-hosted, one container per client)
- **LLM**: Claude Sonnet 4.6 (responses) + Claude Haiku 4.5 (classification)
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Traefik v3 with auto-SSL
- **Database**: Supabase (central) + PostgreSQL (per client)
- **Memory**: Redis (shared, namespaced by client)
- **Frontend**: Next.js 15 + Tailwind CSS
- **Languages**: Arabic + English bilingual

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start master infrastructure
cd infrastructure && docker compose -f docker-compose.master.yml up -d

# Run database migrations
# (via Supabase CLI or direct SQL execution)

# Start dashboard dev server
pnpm --filter @project-agent/client-dashboard dev

# Start website dev server
pnpm --filter @project-agent/website dev
```

## Provisioning a New Client

1. Client fills intake form (triggers webhook)
2. Master n8n receives webhook, runs provisioning workflow
3. `provision-client.sh` creates isolated Docker environment
4. Agent template JSON imported into client's n8n instance
5. Client config injected (business name, knowledge base, API keys)
6. Supabase updated with client status → 'active'
7. Welcome email sent to client
