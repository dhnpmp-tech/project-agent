# Architecture Overview

## Multi-Tenant Model

Each client gets their own isolated Docker environment:

```
┌─────────────────────────────────────────────────────┐
│                YOUR SERVER (VPS)                     │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │             Docker Host Layer                   │  │
│  │                                                 │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │  │
│  │  │ Client A │ │ Client B │ │ Client C │  ...  │  │
│  │  │ n8n + DB │ │ n8n + DB │ │ n8n + DB │       │  │
│  │  └──────────┘ └──────────┘ └──────────┘       │  │
│  │                                                 │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │  Supabase (Central DB + Auth)            │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  │                                                 │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │  Traefik (Reverse Proxy + Auto-SSL)      │  │  │
│  │  │  client-a.platform.com → container A     │  │  │
│  │  │  client-b.platform.com → container B     │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Data Flow

- **Clients** interact via WhatsApp, email, or web forms
- **n8n workflows** process messages using Claude API
- **Activity logs** written to Supabase (central DB)
- **Client dashboard** reads from Supabase (filtered by RLS)
- **Clients never see n8n** — only the branded dashboard

## Security

- One Docker container per client = full data isolation
- Supabase Row Level Security (RLS) on all tables
- API keys stored in per-client .env files
- All traffic over HTTPS (Traefik auto-SSL)
- Resource limits per container (512MB RAM, 0.5 CPU)

## Scaling Path

1. **1-10 clients**: Single VPS, Docker Compose (2 vCPU, 4GB RAM)
2. **10-50 clients**: Add Portainer, scale VPS (8 vCPU, 32GB RAM)
3. **50+ clients**: Kubernetes or Docker Swarm, managed K8s on cloud
