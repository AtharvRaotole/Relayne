import { z } from 'zod'

const envSchema = z.object({
  // App
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  BASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3001'),

  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // Redis (Upstash or compatible)
  UPSTASH_REDIS_URL: z.string().url(),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  ENCRYPTION_KEY: z.string().min(32),

  // AI
  OPENAI_API_KEY: z.string().startsWith('sk-'),

  // Email
  RESEND_API_KEY: z.string().startsWith('re_'),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_WEBHOOK_SECRET: z.string().optional(),

  // SMS
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC'),
  TWILIO_AUTH_TOKEN: z.string(),

  // Storage
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string(),

  // App config
  VENDOR_PORTAL_URL: z.string().url(),
  DEFAULT_PO_APPROVAL_THRESHOLD: z.coerce.number().default(500),
  DEFAULT_EMERGENCY_SLA_HOURS: z.coerce.number().default(2),

  // Demo mode
  DEMO_SECRET: z.string().optional(),
  DEMO_ORG_ID: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
