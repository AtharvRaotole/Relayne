import { Job } from 'bullmq'
import { logger } from '../../lib/logger'

/**
 * Vendor dispatch processor — assigns vendors to work orders.
 * Phase 4: Stub. Phase 5/6: AI vendor scoring and dispatch.
 */
export async function processVendorDispatch(job: Job) {
  const data = job.data as { workOrderId?: string; organizationId?: string }

  logger.info({ jobId: job.id, data }, 'Vendor dispatch job received')

  // TODO Phase 5: Implement vendor dispatch logic
}
