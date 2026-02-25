# PropOS — Demo-Ready MVP Prompt
## Free Tier Stack · Deploy Tonight · Demo Tomorrow

Paste this entire prompt into Cursor Agent.

---

```
You are a senior engineer. I have a demo tomorrow. I need to take the existing PropOS codebase and make it fully deployable tonight using 100% free tier services. Speed is everything. Cut scope where needed — the demo must work, look great, and not crash.

## Free Tier Stack (use exactly these services)

| What          | Service        | Free Tier Limits              | Why                          |
|---------------|----------------|-------------------------------|------------------------------|
| Database      | Supabase       | 500MB, 2 projects             | PostgreSQL + pgvector built-in, instant setup |
| Redis / Queue | Upstash        | 10,000 commands/day           | Serverless Redis, zero config |
| File Storage  | Supabase Storage | 1GB                         | Same project, no extra setup |
| Email         | Resend         | 3,000 emails/month            | Simpler than SendGrid, better DX |
| SMS           | Twilio         | Free trial credits (~$15)     | Keep existing, just use trial |
| Backend Host  | Railway        | $5 free credit (enough)       | One-click deploy, env vars UI |
| Frontend Host | Vercel         | Unlimited hobby               | Next.js native, instant deploy |
| AI            | Anthropic API  | Pay-as-you-go (demo = ~$2)    | Keep as-is                   |

---

## Step 1: Supabase Setup (do this first, takes 5 minutes)

1. Go to supabase.com → New project → name it "propos-mvp"
2. Save the password somewhere safe
3. Go to Settings → API → copy:
   - Project URL (SUPABASE_URL)
   - anon/public key (SUPABASE_ANON_KEY)
   - service_role key (SUPABASE_SERVICE_KEY)
4. Go to Settings → Database → copy the connection string (use "URI" format with connection pooling - port 6543)

Update DATABASE_URL in .env:
```
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

Update prisma/schema.prisma datasource:
```prisma
datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  directUrl         = env("DIRECT_URL")
  extensions        = [pgvector(map: "vector")]
}
```

Enable pgvector in Supabase:
Go to Database → Extensions → search "vector" → enable it

Run migrations:
```bash
npx prisma migrate deploy
npx prisma generate
```

---

## Step 2: Upstash Redis Setup

1. Go to console.upstash.com → Create Database → name "propos-mvp" → region us-east-1
2. Copy the UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
3. Also copy the redis:// connection string for BullMQ

Install:
```bash
npm install @upstash/redis ioredis
```

Update src/lib/redis.ts:
```typescript
import { Redis } from 'ioredis'

// For BullMQ (needs ioredis compatible client)
export const redis = new Redis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null,
  tls: { rejectUnauthorized: false },
})
```

Add to .env:
```
UPSTASH_REDIS_URL="rediss://default:[token]@[endpoint].upstash.io:6379"
```

---

## Step 3: Swap SendGrid → Resend

Resend is simpler, more reliable, and has a better free tier.

```bash
npm uninstall @sendgrid/mail
npm install resend
```

