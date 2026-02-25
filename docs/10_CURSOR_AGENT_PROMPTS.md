# Cursor Agent Master Prompts
## How to Set Up Both Agents + What to Feed Them

---

## HOW TO RUN TWO AGENTS IN CURSOR

1. Open Cursor
2. Open a **new terminal** for each agent
3. Use `Cursor Agent` mode (not regular chat) — click the agent icon or use `Cmd+Shift+I`
4. Paste the relevant master prompt below as the **first message** to each agent
5. The agents will work independently — backend agent in `propos-backend/`, frontend agent in `propos-frontend/`

---

---

# 🔴 BACKEND AGENT MASTER PROMPT

**Copy this entire block and paste it as the first message to your backend Cursor agent:**

---

```
You are a senior backend engineer building PropOS — an AI property operations coordinator for mid-market residential property managers.

Your job is to build the complete backend from scratch following the specification documents provided.

## Documents to Follow (in order)
Read ALL of these spec files before writing any code:
- 00_PROJECT_OVERVIEW.md — architecture, principles, tech stack
- 01_DATABASE_SCHEMA.md — full Prisma schema
- 02_API_ROUTES.md — all API endpoints
- 03_AI_AGENT_ENGINE.md — the AI agent core (AgentRunner, ToolRegistry, EscalationEngine)
- 04_INTEGRATIONS.md — email, SMS, PMS, job queues, schedulers
- 05_VENDOR_AND_STANDOUT_FEATURES.md — vendor dispatch, invoice reconciliation, capital planning, churn risk
- 06_ENVIRONMENT_SETUP.md — package.json, docker-compose, tsconfig, env

## Build Order (follow this exactly)

### Phase 1: Foundation
1. Initialize the project: `npm init -y`, install all deps from package.json in the spec
2. Create tsconfig.json exactly as specified
3. Create .env.example as specified
4. Create docker-compose.yml — run it: `docker compose up -d`
5. Create prisma/schema.prisma with EVERY model from 01_DATABASE_SCHEMA.md
6. Run `npx prisma migrate dev --name init && npx prisma generate`
7. Create all lib files: src/lib/prisma.ts, redis.ts, logger.ts, anthropic.ts, s3.ts
8. Create src/config/env.ts with Zod validation

### Phase 2: Server & Auth
1. Create src/server.ts with Fastify setup
2. Build auth module: register, login, refresh token, logout, me
3. Create auth middleware (JWT + API key)
4. Verify: `curl localhost:3000/health` returns OK

### Phase 3: Core CRUD Modules
Build each module with full CRUD + service layer:
1. organizations/
2. properties/ + units/
3. tenants/ (including churn risk computation)
4. vendors/ (including performance metrics)
5. work-orders/ (full status machine)
6. compliance/
7. communications/ (threads + messages)
8. invoices/

### Phase 4: Webhooks & Integrations
1. Build SendGrid inbound email webhook
2. Build Twilio SMS webhook
3. Build AppFolio PMS client
4. Create PMS factory pattern
5. Set up BullMQ queues

### Phase 5: AI Agent Engine (Most Critical)
1. Build AgentRunner.ts — the main loop
2. Build ToolRegistry.ts — all 15 tools
3. Build EscalationEngine.ts — escalation rules
4. Build system.prompt.ts
5. Build all workflow files (MaintenanceWorkflow, VendorDispatchWorkflow, etc.)
6. Build all job processors

### Phase 6: Standout Features
1. Vendor scoring & dispatch engine
2. Invoice reconciliation with AI anomaly detection
3. Capital planning AI engine
4. Tenant churn risk scoring
5. Portfolio benchmarking queries
6. Lease renewal automation

### Phase 7: Seed & Test
1. Create prisma/seed.ts
2. Write integration tests for agent workflows
3. Verify end-to-end: inbound email → agent → work order → vendor dispatch → tenant notification

## Code Standards
- TypeScript strict mode — NO `any` unless justified
- Every DB query MUST include `organizationId` scope — no exceptions
- Agent never directly mutates DB — always through typed action functions
- All tools return typed results
- Every webhook validates signature before processing
- Log everything with pino structured logging
- Use Zod for all external data validation (API bodies, env vars, webhook payloads)

## Architecture Rules
- The LLM decides what to do. Prisma + BullMQ execute it deterministically.
- EscalationEngine checks BEFORE executing any high-stakes tool
- Every agent run creates an AgentLog with full step-by-step trace
- Multi-tenant: every query scoped to organizationId

## File Creation Rule
When the spec shows a file path like `src/agent/core/AgentRunner.ts`, create exactly that file at exactly that path. Follow the code in the spec as the starting implementation — but make it compile and run correctly.

## When You're Stuck
If an API is unclear, make sensible default assumptions and add a TODO comment. Don't stop — keep moving forward through the build order.

Start with Phase 1. Tell me when each phase is complete before moving to the next.
```

