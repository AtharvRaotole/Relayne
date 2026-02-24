import { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { requireAuth } from '../../shared/middleware/auth'
import { prisma } from '../../lib/prisma'
import { encryptCredentials } from '../../shared/utils/encryption'
import { getPmsClient } from '../../integrations/pms/factory'
import { pmsSyncQueue } from '../../jobs/queues'

export const integrationRoutes: FastifyPluginAsync = async (app) => {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()

  server.addHook('preHandler', requireAuth)

  // GET /integrations
  server.get(
    '/',
    {
      schema: {
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({
              pms: Type.Array(
                Type.Object({
                  id: Type.String(),
                  pmsType: Type.String(),
                  isActive: Type.Boolean(),
                  lastSyncAt: Type.Union([Type.String(), Type.Null()]),
                  syncStatus: Type.Union([Type.String(), Type.Null()]),
                })
              ),
              email: Type.Object({
                configured: Type.Boolean(),
              }),
              sms: Type.Object({
                configured: Type.Boolean(),
              }),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!

      const [pmsConnections, org] = await Promise.all([
        prisma.pmsConnection.findMany({
          where: { organizationId: orgId },
          select: {
            id: true,
            pmsType: true,
            isActive: true,
            lastSyncAt: true,
            syncStatus: true,
          },
        }),
        prisma.organization.findUnique({
          where: { id: orgId },
          select: { settings: true },
        }),
      ])

      const settings = (org?.settings as Record<string, unknown>) ?? {}
      const emailConfigured = !!process.env.SENDGRID_API_KEY
      const smsConfigured = !!(settings.twilioNumber as string | undefined)

      return reply.send({
        success: true as const,
        data: {
          pms: pmsConnections.map((p) => ({
            ...p,
            lastSyncAt: p.lastSyncAt?.toISOString() ?? null,
          })),
          email: { configured: emailConfigured },
          sms: { configured: smsConfigured },
        },
      })
    }
  )

  // POST /integrations/pms/connect
  server.post(
    '/pms/connect',
    {
      schema: {
        body: Type.Object({
          pmsType: Type.Union([
            Type.Literal('APPFOLIO'),
            Type.Literal('YARDI'),
            Type.Literal('BUILDIUM'),
          ]),
          credentials: Type.Record(Type.String(), Type.Any()),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Any() }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { pmsType, credentials } = request.body as {
        pmsType: 'APPFOLIO' | 'YARDI' | 'BUILDIUM'
        credentials: Record<string, string>
      }

      const encrypted = encryptCredentials(credentials)

      const conn = await prisma.pmsConnection.upsert({
        where: {
          organizationId_pmsType: { organizationId: orgId, pmsType },
        },
        update: { credentials: encrypted, isActive: true },
        create: {
          organizationId: orgId,
          pmsType,
          credentials: encrypted,
          isActive: true,
        },
      })

      return reply.send({
        success: true as const,
        data: {
          id: conn.id,
          pmsType: conn.pmsType,
          isActive: conn.isActive,
        },
      })
    }
  )

  // POST /integrations/pms/test
  server.post(
    '/pms/test',
    {
      schema: {
        body: Type.Optional(Type.Object({})),
        response: { 200: Type.Object({ success: Type.Literal(true), data: Type.Object({ ok: Type.Boolean(), message: Type.String() }) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!

      const client = await getPmsClient(orgId)
      if (!client) {
        return reply.send({
          success: true as const,
          data: { ok: false, message: 'No PMS connection configured' },
        })
      }

      try {
        if ('getProperties' in client) {
          await (client as { getProperties: () => Promise<unknown[]> }).getProperties()
        }
        return reply.send({
          success: true as const,
          data: { ok: true, message: 'Connection successful' },
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Connection failed'
        return reply.send({
          success: true as const,
          data: { ok: false, message: msg },
        })
      }
    }
  )

  // POST /integrations/pms/sync
  server.post(
    '/pms/sync',
    {
      schema: {
        response: { 202: Type.Object({ success: Type.Literal(true), data: Type.Object({ message: Type.String() }) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!

      await pmsSyncQueue.add('manual-sync', { organizationId: orgId })

      return reply.status(202).send({
        success: true as const,
        data: { message: 'Sync job enqueued' },
      })
    }
  )

  // DELETE /integrations/pms/:type
  server.delete(
    '/pms/:type',
    {
      schema: {
        params: Type.Object({
          type: Type.Union([
            Type.Literal('APPFOLIO'),
            Type.Literal('YARDI'),
            Type.Literal('BUILDIUM'),
          ]),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { type } = request.params as { type: 'APPFOLIO' | 'YARDI' | 'BUILDIUM' }

      await prisma.pmsConnection.updateMany({
        where: { organizationId: orgId, pmsType: type },
        data: { isActive: false },
      })

      return reply.send({ success: true as const })
    }
  )

  // POST /integrations/email/connect — update org settings for SendGrid domain
  server.post(
    '/email/connect',
    {
      schema: {
        body: Type.Object({
          fromDomain: Type.Optional(Type.String()),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const body = request.body as { fromDomain?: string }

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
      })
      const settings = (org?.settings as Record<string, unknown>) ?? {}
      if (body.fromDomain) settings.fromDomain = body.fromDomain

      await prisma.organization.update({
        where: { id: orgId },
        data: { settings: settings as object },
      })

      return reply.send({ success: true as const })
    }
  )

  // POST /integrations/sms/connect — update org settings for Twilio number
  server.post(
    '/sms/connect',
    {
      schema: {
        body: Type.Object({
          twilioNumber: Type.String(),
        }),
        response: { 200: Type.Object({ success: Type.Literal(true) }) },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { twilioNumber } = request.body as { twilioNumber: string }

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
      })
      const settings = (org?.settings as Record<string, unknown>) ?? {}
      settings.twilioNumber = twilioNumber

      await prisma.organization.update({
        where: { id: orgId },
        data: { settings: settings as object },
      })

      return reply.send({ success: true as const })
    }
  )
}