Replace src/integrations/email/sender.ts entirely:

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(params: {
  to: string
  toName?: string
  subject: string
  text: string
  html?: string
  organizationId: string
}) {
  const { data, error } = await resend.emails.send({
    from: 'PropOS <noreply@propos.ai>',   // Use onboarding@resend.dev for testing if domain not set up
    to: [params.to],
    subject: params.subject,
    text: params.text,
    html: params.html || `<p>${params.text.replace(/\n/g, '<br>')}</p>`,
  })

  if (error) throw new Error(`Email send failed: ${error.message}`)
  return { messageId: data?.id }
}
```

For inbound email in the demo: skip the SendGrid webhook. Instead, use a simple POST endpoint that simulates inbound email for demo purposes:

```typescript
// src/webhooks/demo-inbound.webhook.ts
// Add this route for demo: POST /api/v1/demo/inbound-message
app.post('/demo/inbound-message', {
  preHandler: [requireAuth],  // Requires auth for demo UI
}, async (request, reply) => {
  const { tenantId, message, propertyId } = request.body as any
  // Directly enqueue message processing
  const msg = await prisma.message.create({
    data: {
      threadId: (await createOrFindThread(request.organizationId, tenantId)).id,
      tenantId,
      direction: 'INBOUND',
      channel: 'EMAIL',
      body: message,
    }
  })
  await inboundMessageQueue.add('process', {
    messageId: msg.id,
    organizationId: request.organizationId,
    tenantId,
  })
  return reply.send({ success: true, messageId: msg.id })
})
```

Add to .env:
```
RESEND_API_KEY="re_xxxx"
```

---

## Step 4: Supabase Storage (replace S3)

Replace src/lib/s3.ts with Supabase Storage client:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function uploadFile(params: {
  bucket: string
  path: string
  file: Buffer
  contentType: string
}): Promise<string> {
  const { data, error } = await supabase.storage
    .from(params.bucket)
    .upload(params.path, params.file, {
      contentType: params.contentType,
      upsert: false,
    })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data: urlData } = supabase.storage
    .from(params.bucket)
    .getPublicUrl(data.path)

  return urlData.publicUrl
}
```

Create the storage bucket in Supabase Dashboard:
Go to Storage → New bucket → name "propos-uploads" → Public

Add to .env:
```
SUPABASE_URL="https://[ref].supabase.co"
SUPABASE_SERVICE_KEY="eyJ..."
```

---

## Step 5: Update .env for full free tier stack

Create this complete .env file:

```bash
# App
NODE_ENV=production
PORT=3000
BASE_URL=https://propos-backend-production.up.railway.app
LOG_LEVEL=info
ALLOWED_ORIGINS=https://propos-mvp.vercel.app,http://localhost:3001

# Database (Supabase)
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[ref]:[pass]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Redis (Upstash)
UPSTASH_REDIS_URL="rediss://default:[token]@[endpoint].upstash.io:6379"

# Auth
JWT_SECRET="generate-a-64-char-random-string-here"
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
ENCRYPTION_KEY="generate-a-64-char-hex-string-here"

# AI
ANTHROPIC_API_KEY="sk-ant-..."

# Email (Resend)
RESEND_API_KEY="re_..."

# SMS (Twilio - use trial)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."

# Storage (Supabase)
SUPABASE_URL="https://[ref].supabase.co"
SUPABASE_SERVICE_KEY="eyJ..."

# Demo
VENDOR_PORTAL_URL=https://propos-backend-production.up.railway.app
DEFAULT_PO_APPROVAL_THRESHOLD=500
```

Generate secrets:
```bash
# JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 6: Deploy Backend to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize in backend folder
cd propos-backend
railway init

# Link to project (after creating project on railway.app)
railway link

# Set all env vars (copy from .env)
railway variables set NODE_ENV=production PORT=3000 DATABASE_URL="..." # etc for all vars

# Deploy
railway up

# Get your deployment URL
railway open
# Copy the URL — looks like: https://propos-backend-production.up.railway.app
```

**Railway.app manual setup (if CLI not working):**
1. Go to railway.app → New Project → Deploy from GitHub repo
2. Select your repo + `propos-backend` directory
3. Add all env vars in Variables tab
4. Railway auto-detects Node.js and runs `npm start`

Add to package.json scripts if not there:
```json
"start": "node dist/server.js",
"build": "tsc --project tsconfig.build.json && npx prisma generate"
```

Add Procfile in root:
```
web: npm start
```

---

## Step 7: Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# In frontend folder
cd propos-frontend

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No → create new
# - Project name: propos-mvp
# - Framework: Next.js (auto-detected)
# - Root directory: ./

# Set env vars
vercel env add NEXT_PUBLIC_API_URL
# Enter: https://propos-backend-production.up.railway.app/api/v1

vercel env add NEXT_PUBLIC_APP_NAME
# Enter: PropOS

