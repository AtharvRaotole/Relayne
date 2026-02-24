import { Worker } from 'bullmq'
import { redis } from '../lib/redis'
import { processInboundMessage } from './processors/inbound-message.processor'
import { processVendorDispatch } from './processors/vendor-dispatch.processor'
import { processComplianceCheck } from './processors/compliance-check.processor'
import { processInvoiceReconciliation } from './processors/invoice-reconcile.processor'
import { processRenewalNudges } from './processors/renewal-nudge.processor'
import { processPmsSync } from './processors/pms-sync.processor'
import { processCapitalPlan } from './processors/capital-plan.processor'
import { setupCronJobs } from './schedulers/cron'
import { logger } from '../lib/logger'

new Worker('inbound-message', processInboundMessage, {
  connection: redis,
  concurrency: 10,
})
new Worker('vendor-dispatch', processVendorDispatch, {
  connection: redis,
  concurrency: 5,
})
new Worker('compliance-check', processComplianceCheck, {
  connection: redis,
  concurrency: 3,
})
new Worker('invoice-reconcile', processInvoiceReconciliation, {
  connection: redis,
  concurrency: 5,
})
new Worker('renewal-nudge', processRenewalNudges, {
  connection: redis,
  concurrency: 3,
})
new Worker('pms-sync', processPmsSync, {
  connection: redis,
  concurrency: 2,
})
new Worker('capital-plan', processCapitalPlan, {
  connection: redis,
  concurrency: 1,
})

setupCronJobs().then(() => {
  logger.info('Cron jobs scheduled')
})

logger.info('Workers started')
