import { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { requireAuth } from '../../shared/middleware/auth'
import { prisma } from '../../lib/prisma'
import { inboundMessageQueue } from '../../jobs/queues'

export const demoRoutes: FastifyPluginAsync = async (app) => {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()

  server.addHook('preHandler', requireAuth)

  server.get(
    '/context',
    {
      schema: {
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({
              demoTenantId: Type.String(),
              demoPropertyId: Type.String(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const [tenant, property] = await Promise.all([
        prisma.tenant.findFirst({ where: { organizationId: orgId }, select: { id: true } }),
        prisma.property.findFirst({ where: { organizationId: orgId }, select: { id: true } }),
      ])
      if (!tenant || !property) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Demo org has no tenant or property. Run seed.' },
        } as never)
      }
      return reply.send({
        success: true as const,
        data: { demoTenantId: tenant.id, demoPropertyId: property.id },
      })
    }
  )

  server.post(
    '/inbound-message',
    {
      schema: {
        body: Type.Object({
          tenantId: Type.String(),
          propertyId: Type.Optional(Type.String()),
          message: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            messageId: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const orgId = request.organizationId!
      const { tenantId, propertyId, message } = request.body as {
        tenantId: string
        propertyId?: string
        message: string
      }

      let thread = await prisma.thread.findFirst({
        where: {
          organizationId: orgId,
          tenantId,
        },
      })

      if (!thread) {
        thread = await prisma.thread.create({
          data: {
            organizationId: orgId,
            tenantId,
            status: 'OPEN',
          },
        })
      }

      const msg = await prisma.message.create({
        data: {
          threadId: thread.id,
          tenantId,
          direction: 'INBOUND',
          channel: 'EMAIL',
          body: message,
        },
      })

      await inboundMessageQueue.add('process', {
        messageId: msg.id,
        organizationId: orgId,
        tenantId,
        propertyId,
      })

      return reply.send({ success: true as const, messageId: msg.id })
    }
  )
}

