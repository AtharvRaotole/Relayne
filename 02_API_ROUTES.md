# API Routes Specification
## Fastify REST API — Full Endpoint Reference

> Base path: `/api/v1`
> All routes require `Authorization: Bearer <token>` unless marked `[PUBLIC]`
> All responses follow: `{ success: boolean, data?: T, error?: { code, message } }`

---

## Setup & Entry Point

### `src/server.ts`

```typescript
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'

export async function buildApp() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL || 'info' },
  }).withTypeProvider<TypeBoxTypeProvider>()

  // Security
  await app.register(helmet)
  await app.register(cors, { origin: process.env.ALLOWED_ORIGINS?.split(',') })
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })
  await app.register(jwt, { secret: process.env.JWT_SECRET! })
  await app.register(multipart, { limits: { fileSize: 10_000_000 } }) // 10MB

  // Routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(organizationRoutes, { prefix: '/api/v1/organizations' })
  await app.register(propertyRoutes, { prefix: '/api/v1/properties' })
  await app.register(tenantRoutes, { prefix: '/api/v1/tenants' })
  await app.register(vendorRoutes, { prefix: '/api/v1/vendors' })
  await app.register(workOrderRoutes, { prefix: '/api/v1/work-orders' })
  await app.register(complianceRoutes, { prefix: '/api/v1/compliance' })
  await app.register(communicationRoutes, { prefix: '/api/v1/communications' })
  await app.register(invoiceRoutes, { prefix: '/api/v1/invoices' })
  await app.register(analyticsRoutes, { prefix: '/api/v1/analytics' })
  await app.register(escalationRoutes, { prefix: '/api/v1/escalations' })
  await app.register(agentRoutes, { prefix: '/api/v1/agent' })
  await app.register(webhookRoutes, { prefix: '/api/v1/webhooks' })
  await app.register(integrationRoutes, { prefix: '/api/v1/integrations' })

  return app
}
```

---

## Authentication — `/api/v1/auth`

```
POST   /auth/register          [PUBLIC] Create organization + owner account
POST   /auth/login             [PUBLIC] Returns { accessToken, refreshToken }
POST   /auth/refresh           [PUBLIC] Refresh access token
POST   /auth/logout            Invalidate refresh token
GET    /auth/me                Get current user profile
PATCH  /auth/me                Update profile (name, phone, avatar)
POST   /auth/change-password   Change password
POST   /auth/invite            Send invite to new team member
POST   /auth/accept-invite/:token [PUBLIC] Accept team invite
GET    /auth/api-keys          List API keys
POST   /auth/api-keys          Create API key
DELETE /auth/api-keys/:id      Revoke API key
```

### Auth Middleware (`src/shared/middleware/auth.ts`)

```typescript
import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Try Bearer JWT first
    const auth = request.headers.authorization
    if (auth?.startsWith('Bearer ')) {
      await request.jwtVerify()
      return
    }
    // Try API key (format: propos_live_xxxx)
    if (auth?.startsWith('Key ')) {
      const key = auth.slice(4)
      const keyHash = hashApiKey(key)
      const apiKey = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { organization: true }
      })
      if (!apiKey || !apiKey.isActive) {
        return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } })
      }
      // Attach org context to request
      ;(request as any).organizationId = apiKey.organizationId
      ;(request as any).scopes = apiKey.scopes
      return
    }
    reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } })
  } catch (err) {
    reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } })
  }
}
```

---

## Properties — `/api/v1/properties`

```
GET    /properties                    List all properties (paginated, filterable)
POST   /properties                    Create property
GET    /properties/:id                Get property details
PATCH  /properties/:id                Update property
DELETE /properties/:id                Soft-delete property

GET    /properties/:id/units          List units with occupancy status
POST   /properties/:id/units          Create unit
PATCH  /properties/:id/units/:unitId  Update unit

GET    /properties/:id/metrics        KPIs: open WOs, compliance status, avg response time
GET    /properties/:id/capital-plan   AI-generated CapEx forecast
GET    /properties/:id/work-orders    Work orders for property (filterable by status)
GET    /properties/:id/compliance     Compliance tasks for property
```

### Key Query Params for List Endpoints

```
GET /properties?page=1&limit=20&search=elm&propertyType=MULTIFAMILY&isActive=true
GET /properties/:id/work-orders?status=DISPATCHED,IN_PROGRESS&priority=HIGH,EMERGENCY&from=2024-01-01&to=2024-12-31
```

---

## Tenants — `/api/v1/tenants`

```
GET    /tenants                       List tenants (paginated)
POST   /tenants                       Create tenant
GET    /tenants/:id                   Tenant profile + current lease + churn risk
PATCH  /tenants/:id                   Update tenant
GET    /tenants/:id/messages          Full communication history (all channels, unified)
GET    /tenants/:id/work-orders       Work order history
GET    /tenants/:id/ai-summary        AI-generated tenant relationship summary
POST   /tenants/:id/send-message      Send message to tenant (email/SMS based on preference)
POST   /tenants/bulk-import           Import from CSV or PMS sync
```

