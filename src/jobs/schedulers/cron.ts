import {
  complianceCheckQueue,
  renewalNudgeQueue,
  pmsSyncQueue,
  capitalPlanQueue,
  vendorDispatchQueue,
} from '../queues'
import { logger } from '../../lib/logger'

export async function setupCronJobs() {
  try {
    await complianceCheckQueue.add(
      'daily-compliance-scan',
      {},
      {
        repeat: { pattern: '0 8 * * *' },
        jobId: 'daily-compliance-scan',
      }
    )

    await renewalNudgeQueue.add(
      'renewal-scan',
      {},
      {
        repeat: { pattern: '0 9 * * *' },
        jobId: 'renewal-scan',
      }
    )

    await pmsSyncQueue.add(
      'pms-sync-all-orgs',
      {},
      {
        repeat: { pattern: '0 */2 * * *' },
        jobId: 'pms-sync-all-orgs',
      }
    )

    await capitalPlanQueue.add(
      'capital-plan-refresh',
      {},
      {
        repeat: { pattern: '0 6 * * 1' },
        jobId: 'capital-plan-refresh',
      }
    )

    await vendorDispatchQueue.add(
      'emergency-timeout-check',
      {},
      {
        repeat: { pattern: '*/30 * * * *' },
        jobId: 'emergency-timeout-check',
      }
    )

    logger.info('Cron jobs scheduled')
  } catch (err) {
    logger.error({ err }, 'Failed to setup cron jobs')
  }
}