# Deploy to production
vercel --prod
```

**Vercel Dashboard (if CLI not working):**
1. vercel.com → New Project → Import Git Repository
2. Select `propos-frontend`
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = your Railway URL + `/api/v1`
   - `NEXT_PUBLIC_APP_NAME` = PropOS
4. Deploy

---

## Step 8: Demo Data Seed

Run this after deployment to load realistic demo data:

```bash
# From propos-backend, pointing at production DB
DATABASE_URL="your-supabase-url" npx ts-node prisma/seed.ts
```

Enhance prisma/seed.ts with DEMO-QUALITY data:

```typescript
// Make sure seed creates:

// 1. Demo org with realistic name
const org = await prisma.organization.upsert({
  where: { slug: 'pinnacle-residential' },
  update: {},
  create: {
    name: 'Pinnacle Residential',
    slug: 'pinnacle-residential',
    plan: 'GROWTH',
    unitCount: 2400,
  }
})

// 2. Demo user (what you'll log in with at demo)
// Email: demo@pinnacle.com / Password: Demo2024!

// 3. 3 realistic properties in different cities
const properties = [
  { name: 'The Elm at South Congress', address: { street: '2200 S Congress Ave', city: 'Austin', state: 'TX', zip: '78704' }, unitCount: 120 },
  { name: 'Midtown Commons', address: { street: '400 W 15th St', city: 'Austin', state: 'TX', zip: '78701' }, unitCount: 85 },
  { name: 'Riverside Flats', address: { street: '1800 Riverside Dr', city: 'Austin', state: 'TX', zip: '78741' }, unitCount: 64 },
]

// 4. 8 vendors across trades (plumbing, HVAC, electrical, pest, cleaning)
// Mix of PREFERRED, STANDARD tiers, different ratings

// 5. 24 work orders in various states:
//    - 3 EMERGENCY (create one with no vendor assigned — triggers escalation for demo)
//    - 6 IN_PROGRESS
//    - 8 COMPLETED (last 30 days — shows chart activity)
//    - 4 DISPATCHED
//    - 3 ESCALATED (these show up in escalations tab)

// 6. 12 tenants with varied churn risk scores
//    - 3 high risk (> 0.7) — one with lease ending in 12 days
//    - 5 medium risk
//    - 4 low risk

// 7. 6 compliance tasks:
//    - 1 OVERDUE (elevator inspection)
//    - 2 AT_RISK (due this week)
//    - 3 UPCOMING

// 8. 15 agent logs showing AI activity
//    - Mix of COMPLETED, ESCALATED statuses
//    - Realistic finalAction strings like "Dispatched Quick Fix Plumbing to Unit 5B for HVAC repair"

// 9. 3 open escalations (shows up as red badge in sidebar)
//    - LEGAL_RISK: Fair Housing concern in tenant message
//    - HIGH_COST: Invoice $1,240 — 3x above benchmark
//    - EMERGENCY_UNRESOLVED: No vendor response after 3 hours

// 10. Invoice anomaly — one flagged invoice for demo of reconciliation feature
```

---

## Step 9: Demo-Specific Tweaks (make the demo pop)

### Tweak 1: Remove blocking auth from demo flow
Add a demo mode bypass so you can show the dashboard without logging in during demo:

```typescript
// In auth middleware, check for demo token
if (request.headers['x-demo-mode'] === process.env.DEMO_SECRET) {
  request.user = { id: 'demo-user', organizationId: DEMO_ORG_ID, role: 'OWNER' }
  return
}
```

```
DEMO_SECRET="demo-propos-2024"
DEMO_ORG_ID="your-seeded-org-id"
```

### Tweak 2: Add a "trigger AI" button to dashboard
In the frontend overview page, add a demo trigger button that sends a test maintenance request through the full AI pipeline and shows it processing in real time:

```tsx
// In overview/page.tsx — bottom of page
<DemoTriggerButton 
  label="🎬 Demo: Simulate Tenant Request"
  message="Hi, my HVAC stopped working last night, it's really hot. Unit 4B. - Marcus"
  tenantId={DEMO_TENANT_ID}