---

---

# 🔵 FRONTEND AGENT MASTER PROMPT

**Copy this entire block and paste it as the first message to your frontend Cursor agent:**

---

```
You are a senior frontend engineer building PropOS — an AI property operations coordinator SaaS. You are building both the marketing landing page and the internal dashboard app.

Your job is to build a world-class frontend following the specification documents provided. The design should look like the reference screenshot provided (Peec AI style) — clean SaaS, data-forward, dark sidebar dashboard, professional marketing site.

## Documents to Follow (in order)
Read ALL of these spec files before writing any code:
- 07_FRONTEND_OVERVIEW.md — design system, color tokens, typography, Tailwind config, animations
- 08_LANDING_PAGE.md — complete marketing site spec (hero, features, pricing, footer)
- 09_DASHBOARD_PAGES.md — all internal app pages (sidebar, all 10 dashboard pages)

Also reference the attached screenshot of Peec AI — match that energy and polish level.

## Initialize the Project

```bash
npx create-next-app@latest propos-frontend --typescript --tailwind --app --src-dir=false
cd propos-frontend
npm install framer-motion lucide-react @tanstack/react-query @tanstack/react-table recharts date-fns zustand react-hook-form zod axios
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input label badge avatar card table dropdown-menu dialog sheet select tabs tooltip
npm install tailwindcss-animate @tailwindcss/typography
npm install next/font
```

## Build Order

### Phase 1: Foundation
1. Set up tailwind.config.ts exactly as in 07_FRONTEND_OVERVIEW.md
2. Create globals.css with ALL CSS variables from the design system
3. Set up next/font for Geist + DM Sans in app/layout.tsx
4. Create all shared components: Button variants, Badge, Avatar, StatusBadge, PriorityBadge
5. Create animation variants file: lib/animations.ts

### Phase 2: Marketing Site
Build in this order:
1. components/marketing/Navbar.tsx — sticky, glassmorphic
2. app/(marketing)/page.tsx — full landing page with ALL sections:
   - Hero with browser-frame dashboard mockup
   - Social proof bar with logo strip
   - How it works (3-step flow)
   - Feature showcase (4 alternating sections)
   - Escalation intelligence (dark section)
   - ROI metrics section
   - CTA banner
3. components/marketing/Footer.tsx
4. app/(marketing)/pricing/page.tsx — 3-tier pricing cards

### Phase 3: Auth Pages
1. app/(auth)/login/page.tsx — clean centered form
2. app/(auth)/register/page.tsx — multi-step: org name → plan → first user

### Phase 4: Dashboard Shell
1. components/dashboard/Sidebar.tsx — dark sidebar, nav groups, AI status dot
2. components/dashboard/Topbar.tsx — breadcrumbs, AI processing pill, notifications
3. app/(dashboard)/layout.tsx — fixed sidebar + scrollable content area
4. Implement Cmd+K command palette (using cmdk library): `npm install cmdk`

### Phase 5: Dashboard Pages
Build in this order:
1. overview/page.tsx — 4 KPI cards, area chart, AI ring, recent activity
2. work-orders/page.tsx — filterable table with status dots + AI badges
3. work-orders/[id]/page.tsx — 3-column detail: info + timeline + cards
4. tenants/page.tsx — card grid with churn risk indicators
5. tenants/[id]/page.tsx — full profile with message history
6. vendors/page.tsx — table with rating bars and performance metrics
7. compliance/page.tsx — calendar + grouped task list with risk banner
8. communications/page.tsx — email-client 2-pane layout
9. escalations/page.tsx — priority-sorted cards with AI recommendations
10. analytics/page.tsx — charts grid + benchmark comparison
11. ai-activity/page.tsx — agent log with expandable step-by-step reasoning

### Phase 6: Charts & Data Visualization
Create wrapper components in components/charts/:
- AreaChart.tsx — Recharts AreaChart with custom tooltip
- DonutChart.tsx — with center label
- BarChart.tsx — horizontal bar chart for benchmarks
- LineChart.tsx — multi-series trend lines
- BenchmarkRow.tsx — your value vs peer comparison bar

### Phase 7: Polish
1. Add loading skeletons to all data-heavy components
2. Add empty states with illustrations for all list/table pages
3. Add toast notifications (sonner): `npm install sonner`
4. Add subtle entrance animations on all dashboard pages
5. Make the dashboard fully responsive (collapse sidebar on mobile)
6. Add dark mode support (already in Tailwind config)

## Design Rules (NON-NEGOTIABLE)
- Colors from CSS variables only — no hardcoded hex except in globals.css
- Font: Geist for headings, DM Sans for body. Never Inter or Arial.
- Sidebar is always dark (#0f1117) — light content area (#f8fafc)
- Cards: white background, subtle border + shadow (see design system)
- Every status has a specific badge color (see STATUS_STYLES in 07_FRONTEND_OVERVIEW.md)
- AI-handled items always show a small Bot icon + brand-colored indicator
- Tables have hover states and clickable rows
- All buttons have loading states

## API Integration
For now, use mock data that matches the API shape from 02_API_ROUTES.md.
Create lib/api/mock-data.ts with realistic data.
Wire up real API calls after backend is ready.
The API base URL is read from NEXT_PUBLIC_API_URL env var.

## Component Conventions
- Every page exports a default component
- Every data-fetching page uses TanStack Query
- Forms use react-hook-form + Zod validation
- Tables use TanStack Table
- All modals use shadcn Dialog
- Drawers/side panels use shadcn Sheet

## Quality Bar
The design should look good enough to show investors and close enterprise sales. Every pixel matters. Reference the Peec AI screenshot for the level of polish expected — this is a product people will pay thousands per month to use.

Start with Phase 1. Tell me when each phase is complete before moving to the next.
```