### `GET /tenants/:id/ai-summary` Response

```json
{
  "success": true,
  "data": {
    "churnRiskScore": 0.72,
    "churnRiskFactors": ["Lease ends in 47 days", "3 unresolved maintenance complaints", "No renewal inquiry yet"],
    "satisfactionScore": 0.41,
    "recentInteractions": 8,
    "openIssues": 2,
    "recommendation": "Initiate renewal outreach immediately. Address open HVAC complaint before renewal conversation.",
    "suggestedMessage": "Hi Sarah, I wanted to personally reach out about..."
  }
}
```

---

## Vendors — `/api/v1/vendors`

```
GET    /vendors                       List vendors (filter by trade, zip, tier)
POST   /vendors                       Add vendor
GET    /vendors/:id                   Vendor profile + performance metrics
PATCH  /vendors/:id                   Update vendor
GET    /vendors/:id/work-orders       Job history
GET    /vendors/:id/ratings           All ratings
POST   /vendors/:id/rate              Submit rating for completed job

GET    /vendors/recommend             AI vendor recommendation for a job
       ?trade=plumbing&zip=10001&budget=500&priority=HIGH

POST   /vendors/bulk-import           Import vendor list from CSV
```

### `GET /vendors/recommend` Response

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "vendorId": "clx...",
        "vendorName": "Quick Fix Plumbing",
        "score": 0.94,
        "reasons": ["Avg response 2.1 hrs", "98% completion rate", "5 jobs in this building"],
        "estimatedCost": 320,
        "availability": "Can schedule tomorrow 9am-12pm"
      }
    ]
  }
}
```

---

## Work Orders — `/api/v1/work-orders`

```
GET    /work-orders                   List (filter by status, priority, property, assigned vendor)
POST   /work-orders                   Create work order manually
GET    /work-orders/:id               Full work order detail + timeline + messages
PATCH  /work-orders/:id               Update work order
DELETE /work-orders/:id               Cancel work order

POST   /work-orders/:id/assign-vendor    Manually assign vendor
POST   /work-orders/:id/dispatch         Trigger AI vendor dispatch
POST   /work-orders/:id/complete         Mark as complete + upload photos
POST   /work-orders/:id/escalate         Manual escalation with reason
POST   /work-orders/:id/approve-po       Approve purchase order
POST   /work-orders/:id/reject-po        Reject PO with reason

GET    /work-orders/:id/timeline         Full event timeline
POST   /work-orders/:id/message          Send message to vendor or tenant about this WO

POST   /work-orders/triage               [INTERNAL] AI triage endpoint — called by job processor
```

### Work Order Status Flow

```
NEW → TRIAGED → VENDOR_SEARCH → DISPATCHED → SCHEDULED → IN_PROGRESS → PENDING_REVIEW → COMPLETED
                              ↘ PENDING_BIDS ↗
                                          ↘ ESCALATED (at any stage)
```

### `POST /work-orders` Request Body

```typescript
{
  propertyId: string       // required
  unitId?: string
  tenantId?: string
  title: string            // required
  description: string      // required
  category: WorkOrderCategory
  priority?: Priority       // AI will determine if not provided
  scheduledAt?: string      // ISO datetime
  accessInstructions?: string
  estimatedCost?: number
  sourceChannel?: CommChannel
}
```

---

## Communications — `/api/v1/communications`

```
GET    /communications/threads        List all threads (filter by status, tenant, vendor)
GET    /communications/threads/:id    Thread detail + all messages
POST   /communications/threads        Create new thread
PATCH  /communications/threads/:id    Update thread status

POST   /communications/send           Send message (email/SMS/portal)
       Body: { to, channel, subject?, body, threadId?, workOrderId? }

GET    /communications/inbox          Unified inbox — unread/unprocessed messages
GET    /communications/queue          Messages pending AI processing
```

---

## Compliance — `/api/v1/compliance`

```
GET    /compliance                    List all compliance tasks (filter by status, property, type)
POST   /compliance                    Create compliance task
GET    /compliance/:id                Task detail
PATCH  /compliance/:id                Update task
POST   /compliance/:id/complete       Mark complete + upload proof document
POST   /compliance/:id/snooze         Snooze reminder (with reason)

GET    /compliance/calendar           All upcoming tasks in calendar view
GET    /compliance/risk-report        AI-generated risk summary across portfolio
GET    /compliance/generate-notice    Generate legal notice text for a task
       Body: { taskId, noticeType, recipientType: "tenant"|"owner" }

