import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { prisma } from './lib/prisma'
import { redis } from './lib/redis'
import { env } from './config/env'
import { authRoutes } from './modules/auth/auth.routes'
import { organizationRoutes } from './modules/organizations/organizations.routes'
import { propertyRoutes } from './modules/properties/properties.routes'
import { tenantRoutes } from './modules/tenants/tenants.routes'
import { vendorRoutes } from './modules/vendors/vendors.routes'
import { workOrderRoutes } from './modules/work-orders/work-orders.routes'
import { complianceRoutes } from './modules/compliance/compliance.routes'
import { communicationRoutes } from './modules/communications/communications.routes'
import { invoiceRoutes } from './modules/invoices/invoices.routes'
import { webhookRoutes } from './webhooks/webhook.routes'

export async function buildApp() {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
  }).withTypeProvider<TypeBoxTypeProvider>()

  // Security
  await app.register(helmet)
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
  })
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })
  await app.register(jwt, { secret: env.JWT_SECRET })
  await app.register(multipart, { limits: { fileSize: 10_000_000 } }) // 10MB

  // Health check — no prefix
  app.get('/health', async () => {
    const [dbOk, redisOk] = await Promise.all([
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      redis.ping().then(() => true).catch(() => false),
    ])

    return {
      status: dbOk && redisOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: { database: dbOk, redis: redisOk },
    }
  })

  // API routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(organizationRoutes, { prefix: '/api/v1/organizations' })
  await app.register(propertyRoutes, { prefix: '/api/v1/properties' })
  await app.register(tenantRoutes, { prefix: '/api/v1/tenants' })
  await app.register(vendorRoutes, { prefix: '/api/v1/vendors' })
  await app.register(workOrderRoutes, { prefix: '/api/v1/work-orders' })
  await app.register(complianceRoutes, { prefix: '/api/v1/compliance' })
  await app.register(communicationRoutes, { prefix: '/api/v1/communications' })
  await app.register(invoiceRoutes, { prefix: '/api/v1/invoices' })
  await app.register(webhookRoutes, { prefix: '/api/v1/webhooks' })

  return app
}

async function main() {
  const app = await buildApp()

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    app.log.info({ port: env.PORT }, 'Server listening')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()
