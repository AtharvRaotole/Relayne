# Environment Setup & Getting Started
## Dependencies, Docker, Environment Variables, and First Run

---

## `package.json`

```json
{
  "name": "propos-backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc --project tsconfig.build.json",
    "start": "node dist/server.js",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "workers:dev": "tsx watch src/jobs/worker.ts",
    "test": "vitest",
    "test:integration": "vitest --config vitest.integration.config.ts",
    "lint": "eslint src --ext .ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "@aws-sdk/client-s3": "^3.600.0",
    "@aws-sdk/s3-request-presigner": "^3.600.0",
    "@fastify/cors": "^9.0.0",
    "@fastify/helmet": "^11.1.0",
    "@fastify/jwt": "^8.0.0",
    "@fastify/multipart": "^8.3.0",
    "@fastify/rate-limit": "^9.1.0",
    "@fastify/type-provider-typebox": "^4.1.0",
    "@prisma/client": "^5.16.0",
    "@sendgrid/mail": "^8.1.3",
    "@sinclair/typebox": "^0.32.0",
    "bullmq": "^5.10.0",
    "date-fns": "^3.6.0",
    "fastify": "^4.28.0",
    "ioredis": "^5.4.1",
    "pino": "^9.3.2",
    "pino-pretty": "^11.2.1",
    "twilio": "^5.2.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "prisma": "^5.16.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

---

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## `.env.example`

```bash
# ─────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────
DATABASE_URL="postgresql://propos:password@localhost:5432/propos_dev"
REDIS_URL="redis://localhost:6379"

# ─────────────────────────────────────────────
# APP
# ─────────────────────────────────────────────
NODE_ENV="development"
PORT=3000
BASE_URL="http://localhost:3000"
LOG_LEVEL="debug"
ALLOWED_ORIGINS="http://localhost:3001,http://localhost:3000"

# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────
JWT_SECRET="change-this-to-a-long-random-string-in-production"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"
ENCRYPTION_KEY="32-character-key-for-credential-encryption"

# ─────────────────────────────────────────────
# AI
# ─────────────────────────────────────────────
ANTHROPIC_API_KEY="sk-ant-..."

# ─────────────────────────────────────────────
# SENDGRID (Email)
# ─────────────────────────────────────────────
SENDGRID_API_KEY="SG.xxx"
SENDGRID_WEBHOOK_SECRET="sendgrid-webhook-signing-key"
# Set up inbound parse: mail.propos.ai → POST /api/v1/webhooks/sendgrid/inbound

# ─────────────────────────────────────────────
# TWILIO (SMS)
# ─────────────────────────────────────────────
TWILIO_ACCOUNT_SID="ACxxx"
TWILIO_AUTH_TOKEN="xxx"
# Configure webhook: POST /api/v1/webhooks/twilio/sms

# ─────────────────────────────────────────────
# AWS S3 (File Storage)
# ─────────────────────────────────────────────
AWS_ACCESS_KEY_ID="xxx"
AWS_SECRET_ACCESS_KEY="xxx"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="propos-uploads"

# OR use MinIO for local dev:
# S3_ENDPOINT="http://localhost:9000"
# AWS_ACCESS_KEY_ID="minioadmin"
# AWS_SECRET_ACCESS_KEY="minioadmin"
# AWS_S3_BUCKET="propos-local"

# ─────────────────────────────────────────────
# VENDOR PORTAL
# ─────────────────────────────────────────────
VENDOR_PORTAL_URL="https://vendors.propos.ai"

# ─────────────────────────────────────────────
# PMS DEFAULTS (per-org stored in DB, these are fallbacks)
# ─────────────────────────────────────────────
DEFAULT_PO_APPROVAL_THRESHOLD=500
DEFAULT_EMERGENCY_SLA_HOURS=2
```

---

## `docker-compose.yml`

```yaml
version: '3.9'

services:
  # ── Application ─────────────────────────────────────
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://propos:password@postgres:5432/propos_dev
      REDIS_URL: redis://redis:6379
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

  # ── Worker (BullMQ) ─────────────────────────────────
  worker:
    build: .
    environment:
      DATABASE_URL: postgresql://propos:password@postgres:5432/propos_dev
      REDIS_URL: redis://redis:6379
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    command: npm run workers:dev

  # ── PostgreSQL ──────────────────────────────────────
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_USER: propos
      POSTGRES_PASSWORD: password
      POSTGRES_DB: propos_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U propos"]
      interval: 5s
      timeout: 5s
      retries: 5

  # ── Redis ────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # ── MinIO (S3-compatible local storage) ─────────────
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

  # ── BullMQ Dashboard ─────────────────────────────────
  bull-board:
    image: deadly0/bull-board
    ports:
      - "3002:3000"
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      - redis

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

## `Dockerfile`

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json .

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

---

## `src/config/env.ts`