GET    /compliance/jurisdictions      List jurisdiction configs
POST   /compliance/jurisdictions      Add jurisdiction ruleset
PATCH  /compliance/jurisdictions/:id  Update ruleset
```

### `GET /compliance/risk-report` Response

```json
{
  "success": true,
  "data": {
    "overdue": 2,
    "dueSoon": 5,
    "atRisk": 3,
    "criticalItems": [
      {
        "taskId": "clx...",
        "title": "Elevator Annual Inspection — 100 Main St",
        "dueDate": "2024-02-15",
        "daysOverdue": 3,
        "legalExposure": "HIGH",
        "recommendedAction": "Dispatch certified elevator inspection company immediately. Notice to tenants required within 24h."
      }
    ]
  }
}
```

---

## Invoices — `/api/v1/invoices`

```
GET    /invoices                      List (filter by status, vendor, date range)
POST   /invoices                      Create/upload invoice
GET    /invoices/:id                  Invoice detail + AI reconciliation notes
PATCH  /invoices/:id                  Update invoice
POST   /invoices/:id/approve          Approve for payment
POST   /invoices/:id/dispute          Flag as disputed with reason
POST   /invoices/:id/process          [INTERNAL] Run AI reconciliation on invoice

GET    /invoices/anomalies            List invoices flagged by AI as anomalous
GET    /invoices/benchmark            Pricing benchmarks by trade and ZIP
```

---

## Escalations — `/api/v1/escalations`

```
GET    /escalations                   List open escalations (filter by priority, reason, assignee)
GET    /escalations/:id               Escalation detail + full context assembled by AI
PATCH  /escalations/:id/assign        Assign to user
POST   /escalations/:id/resolve       Resolve with resolution notes
POST   /escalations/:id/dismiss       Dismiss as not actionable

GET    /escalations/stats             Escalation metrics (volume, avg resolution time, by reason)
```

---

## Agent — `/api/v1/agent`

```
GET    /agent/logs                    List agent execution logs
GET    /agent/logs/:id                Full log with step-by-step reasoning
GET    /agent/stats                   AI performance metrics
       Returns: automationRate, avgConfidence, tokensUsed, costEstimate

POST   /agent/test-run                [DEV] Manually trigger agent on a test input
POST   /agent/feedback                Submit feedback on agent decision (thumbs up/down)
       Body: { agentLogId, rating: "good"|"bad", notes? }
```

---

## Analytics — `/api/v1/analytics`

```
GET    /analytics/portfolio           Portfolio-level KPI dashboard
GET    /analytics/properties/:id      Per-property analytics
GET    /analytics/vendors             Vendor performance report
GET    /analytics/tenants/churn       Churn risk report across portfolio
GET    /analytics/maintenance-trends  Trending maintenance categories + seasonality
GET    /analytics/benchmarks          Industry benchmarks (anonymized cross-org data)
GET    /analytics/capex-forecast      AI-generated capital expenditure forecast
GET    /analytics/labor-savings       Estimated hours saved by AI automation
```

### `GET /analytics/portfolio` Response (Sample)

```json
{
  "success": true,
  "data": {
    "period": "last_30_days",
    "workOrders": {
      "total": 142,
      "aiHandledPct": 78,
      "avgResolutionHours": 18.4,
      "slaCompliancePct": 91
    },
    "maintenance": {
      "avgCostPerTicket": 284,
      "benchmarkCostPerTicket": 340,
      "savingsVsBenchmark": 8000
    },
    "tenants": {
      "avgChurnRisk": 0.23,
      "atRiskCount": 14,
      "renewalsSent": 8
    },
    "compliance": {
      "upToDate": 94,
      "overdue": 2,
      "dueSoon": 6
    },
    "aiAutomation": {
      "coordinatorHoursSaved": 312,
      "estimatedLaborValueSaved": 15600
    }
  }
}
```

---

## Webhooks — `/api/v1/webhooks`

```
POST   /webhooks/sendgrid/inbound     [PUBLIC+SIGNED] Inbound email from SendGrid
POST   /webhooks/twilio/sms           [PUBLIC+SIGNED] Inbound SMS from Twilio
POST   /webhooks/twilio/voice         [PUBLIC+SIGNED] Voice call notification
POST   /webhooks/appfolio             [PUBLIC+SIGNED] AppFolio event webhook
POST   /webhooks/yardi                [PUBLIC+SIGNED] Yardi event webhook
POST   /webhooks/buildium             [PUBLIC+SIGNED] Buildium event webhook
```

All webhooks verify signatures before processing. Processing is async — webhook handler enqueues a job and immediately returns 200.

---

## Integrations — `/api/v1/integrations`

```
GET    /integrations                  List connected integrations + status
POST   /integrations/pms/connect      Connect PMS (AppFolio/Yardi/Buildium)
       Body: { pmsType, credentials: { apiKey, domain, ... } }
POST   /integrations/pms/test         Test PMS connection
POST   /integrations/pms/sync         Trigger full sync (properties, units, tenants, leases)
DELETE /integrations/pms/:type        Disconnect PMS
POST   /integrations/email/connect    Connect SendGrid (verify domain)
POST   /integrations/sms/connect      Connect Twilio (verify number)
```

---

## Error Codes

| Code | HTTP | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Valid token but insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Request body validation failed |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `PMS_SYNC_FAILED` | 502 | PMS integration error |
| `AGENT_ERROR` | 500 | AI agent execution error |