/>
```

```typescript
// DemoTriggerButton.tsx
async function triggerDemo() {
  setIsLoading(true)
  await api.post('/demo/inbound-message', {
    tenantId, message, propertyId: DEMO_PROPERTY_ID
  })
  // Poll agent logs every 2 seconds and show toast when complete
  const interval = setInterval(async () => {
    const logs = await api.get('/agent/logs?limit=1')
    if (logs.data[0]?.status === 'COMPLETED') {
      clearInterval(interval)
      toast.success('AI handled it — work order created, vendor dispatched, tenant notified')
      router.refresh()
      setIsLoading(false)
    }
  }, 2000)
}
```

### Tweak 3: Real-time AI activity indicator
Make the topbar AI pill update live during the demo:

```typescript
// In Topbar.tsx — poll every 3 seconds
const { data } = useQuery({
  queryKey: ['agent-active'],
  queryFn: () => api.get('/agent/stats').then(r => r.data),
  refetchInterval: 3000,
})
```

### Tweak 4: Realistic chart data
Make sure the analytics charts show 30 days of realistic-looking data with an upward trend in AI automation rate. Seed this in prisma/seed.ts.

---

## Step 10: Pre-Demo Checklist

Run through this the night before:

```bash
# Backend health
curl https://your-railway-url.up.railway.app/health
# Expected: { "status": "ok" }

# Frontend loads
open https://your-vercel-url.vercel.app
# Expected: Landing page with correct fonts and animations

# Login works
# Go to /login → demo@pinnacle.com / Demo2024!
# Expected: Dashboard with real data

# AI demo trigger works  
# Click "Demo: Simulate Tenant Request" button
# Expected: Toast appears within 15 seconds saying "AI handled it"

# Escalations show up
# Go to /escalations — should show 3 open items

# Compliance risk banner shows
# Go to /compliance — should show red "2 overdue" banner

# Analytics charts have data
# Go to /analytics — should show 30 days of chart data

# AI Activity log has entries
# Go to /ai-activity — should show 15+ agent log entries with expandable steps
```

---

## Demo Script (what to show, in order)

1. **Landing page** (30 sec) — show the product positioning, key metrics, how it works section

2. **Login → Overview dashboard** (1 min) — KPI cards, AI automation rate ring (78%), show the AI status pill in topbar

3. **Trigger live AI demo** (2 min) — click the demo button, watch the AI pill spin, refresh work orders after 15 sec, show the newly created work order with AI badge

4. **Work Order detail** (1 min) — click into the AI-created WO, show the timeline with AI-generated messages, show vendor dispatch event, PO number

5. **Escalations page** (1 min) — show the 3 open escalations, especially the "Invoice 3x above benchmark" one, show the AI's recommendation card, explain the 80/20 story

6. **Tenants → high risk tenant** (1 min) — click on the tenant with 89% churn risk and 12-day lease expiry, show the churn score, explain the renewal workflow

7. **Compliance page** (30 sec) — show the red overdue banner, explain jurisdiction-aware autopilot

8. **AI Activity log** (1 min) — show the transparency story: every decision explained step by step, investors love this

9. **Analytics → Benchmarks** (30 sec) — show how their cost per ticket compares to similar operators

Total: ~8 minutes. Perfect demo length.

---

After completing all steps, verify the deployment and output:
```
DEMO READY ✅

Backend:  https://[your-railway-url].up.railway.app
Frontend: https://[your-vercel-url].vercel.app

Login: demo@pinnacle.com / Demo2024!

Services:
  Database (Supabase):    ✅
  Redis (Upstash):        ✅
  Email (Resend):         ✅
  Backend (Railway):      ✅
  Frontend (Vercel):      ✅

Demo data:
  Properties:   3
  Tenants:      12
  Work Orders:  24
  Vendors:      8
  Escalations:  3 open
  Compliance:   1 overdue, 2 at-risk
  Agent Logs:   15+

Estimated AI cost for 1-hour demo: ~$0.50
```
```
