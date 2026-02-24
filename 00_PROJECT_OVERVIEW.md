# PropOS — AI Property Operations Coordinator
## Backend System Specification

> **Vision:** An autonomous AI "employee" that handles vendor coordination, tenant communication, and compliance work for mid-market residential property managers. Not a chatbot. Not a ticketing tool. A fully operational AI coordinator that closes the loop end-to-end — from tenant complaint to completed work order to reconciled invoice.

---

## Product Positioning

| What it replaces | What it does |
|---|---|
| Maintenance coordinator (human) | Triages, dispatches, tracks, closes work orders autonomously |
| Compliance admin | Monitors deadlines, generates notices, logs proofs |
| Tenant comms team | Handles multi-channel communication with full context memory |
| Vendor management | Solicits bids, compares pricing, issues POs, reconciles invoices |

**Target customer:** Property managers with 1,000–10,000 residential units on AppFolio, Yardi, or Buildium.

**Pricing model:** Per unit per month ($2–5/unit/month) + optional AI ops seat licensing.

---

## Tech Stack

### Backend
- **Runtime:** Node.js 20+ with TypeScript (strict mode)
- **Framework:** Fastify (performance-first, schema validation built-in)
- **ORM:** Prisma with PostgreSQL 15
- **Task Queue:** BullMQ backed by Redis 7
- **Caching:** Redis 7 (ioredis)
- **File Storage:** AWS S3 (or compatible — MinIO for local dev)
- **Auth:** JWT (access + refresh token pattern) + API key auth for integrations

### AI / Intelligence Layer
- **Primary LLM:** Anthropic Claude (claude-sonnet) via tool use / function calling
- **Orchestration:** Custom agent loop (no LangChain — keeps full control)
- **Embeddings:** OpenAI text-embedding-3-small for semantic search on tenant history
- **Vector DB:** pgvector extension on PostgreSQL (keep it simple, one DB)

### Communication
- **Email:** SendGrid (inbound parse + outbound)
- **SMS:** Twilio (inbound webhooks + outbound)
- **Portal:** REST webhooks from AppFolio / Yardi / Buildium

### Infrastructure
- **Containerization:** Docker + Docker Compose for local dev
- **CI/CD:** GitHub Actions
- **Monitoring:** OpenTelemetry → Grafana / Datadog
- **Error tracking:** Sentry

---

## Folder Structure

```
propos-backend/
├── prisma/
│   ├── schema.prisma              # Full DB schema
│   └── migrations/
├── src/
│   ├── server.ts                  # Fastify app entry point
│   ├── config/
│   │   ├── env.ts                 # Zod-validated env vars
│   │   └── constants.ts
│   ├── modules/
│   │   ├── auth/                  # JWT, API keys, sessions
│   │   ├── organizations/         # Property management companies
│   │   ├── properties/            # Buildings, units
│   │   ├── tenants/               # Tenant profiles, history
│   │   ├── vendors/               # Vendor profiles, dispatch
│   │   ├── workorders/            # Maintenance tickets, lifecycle
│   │   ├── compliance/            # Inspections, certifications, notices
│   │   ├── communications/        # Unified message thread management
│   │   ├── invoices/              # Invoice ingestion, reconciliation
│   │   └── analytics/             # Portfolio benchmarks, reports
│   ├── agent/
│   │   ├── core/
│   │   │   ├── AgentRunner.ts     # Main agent execution loop
│   │   │   ├── ToolRegistry.ts    # All tools the agent can call
│   │   │   └── EscalationEngine.ts# Rules for human handoff
│   │   ├── tools/
│   │   │   ├── workorder.tools.ts
│   │   │   ├── vendor.tools.ts
│   │   │   ├── communication.tools.ts
│   │   │   ├── compliance.tools.ts
│   │   │   └── pms.tools.ts
│   │   ├── workflows/
│   │   │   ├── MaintenanceWorkflow.ts
│   │   │   ├── VendorDispatchWorkflow.ts
│   │   │   ├── TenantOnboardWorkflow.ts
│   │   │   ├── LeaseRenewalWorkflow.ts
│   │   │   └── ComplianceWorkflow.ts
│   │   └── prompts/
│   │       ├── system.prompt.ts
│   │       └── workflow.prompts.ts
│   ├── integrations/
│   │   ├── pms/
│   │   │   ├── appfolio/
│   │   │   ├── yardi/
│   │   │   └── buildium/
│   │   ├── email/
│   │   │   └── sendgrid/
│   │   ├── sms/
│   │   │   └── twilio/
│   │   └── storage/
│   │       └── s3/
│   ├── jobs/
│   │   ├── queues.ts              # BullMQ queue definitions
│   │   ├── processors/
│   │   │   ├── inbound-message.processor.ts
│   │   │   ├── vendor-dispatch.processor.ts
│   │   │   ├── compliance-check.processor.ts
│   │   │   ├── invoice-reconcile.processor.ts
│   │   │   └── renewal-nudge.processor.ts
│   │   └── schedulers/
│   │       └── cron.ts            # Recurring jobs
│   ├── webhooks/
│   │   ├── sendgrid.webhook.ts
│   │   ├── twilio.webhook.ts
│   │   └── pms.webhook.ts
│   ├── shared/
│   │   ├── errors/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── types/
│   └── lib/
│       ├── anthropic.ts           # Anthropic client
│       ├── prisma.ts              # Prisma client singleton
│       ├── redis.ts               # Redis client
│       ├── s3.ts                  # S3 client
│       └── logger.ts              # Pino logger
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Core Principles for Implementation

1. **Agent is the brain, not a chatbot.** Every inbound message triggers an agent decision loop — not a canned response tree.

2. **Deterministic actions, not vibes.** The LLM decides *what* to do. Prisma + BullMQ jobs execute it deterministically. Never let the LLM directly mutate DB state — always go through typed action functions.

3. **Human-in-the-loop is a first-class feature.** The escalation engine is not an afterthought. Every workflow has defined escalation triggers.

4. **Full audit trail.** Every agent action, every decision, every tool call is logged with the reasoning. This is your compliance moat.

5. **Multi-tenant from day one.** Every DB query scopes to `organizationId`. No exceptions.
