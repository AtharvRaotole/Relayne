import { Job } from 'bullmq'
import { prisma } from '../../lib/prisma'
import { addDays } from 'date-fns'
import { logger } from '../../lib/logger'
import { AgentRunner } from '../../agent/core/AgentRunner'

/**
 * Renewal nudge processor — finds leases expiring soon, triggers AgentRunner
 * lease renewal workflow for each tenant.
 */
export async function processRenewalNudges(job: Job) {
  const expiringLeases = await prisma.lease.findMany({
    where: {
      status: 'ACTIVE',
      endDate: {
        gte: addDays(new Date(), 30),
        lte: addDays(new Date(), 90),
      },
      renewalSentAt: null,
    },
    include: {
      tenant: true,
      unit: { include: { property: true } },
    },
  })

  const orgIds = new Set<string>()

  for (const lease of expiringLeases) {
    if (!lease.tenant) continue
    const orgId = lease.tenant.organizationId
    orgIds.add(orgId)

    await prisma.lease.update({
      where: { id: lease.id },
      data: { renewalSentAt: new Date(), status: 'RENEWAL_PENDING' },
    })

    const message = await prisma.message.findFirst({
      where: { tenantId: lease.tenantId },
      orderBy: { createdAt: 'desc' },
    })

    const agentRunner = new AgentRunner(orgId)
    await agentRunner.run({
      organizationId: orgId,
      triggerType: 'scheduled',
      triggerId: lease.id,
      workflowHint: 'lease_renewal',
      context: {
        inboundMessage: message,
        tenant: lease.tenant,
        activeLease: lease,
        leaseEndDate: lease.endDate.toISOString(),
      },
    })
  }

  logger.info(
    { count: expiringLeases.length, orgCount: orgIds.size },
    'Renewal nudge scan completed'
  )
}
