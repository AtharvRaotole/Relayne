import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'
import { inboundMessageQueue } from '../jobs/queues'
import { resolveOrganizationFromEmail } from '../modules/organizations/email-routing'
import { logger } from '../lib/logger'

function extractEmail(from: string): string {
  const match = from.match(/<(.+?)>/) ?? from.match(/(\S+@\S+)/)
  return match ? match[1].trim() : from.trim()
}

function normalizeSubject(subject: string): string {
  return subject.replace(/^(Re:|Fwd?:)\s*/i, '').trim()
}

export async function sendgridWebhookRoute(app: FastifyInstance) {
  app.post('/inbound', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, string | undefined>

    const from = body.from ?? ''
    const to = body.to ?? ''
    const subject = body.subject ?? ''
    const text = body.text ?? ''
    const html = body.html ?? ''
    const attachmentsRaw = body.attachments
    const attachments = attachmentsRaw
      ? (typeof attachmentsRaw === 'string' ? JSON.parse(attachmentsRaw) : attachmentsRaw)
      : []

    logger.info({ from, to, subject }, 'Inbound email received')

    const org = await resolveOrganizationFromEmail(to)
    if (!org) {
      logger.warn({ to }, 'Could not resolve organization from inbound email')
      return reply.status(200).send({ success: true })
    }

    const senderEmail = extractEmail(from)
    let tenant = await prisma.tenant.findFirst({
      where: { organizationId: org.id, email: senderEmail },
    })

    const normalizedSubject = normalizeSubject(subject)
    let thread = await prisma.thread.findFirst({
      where: {
        organizationId: org.id,
        tenantId: tenant?.id ?? undefined,
        status: 'OPEN',
        subject: normalizedSubject,
      },
    })

    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          organizationId: org.id,
          tenantId: tenant?.id,
          subject: normalizedSubject,
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
        channel: 'EMAIL',
        fromAddress: senderEmail,
        toAddress: to,
        subject,
        body: text,
        htmlBody: html || undefined,
        attachments: Array.isArray(attachments)
          ? attachments.map((a: { filename?: string; type?: string }) => ({
              name: a.filename ?? 'attachment',
              url: null,
              mimeType: a.type ?? 'application/octet-stream',
            }))
          : [],
        externalId: body['message-id'] ?? undefined,
      },
    })

    await prisma.thread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() },
    })

    await inboundMessageQueue.add(
      'process',
      {
        messageId: message.id,
        organizationId: org.id,
        tenantId: tenant?.id ?? undefined,
      },
      { priority: tenant ? 1 : 2 }
    )

    return reply.status(200).send({ success: true })
  })
}
