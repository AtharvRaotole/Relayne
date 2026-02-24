import { Queue } from 'bullmq'
import { redis } from '../lib/redis'

const defaultOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
}

export const inboundMessageQueue = new Queue('inbound-message', defaultOptions)
export const vendorDispatchQueue = new Queue('vendor-dispatch', defaultOptions)
export const complianceCheckQueue = new Queue('compliance-check', defaultOptions)
export const invoiceReconcileQueue = new Queue('invoice-reconcile', defaultOptions)
export const renewalNudgeQueue = new Queue('renewal-nudge', defaultOptions)
export const pmsSyncQueue = new Queue('pms-sync', defaultOptions)
export const notificationQueue = new Queue('notification', defaultOptions)
export const capitalPlanQueue = new Queue('capital-plan', defaultOptions)