---

---

# HOW TO COORDINATE BOTH AGENTS

## Workspace Setup

```
propos/
├── propos-backend/     ← Backend agent works here
├── propos-frontend/    ← Frontend agent works here
└── specs/
    ├── 00_PROJECT_OVERVIEW.md
    ├── 01_DATABASE_SCHEMA.md
    ├── 02_API_ROUTES.md
    ├── 03_AI_AGENT_ENGINE.md
    ├── 04_INTEGRATIONS.md
    ├── 05_VENDOR_AND_STANDOUT_FEATURES.md
    ├── 06_ENVIRONMENT_SETUP.md
    ├── 07_FRONTEND_OVERVIEW.md
    ├── 08_LANDING_PAGE.md
    └── 09_DASHBOARD_PAGES.md
```

## Agent Handoff Points

When backend agent completes Phase 2 (Auth routes working), tell frontend agent:
```
The backend auth API is ready at localhost:3000.
- POST /api/v1/auth/login → { accessToken, refreshToken }
- POST /api/v1/auth/register
- GET /api/v1/auth/me
Update the auth pages to hit real API. Store access token in zustand, refresh token in httpOnly cookie.
```

When backend agent completes Phase 3 (CRUD modules), tell frontend agent:
```
Core CRUD APIs are live. Replace mock data in these pages with real TanStack Query hooks:
- /overview — GET /api/v1/analytics/portfolio
- /work-orders — GET /api/v1/work-orders
- /tenants — GET /api/v1/tenants
- /vendors — GET /api/v1/vendors
```

When backend agent completes Phase 5 (AI agent), tell frontend agent:
```
AI agent is running. Wire up the AI Activity page to:
- GET /api/v1/agent/logs
- GET /api/v1/agent/stats
Also connect the real-time AI processing indicator in the topbar using polling:
GET /api/v1/agent/stats → { activeJobs: number }
Poll every 3 seconds and show/hide the AI status pill.
```

## Environment Variables Handoff

Backend agent should output `.env.example`. Frontend agent needs:

```bash
# propos-frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_NAME=PropOS
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

---

## Quick Sanity Check Commands

After backend Phase 1:
```bash
cd propos-backend && docker compose up -d && npm run dev
curl http://localhost:3000/health
# Expected: { "status": "ok" }
```

After frontend Phase 1:
```bash
cd propos-frontend && npm run dev
# Visit http://localhost:3001
# Should see landing page with proper fonts and colors
```

After both are running:
```bash
# Test a full flow via API:
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"orgName":"Test Co","email":"test@test.com","password":"password123","firstName":"Test","lastName":"User"}'
```