```typescript
import { z } from 'zod'

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  BASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3001'),

  // Database
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  ENCRYPTION_KEY: z.string().min(32),

  // AI
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),

  // Email
  SENDGRID_API_KEY: z.string().startsWith('SG.'),
  SENDGRID_WEBHOOK_SECRET: z.string().optional(),

  // SMS
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC'),
  TWILIO_AUTH_TOKEN: z.string(),

  // Storage
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string(),
  S3_ENDPOINT: z.string().url().optional(),  // For MinIO

  // App config
  VENDOR_PORTAL_URL: z.string().url(),
  DEFAULT_PO_APPROVAL_THRESHOLD: z.coerce.number().default(500),
})

export type Env = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
```

---

## `src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

---

## `src/lib/redis.ts`

```typescript
import { Redis } from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,  // Required for BullMQ
  enableOfflineQueue: false,
})

redis.on('error', (err) => {
  console.error('Redis connection error:', err)
})
```

---

## Workers Entry Point — `src/jobs/worker.ts`

```typescript
import { Worker } from 'bullmq'
import { redis } from '../lib/redis'
import { processInboundMessage } from './processors/inbound-message.processor'
import { processVendorDispatch } from './processors/vendor-dispatch.processor'
import { processComplianceCheck } from './processors/compliance-check.processor'
import { processInvoiceReconciliation } from './processors/invoice-reconcile.processor'
import { processRenewalNudges } from './processors/renewal-nudge.processor'
import { processPmsSync } from './processors/pms-sync.processor'
import { setupCronJobs } from './schedulers/cron'
import { logger } from '../lib/logger'

// Create workers
new Worker('inbound-message', processInboundMessage, { connection: redis, concurrency: 10 })
new Worker('vendor-dispatch', processVendorDispatch, { connection: redis, concurrency: 5 })
new Worker('compliance-check', processComplianceCheck, { connection: redis, concurrency: 3 })
new Worker('invoice-reconcile', processInvoiceReconciliation, { connection: redis, concurrency: 5 })
new Worker('renewal-nudge', processRenewalNudges, { connection: redis, concurrency: 3 })
new Worker('pms-sync', processPmsSync, { connection: redis, concurrency: 2 })

// Setup recurring cron jobs
setupCronJobs().then(() => {
  logger.info('Cron jobs scheduled')
})

logger.info('Workers started')
```

---

## First Run Instructions

```bash
# 1. Clone repo and install
git clone https://github.com/yourorg/propos-backend.git
cd propos-backend
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your actual API keys

# 3. Start infrastructure
docker-compose up postgres redis minio -d

# 4. Run migrations
npx prisma migrate dev --name init
npx prisma generate

# 5. Seed test data (optional)
npm run db:seed

# 6. Start API server
npm run dev

# 7. In a separate terminal, start workers
npm run workers:dev

# 8. Open Prisma Studio (optional)
npm run db:studio

# 9. Open BullMQ Dashboard (optional)
# Visit http://localhost:3002

# API is now running at http://localhost:3000
# Health check: GET http://localhost:3000/health
```

---

## Health Check Endpoint

```typescript
// Add to src/server.ts
app.get('/health', async () => {
  const [dbOk, redisOk] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    redis.ping().then(() => true).catch(() => false),
  ])

  return {
    status: dbOk && redisOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: { database: dbOk, redis: redisOk }
  }
})
```

---

## Database Seed — `prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import { hash } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  // Create test organization
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-property-co' },
    update: {},
    create: {
      name: 'Demo Property Co',
      slug: 'demo-property-co',
      plan: 'GROWTH',
      unitCount: 500,
    }
  })

  // Create owner user
  const user = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'admin@demo.com',
      passwordHash: hash('sha256', 'password123'),  // Change in production!
      firstName: 'Admin',
      lastName: 'User',
      role: 'OWNER',
    }
  })

  // Create test property
  const property = await prisma.property.create({
    data: {
      organizationId: org.id,
      name: 'Elm Street Apartments',
      address: { street: '100 Elm Street', city: 'Austin', state: 'TX', zip: '78701' },
      unitCount: 50,
      yearBuilt: 2005,
    }
  })

  // Create test vendors
  await prisma.vendor.createMany({
    data: [
      {
        organizationId: org.id,
        companyName: 'Quick Fix Plumbing',
        contactName: 'Mike Johnson',
        email: 'mike@quickfixplumbing.com',
        phone: '+15125551234',
        trades: ['plumbing'],
        serviceZips: ['78701', '78702', '78703'],
        avgResponseTimeHours: 2.5,
        avgRating: 4.7,
        completionRate: 0.97,
        totalJobsCompleted: 45,
        preferredTier: 'PREFERRED',
        preferredChannel: 'EMAIL',
      },
      {
        organizationId: org.id,
        companyName: 'AirPro HVAC Services',
        contactName: 'Lisa Chen',
        email: 'lisa@airprohvac.com',
        phone: '+15125559999',
        trades: ['hvac'],
        serviceZips: ['78701', '78702'],
        avgResponseTimeHours: 4,
        avgRating: 4.5,
        completionRate: 0.95,
        totalJobsCompleted: 32,
        preferredTier: 'PREFERRED',
        preferredChannel: 'SMS',
      }
    ]
  })

  console.log('Seed completed:', { org: org.name, user: user.email, property: property.name })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```
