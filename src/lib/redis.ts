import { Redis } from 'ioredis'

/**
 * Redis client configured for Upstash (or compatible) using a single URL.
 * UPSTASH_REDIS_URL example:
 * rediss://default:[token]@[endpoint].upstash.io:6379
 */
export const redis = new Redis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableOfflineQueue: false,
  tls: { rejectUnauthorized: false },
})

redis.on('error', (err) => {
  console.error('Redis connection error:', err)
})
