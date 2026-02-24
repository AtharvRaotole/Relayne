/**
 * Setup for integration tests. Loads .env before any src imports.
 * Ensures env validation passes (uses .env.example fallbacks if needed).
 */
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.example') })

const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  BASE_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://propos:password@localhost:5432/propos_dev',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
  ENCRYPTION_KEY: '32-character-key-for-credential-encryption!!',
  ANTHROPIC_API_KEY: 'sk-ant-test-placeholder-key-for-integration-tests',
  SENDGRID_API_KEY: 'SG.test-placeholder-for-integration-tests-valid-format',
  TWILIO_ACCOUNT_SID: 'ACtestplaceholder',
  TWILIO_AUTH_TOKEN: 'test-token',
  AWS_ACCESS_KEY_ID: 'test-key',
  AWS_SECRET_ACCESS_KEY: 'test-secret',
  AWS_S3_BUCKET: 'test-bucket',
  VENDOR_PORTAL_URL: 'https://vendors.example.com',
}

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] = value
}
