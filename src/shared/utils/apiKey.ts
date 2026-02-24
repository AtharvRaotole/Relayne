import { createHash, randomBytes } from 'crypto'

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

/** Generate a new API key with propos_live_ prefix */
export function generateApiKey(): string {
  const suffix = randomBytes(24).toString('hex')
  return `propos_live_${suffix}`
}
