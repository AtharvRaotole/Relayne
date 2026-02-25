# Full-stack local test (before deploy)

Use this to run the whole product locally and confirm everything works.

## Prerequisites

- Node 18+
- `.env` in repo root filled (Supabase, Upstash, Resend, OpenAI, etc.)
- Database already pushed and seeded (`npx prisma db push` and `npx prisma seed` done)

## 1. Start the backend (Terminal 1)

From the **repo root** (not inside `propos-frontend`):

```bash
cd /Users/atharvraotole/Desktop/Relayne
npm run dev
```

Wait until you see something like: `Server listening` on port 3000.

## 2. Start the worker (Terminal 2)

The worker processes inbound messages and other jobs (so the “Demo: Simulate Tenant Request” flow runs end-to-end). In a **second terminal**:

```bash
cd /Users/atharvraotole/Desktop/Relayne
npm run workers:dev
```

Leave it running.

## 3. Start the frontend (Terminal 3)

Frontend runs on port **3001** so it doesn’t clash with the backend (3000). In a **third terminal**:

```bash
cd /Users/atharvraotole/Desktop/Relayne/propos-frontend
PORT=3001 npm run dev
```

Wait until Next.js is ready (e.g. “Ready on http://localhost:3001”).

## 4. Quick health check

In a browser or with curl:

```bash
curl -s http://localhost:3000/health
```

You should see something like: `{"status":"ok","timestamp":"...","services":{"database":true,"redis":true}}`.

## 5. Test in the browser

1. Open **http://localhost:3001**
2. Go to **Log in** (e.g. from the nav or `/login`).
3. Log in with the seeded demo user:
   - Email: **demo@pinnacle.com**
   - Password: **Demo2024!**
4. You should be redirected to the **Overview** dashboard.
5. On Overview, click **“Demo: Simulate Tenant Request”**.
   - The backend creates an inbound message and the **worker** processes it (AI classification, maintenance workflow, etc.).
   - The topbar “AI handling N tickets” may update; after a short while you can refresh and see new activity.

## 6. Optional checks

- **Escalations:** http://localhost:3001/escalations  
- **Compliance:** http://localhost:3001/compliance  
- **AI Activity:** http://localhost:3001/ai-activity  
- **Work orders:** http://localhost:3001/work-orders  

## If something fails

- **Backend won’t start:** Check `.env` (all required vars set, no typos). Twilio placeholders are fine for local test.
- **“Network error” on login:** Backend not running or not on port 3000; run step 1 again.
- **Demo button does nothing / “Loading demo…” forever:** Backend not running or `NEXT_PUBLIC_API_URL` in `propos-frontend/.env.local` is wrong (must be `http://localhost:3000/api/v1`).
- **Demo button runs but no new work order:** Worker not running; run step 2 and try again.

Once this flow works, you’re ready to deploy backend to Railway and frontend to Vercel.
