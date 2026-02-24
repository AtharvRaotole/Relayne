import { Job } from 'bullmq'
import { prisma } from '../../lib/prisma'
import { addDays } from 'date-fns'
import { logger } from '../../lib/logger'

/**
 * Renewal nudge processor — finds leases expiring soon, triggers renewal workflow.
 * Phase 4: Status updates. Phase 5: AgentRunner for lease renewal workflow.
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

  for (const lease of expiringLeases) {
    // TODO Phase 5: Run AgentRunner for lease_renewal workflow
    await prisma.lease.update({
      where: { id: lease.id },
      data: { renewalSentAt: new Date(), status: 'RENEWAL_PENDING' },
    })
  }

  logger.info(
    { count: expiringLeases.length },
    'Renewal nudge scan completed'
  )
}
