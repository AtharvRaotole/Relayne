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
  S3_ENDPOINT: z.string().url().optional(), // For MinIO

  // App config
  VENDOR_PORTAL_URL: z.string().url(),
  DEFAULT_PO_APPROVAL_THRESHOLD: z.coerce.number().default(500),
  DEFAULT_EMERGENCY_SLA_HOURS: z.coerce.number().default(2),
})

export type Env = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
