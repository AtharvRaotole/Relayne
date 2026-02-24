import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import twilio from 'twilio'
import { prisma } from '../lib/prisma'
import { inboundMessageQueue } from '../jobs/queues'
import { env } from '../config/env'

async function resolveOrganizationFromPhone(toPhone: string) {
  return prisma.organization.findFirst({
    where: {
      settings: {
        path: ['twilioNumber'],
        equals: toPhone,
      },
    },
  })
}

export async function twilioWebhookRoute(app: FastifyInstance) {
  app.post('/sms', async (request: FastifyRequest, reply: FastifyReply) => {
    const twilioSignature = request.headers['x-twilio-signature'] as string | undefined
    const url = `${env.BASE_URL}/api/v1/webhooks/twilio/sms`
    const body = request.body as Record<string, string>

    const isValid = twilioSignature
      ? twilio.validateRequest(env.TWILIO_AUTH_TOKEN, twilioSignature, url, body)
      : false

    if (!isValid) {
      return reply.status(403).send('Forbidden')
    }

    const fromPhone = body.From ?? ''
    const toPhone = body.To ?? ''
    const messageBody = body.Body ?? ''
    const messageSid = body.MessageSid ?? ''

    const org = await resolveOrganizationFromPhone(toPhone)
    if (!org) {
      reply.header('Content-Type', 'text/xml')
      return reply.send('<Response></Response>')
    }

    let tenant = await prisma.tenant.findFirst({
      where: { organizationId: org.id, phone: fromPhone },
    })

    let thread = await prisma.thread.findFirst({
      where: {
        organizationId: org.id,
        tenantId: tenant?.id ?? undefined,
        status: { in: ['OPEN', 'WAITING_RESPONSE'] },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          organizationId: org.id,
          tenantId: tenant?.id,
          status: 'OPEN',
          lastMessageAt: new Date(),
        },
      })
    }

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        tenantId: tenant?.id,
        direction: 'INBOUND',
        channel: 'SMS',
        fromAddress: fromPhone,
        toAddress: toPhone,
        body: messageBody,
        externalId: messageSid,
      },
    })

    await inboundMessageQueue.add('process', {
      messageId: message.id,
      organizationId: org.id,
      tenantId: tenant?.id ?? undefined,
    })

    reply.header('Content-Type', 'text/xml')
    return reply.send('<Response></Response>')
  })
}
