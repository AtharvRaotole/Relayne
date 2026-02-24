import { Job } from 'bullmq'
import { logger } from '../../lib/logger'

/**
 * Capital plan processor — AI-derived CapEx forecasting.
 * Phase 4: Stub. Phase 6: Full implementation.
 */
export async function processCapitalPlan(job: Job) {
  logger.info({ jobId: job.id }, 'Capital plan refresh job received')
  // TODO Phase 6: AI capital plan engine
}
