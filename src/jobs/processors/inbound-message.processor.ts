import { Job } from 'bullmq'
import { prisma } from '../../lib/prisma'
import { logger } from '../../lib/logger'

/**
 * Process inbound message — enqueued by SendGrid/Twilio webhooks.
 * Phase 4: Store message, mark for AI processing.
 * Phase 5: AgentRunner will classify intent and trigger workflows.
 */
export async function processInboundMessage(job: Job) {
  const { messageId, organizationId, tenantId } = job.data as {
    messageId: string
    organizationId: string
    tenantId?: string
  }

  const message = await prisma.message.findFirst({
    where: { id: messageId },
    include: { thread: true },
  })

  if (!message) {
    logger.warn({ messageId }, 'Message not found for processing')
    return
  }

  logger.info(
    {
      messageId,
      organizationId,
      tenantId,
      channel: message.channel,
    },
    'Processing inbound message'
  )

  // TODO Phase 5: Run AgentRunner to classify intent and trigger workflow
  // const runner = new AgentRunner(organizationId)
  // await runner.run({ triggerType: 'inbound_email'|'inbound_sms', triggerId: messageId, ... })

  await prisma.message.update({
    where: { id: messageId },
    data: { aiProcessed: false },
  })
}
