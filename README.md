# Relayne

AI Property Operations Coordinator — backend for PropOS, an autonomous AI system that handles vendor coordination, tenant communication, and compliance for mid-market residential property managers.

## Tech Stack

- **Runtime:** Node.js 20+ / TypeScript (strict)
- **Framework:** Fastify
- **ORM:** Prisma + PostgreSQL 15 (pgvector)
- **Task Queue:** BullMQ + Redis
- **Auth:** JWT (access + refresh) + API keys

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment
cp .env.example .env
# Edit .env with your values

# Start infrastructure
docker compose up -d postgres redis minio

# Run migrations
npx prisma migrate dev --name init
npx prisma generate

# Start API server
npm run dev

# In another terminal: start workers
npm run workers:dev
```

## API

- **Health:** `GET /health`
- **Auth:** `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`

## Docs

- **Setup & keys:** [SETUP_AND_KEYS.md](./SETUP_AND_KEYS.md)
- **Local testing:** [LOCAL_TEST.md](./LOCAL_TEST.md)
- **Demo deployment:** [docs/12_DEMO_DEPLOYMENT.md](./docs/12_DEMO_DEPLOYMENT.md)
- **API, schema, AI agent:** see [docs/](./docs/) for full specs.

## License

Private
