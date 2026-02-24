import { Job } from 'bullmq'
import { prisma } from '../../lib/prisma'
import { classifyMessage } from '../../agent/core/MessageClassifier'
import { runMaintenanceWorkflow } from '../../agent/workflows/MaintenanceWorkflow'
import { runLeaseRenewalWorkflow } from '../../agent/workflows/LeaseRenewalWorkflow'
import { AgentRunner } from '../../agent/core/AgentRunner'
import { logger } from '../../lib/logger'

/**
 * Process inbound message — enqueued by SendGrid/Twilio webhooks.
 * Classifies intent, routes to workflow, runs AgentRunner.
 */
export async function processInboundMessage(job: Job) {
  const { messageId, organizationId, tenantId } = job.data as {
    messageId: string
    organizationId: string
    tenantId?: string
  }

  const message = await prisma.message.findFirst({
    where: { id: messageId },
    include: { thread: true, tenant: true },
  })

  if (!message) {
    logger.warn({ messageId }, 'Message not found for processing')
    return
  }

  if (message.thread.organizationId !== organizationId) {
    logger.warn({ messageId, organizationId }, 'Message org mismatch')
    return
  }

  logger.info(
    { messageId, organizationId, tenantId, channel: message.channel },
    'Processing inbound message'
  )

  const classification = await classifyMessage(message.body)

  logger.info({ messageId, intent: classification.intent }, 'Classified inbound message')

  await prisma.message.update({
    where: { id: messageId },
    data: {
      aiProcessed: true,
      aiIntent: classification.intent,
      aiSentiment: classification.sentiment,
      aiSummary: classification.summary,
    },
  })

  switch (classification.intent) {
    case 'maintenance_request':
    case 'maintenance_followup':
      await runMaintenanceWorkflow({
        organizationId,
        messageId,
        tenantId: message.tenantId ?? undefined,
        unitId: message.tenant
          ? (await prisma.lease.findFirst({
              where: { tenantId: message.tenant.id, status: 'ACTIVE' },
              select: { unitId: true },
            }))?.unitId
          : undefined,
      })
      break

    case 'lease_renewal_interest':
    case 'lease_question':
      await runLeaseRenewalWorkflow({
        organizationId,
        messageId,
        tenantId: message.tenantId ?? undefined,
      })
      break

    case 'payment_inquiry':
    case 'general_inquiry': {
      const runner = new AgentRunner(organizationId)
      await runner.run({
        organizationId,
        triggerType: 'inbound_email',
        triggerId: messageId,
        workflowHint: classification.intent,
        context: { inboundMessage: message, tenant: message.tenant },
      })
      break
    }

    case 'complaint': {
      const complaintRunner = new AgentRunner(organizationId)
      await complaintRunner.run({
        organizationId,
        triggerType: 'inbound_email',
        triggerId: messageId,
        workflowHint: 'complaint_handling',
        context: {
          inboundMessage: message,
          tenant: message.tenant,
          messageAnalysis: {
            sentiment: classification.sentiment,
            hostileScore: classification.hostileScore,
          },
        },
      })
      break
    }

    default:
      logger.info({ intent: classification.intent }, 'Unhandled intent — no workflow triggered')
  }
}
