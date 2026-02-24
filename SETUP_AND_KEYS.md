# PropOS / Relayne — Setup, Keys & Next Steps

## ✅ Phases Status

**All backend phases (1–10) are complete and committed.**

---

## 🔑 Keys & Environment Variables

Create a `.env` file in the **backend root** (Relayne/) by copying `.env.example`:

```bash
cp .env.example .env
```

### Required Keys to Provide

| Variable | Where to get it | Purpose |
|----------|-----------------|---------|
| **DATABASE_URL** | Local: `postgresql://propos:password@localhost:5432/propos_dev` | PostgreSQL connection |
| **REDIS_URL** | Local: `redis://localhost:6379` | BullMQ / Redis |
| **JWT_SECRET** | Generate: `openssl rand -base64 32` | JWT signing |
| **ENCRYPTION_KEY** | 32+ chars (e.g. `openssl rand -base64 24`) | Credential encryption |
| **ANTHROPIC_API_KEY** | [console.anthropic.com](https://console.anthropic.com) | Claude AI |
| **SENDGRID_API_KEY** | [sendgrid.com](https://sendgrid.com) | Email sending |
| **SENDGRID_WEBHOOK_SECRET** | SendGrid Inbound Parse | Webhook verification |
| **TWILIO_ACCOUNT_SID** | [twilio.com](https://twilio.com) | SMS |
| **TWILIO_AUTH_TOKEN** | Twilio Console | SMS |
| **AWS_ACCESS_KEY_ID** | AWS IAM or MinIO | File storage |
| **AWS_SECRET_ACCESS_KEY** | AWS IAM or MinIO | File storage |
| **AWS_REGION** | e.g. `us-east-1` | S3 region |
| **AWS_S3_BUCKET** | S3 bucket name or `propos-local` | Storage bucket |
| **VENDOR_PORTAL_URL** | e.g. `http://localhost:3001` | Vendor portal URL |

### Local Dev Shortcuts (MinIO)

For local dev you can use MinIO instead of real AWS:

```bash
S3_ENDPOINT="http://localhost:9000"
AWS_ACCESS_KEY_ID="minioadmin"
AWS_SECRET_ACCESS_KEY="minioadmin"
AWS_S3_BUCKET="propos-local"
```

---

## 📋 Next Steps (In Order)

### 1. Start infrastructure

```bash
docker compose up postgres redis minio -d
```

### 2. Run database migrations

```bash
npx prisma migrate dev
npx prisma generate
```

### 3. Seed test data (optional)

```bash
npm run db:seed
```

### 4. Start backend API

```bash
npm run dev
```

API runs at **http://localhost:3000**

### 5. Start BullMQ workers (separate terminal)

```bash
npm run workers:dev
```

### 6. Start frontend

```bash
cd propos-frontend
npm install   # if not done yet
npm run dev
```

Frontend runs at **http://localhost:3001** (or the port Next.js shows)

### 7. Optional tools

- **Prisma Studio:** `npm run db:studio` — DB browser
- **BullMQ Dashboard:** Visit http://localhost:3002 (if using full docker-compose)

---

## 🌐 Endpoints

| Service | URL |
|---------|-----|
| Backend API | http://localhost:3000 |
| Frontend (home) | http://localhost:3001 |
| Prisma Studio | http://localhost:5555 (when running) |
