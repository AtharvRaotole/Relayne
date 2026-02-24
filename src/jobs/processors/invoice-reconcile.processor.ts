import { Job } from 'bullmq'
import { logger } from '../../lib/logger'

/**
 * Invoice reconciliation processor — AI anomaly detection.
 * Phase 4: Stub. Phase 6: Full AI reconciliation.
 */
export async function processInvoiceReconciliation(job: Job) {
  const data = job.data as { invoiceId?: string; organizationId?: string }

  logger.info({ jobId: job.id, data }, 'Invoice reconcile job received')

  // TODO Phase 6: AI anomaly detection, benchmark comparison
}
