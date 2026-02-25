# Integrations Specification
## PMS, Email, SMS, and Webhook Integrations

---

## Queue Architecture

### `src/jobs/queues.ts`

```typescript
import { Queue } from 'bullmq'
import { redis } from '../lib/redis'

const defaultOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  }
}

// Queue definitions
export const inboundMessageQueue = new Queue('inbound-message', defaultOptions)
export const vendorDispatchQueue = new Queue('vendor-dispatch', defaultOptions)
export const complianceCheckQueue = new Queue('compliance-check', defaultOptions)
export const invoiceReconcileQueue = new Queue('invoice-reconcile', defaultOptions)
export const renewalNudgeQueue = new Queue('renewal-nudge', defaultOptions)
export const pmsSyncQueue = new Queue('pms-sync', defaultOptions)
export const notificationQueue = new Queue('notification', defaultOptions)
export const capitalPlanQueue = new Queue('capital-plan', defaultOptions)

// Worker setup — `src/jobs/worker.ts`
// Import all processors and wire to queues via Worker class from bullmq
```

---

## Email Integration (SendGrid)

### Inbound Email Webhook — `src/webhooks/sendgrid.webhook.ts`

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'
import { inboundMessageQueue } from '../jobs/queues'
import { resolveOrganizationFromEmail } from '../modules/organizations/email-routing'
import { logger } from '../lib/logger'

// SendGrid Inbound Parse sends multipart/form-data
export async function sendgridWebhookRoute(app: FastifyInstance) {
  app.post('/sendgrid/inbound', {
    config: { rawBody: true }  // Need raw body for signature verification
  }, async (request: FastifyRequest, reply: FastifyReply) => {

    // Verify SendGrid signature
    // const isValid = verifySendGridSignature(request.headers, request.rawBody)
    // if (!isValid) return reply.status(401).send()

    const body = request.body as any

    const from = body.from || ''
    const to = body.to || ''
    const subject = body.subject || ''
    const text = body.text || ''
    const html = body.html || ''
    const attachments = body.attachments ? JSON.parse(body.attachments) : []

    logger.info({ from, to, subject }, 'Inbound email received')

    // Resolve which organization this belongs to (based on recipient address)
    // Each org gets a unique inbound address: <org-slug>@mail.propos.ai
    const org = await resolveOrganizationFromEmail(to)
    if (!org) {
      logger.warn({ to }, 'Could not resolve organization from inbound email')
      return reply.status(200).send() // Always 200 to SendGrid
    }

    // Find or create tenant by sender email
    let tenant = await prisma.tenant.findFirst({
      where: { organizationId: org.id, email: extractEmail(from) }
    })

    // Find or create thread
    let thread = await prisma.thread.findFirst({
      where: {
        tenantId: tenant?.id,
        status: 'OPEN',
        // Match by subject line (strip Re:, Fwd:)
        subject: normalizeSubject(subject),
      }
    })

    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          organizationId: org.id,
          tenantId: tenant?.id,
          subject: normalizeSubject(subject),
          status: 'OPEN',
          lastMessageAt: new Date(),
        }
      })
    }

    // Store the message
    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        tenantId: tenant?.id,
        direction: 'INBOUND',
        channel: 'EMAIL',
        fromAddress: extractEmail(from),
        toAddress: to,
        subject,
        body: text,
        htmlBody: html,
        attachments: attachments.map((a: any) => ({
          name: a.filename,
          url: null, // Will be uploaded to S3 by processor
          mimeType: a.type,
        })),
        externalId: body['message-id'],
      }
    })

    // Update thread
    await prisma.thread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() }
    })

    // Enqueue for AI processing
    await inboundMessageQueue.add('process', {
      messageId: message.id,
      organizationId: org.id,
      tenantId: tenant?.id,
    }, {
      priority: tenant ? 1 : 2, // Known tenants get higher priority
    })

    return reply.status(200).send({ success: true })
  })
}

function extractEmail(from: string): string {
  const match = from.match(/<(.+?)>/) || from.match(/(\S+@\S+)/)
  return match ? match[1] : from
}

function normalizeSubject(subject: string): string {
  return subject.replace(/^(Re:|Fwd?:)\s*/i, '').trim()
}
```

### Email Sender — `src/integrations/email/sendgrid/sender.ts`

```typescript
import sgMail from '@sendgrid/mail'
import { prisma } from '../../../lib/prisma'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export interface SendEmailParams {
  to: string
  toName?: string
  subject: string
  text: string
  html?: string
  replyTo?: string
  organizationId: string
  messageId?: string  // For tracking
}

export async function sendEmail(params: SendEmailParams): Promise<{ messageId: string }> {
  const org = await prisma.organization.findUnique({ where: { id: params.organizationId } })
  
  const fromAddress = `${org?.slug}@mail.propos.ai`
  const fromName = org?.name || 'Your Property Manager'

  const msg = {
    to: { email: params.to, name: params.toName },
    from: { email: fromAddress, name: fromName },
    replyTo: params.replyTo || fromAddress,
    subject: params.subject,
    text: params.text,
    html: params.html || textToHtml(params.text),
    customArgs: {
      organizationId: params.organizationId,
      messageId: params.messageId || '',
    },
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true },
    }
  }

  const [response] = await sgMail.send(msg)
  return { messageId: response.headers['x-message-id'] }
}

function textToHtml(text: string): string {
  return `<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    ${text.split('\n').map(line => `<p>${line}</p>`).join('')}
  </body></html>`
}
```

---

## SMS Integration (Twilio)

### Inbound SMS Webhook — `src/webhooks/twilio.webhook.ts`

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import twilio from 'twilio'
import { prisma } from '../lib/prisma'
import { inboundMessageQueue } from '../jobs/queues'

export async function twilioWebhookRoute(app: FastifyInstance) {
  app.post('/twilio/sms', async (request: FastifyRequest, reply: FastifyReply) => {
    // Verify Twilio signature
    const twilioSignature = request.headers['x-twilio-signature'] as string
    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN!,
      twilioSignature,
      `${process.env.BASE_URL}/api/v1/webhooks/twilio/sms`,
      request.body as Record<string, string>
    )

    if (!isValid) {
      return reply.status(403).send()
    }

    const body = request.body as any
    const fromPhone = body.From  // e.g. +12125551234
    const toPhone = body.To      // Our Twilio number
    const messageBody = body.Body
    const messageSid = body.MessageSid

    // Resolve org from Twilio number
    const org = await resolveOrganizationFromPhone(toPhone)
    if (!org) return reply.status(200).send('<Response></Response>')

    // Find tenant by phone
    let tenant = await prisma.tenant.findFirst({
      where: { organizationId: org.id, phone: fromPhone }
    })

    // Find or create thread for this SMS conversation
    let thread = await prisma.thread.findFirst({
      where: {
        organizationId: org.id,
        tenantId: tenant?.id,
        status: { in: ['OPEN', 'WAITING_RESPONSE'] },
      },
      orderBy: { lastMessageAt: 'desc' }
    })

    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          organizationId: org.id,
          tenantId: tenant?.id,
          status: 'OPEN',
          lastMessageAt: new Date(),
        }
      })
    }

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        tenantId: tenant?.id,
        direction: 'INBOUND',
        channel: 'SMS',
        fromAddress: fromPhone,
        toAddress: toPhone,
        body: messageBody,
        externalId: messageSid,
      }
    })

    await inboundMessageQueue.add('process', {
      messageId: message.id,
      organizationId: org.id,
      tenantId: tenant?.id,
    })

    // Twilio requires TwiML response
    reply.header('Content-Type', 'text/xml')
    return reply.send('<Response></Response>')
  })
}

async function resolveOrganizationFromPhone(toPhone: string) {
  // Look up which org owns this Twilio number
  // Stored in organization settings or a phone_numbers table
  return prisma.organization.findFirst({
    where: {
      settings: {
        path: ['twilioNumber'],
        equals: toPhone,
      }
    }
  })
}
```

### SMS Sender — `src/integrations/sms/twilio/sender.ts`

```typescript
import twilio from 'twilio'
import { prisma } from '../../../lib/prisma'

const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)

export async function sendSms(params: {
  to: string
  body: string
  organizationId: string
}): Promise<{ messageSid: string }> {
  const org = await prisma.organization.findUnique({ where: { id: params.organizationId } })
  const fromNumber = (org?.settings as any)?.twilioNumber

  if (!fromNumber) throw new Error('Organization has no Twilio number configured')

  // SMS should be concise — warn if over limit
  if (params.body.length > 160) {
    console.warn(`SMS body length ${params.body.length} exceeds 160 chars — will be split`)
  }

  const message = await client.messages.create({
    to: params.to,
    from: fromNumber,
    body: params.body,
  })

  return { messageSid: message.sid }
}
```

---

## PMS Integrations

### AppFolio Integration — `src/integrations/pms/appfolio/client.ts`

```typescript
import axios, { AxiosInstance } from 'axios'

export interface AppFolioConfig {
  clientId: string
  clientSecret: string
  domain: string  // e.g. yourcompany.appfolio.com
}

export class AppFolioClient {
  private http: AxiosInstance
  private config: AppFolioConfig

  constructor(config: AppFolioConfig) {
    this.config = config
    this.http = axios.create({
      baseURL: `https://${config.domain}/api/v1`,
      auth: { username: config.clientId, password: config.clientSecret },
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── PROPERTIES ─────────────────────────────────────────────
  async getProperties(): Promise<AppFolioProperty[]> {
    const res = await this.http.get('/properties')
    return res.data.results
  }

  async getUnits(propertyId: string): Promise<AppFolioUnit[]> {
    const res = await this.http.get(`/properties/${propertyId}/units`)
    return res.data.results
  }

  // ── TENANTS ────────────────────────────────────────────────
  async getTenants(params?: { page?: number, per_page?: number }): Promise<AppFolioTenant[]> {
    const res = await this.http.get('/tenants', { params })
    return res.data.results
  }

  async getTenantByEmail(email: string): Promise<AppFolioTenant | null> {
    const res = await this.http.get('/tenants', { params: { email } })
    return res.data.results[0] || null
  }

  // ── MAINTENANCE ────────────────────────────────────────────
  async getMaintenanceRequests(params?: any): Promise<AppFolioMaintenanceRequest[]> {
    const res = await this.http.get('/maintenance_requests', { params })
    return res.data.results
  }

  async createMaintenanceRequest(data: {
    unit_id: string
    subject: string
    description: string
    priority: 'urgent' | 'normal' | 'low'
  }): Promise<AppFolioMaintenanceRequest> {
    const res = await this.http.post('/maintenance_requests', data)
    return res.data
  }

  async updateMaintenanceRequest(id: string, data: {
    status?: string
    assigned_to?: string
    note?: string
  }): Promise<AppFolioMaintenanceRequest> {
    const res = await this.http.patch(`/maintenance_requests/${id}`, data)
    return res.data
  }

  // ── LEASES ─────────────────────────────────────────────────
  async getLeases(params?: { status?: string }): Promise<AppFolioLease[]> {
    const res = await this.http.get('/leases', { params })
    return res.data.results
  }

  // ── SYNC ───────────────────────────────────────────────────
  async syncAll(organizationId: string) {
    // Called by PMS sync job
    const [properties, tenants, leases, maintenanceRequests] = await Promise.all([
      this.getProperties(),
      this.getTenants(),
      this.getLeases(),
      this.getMaintenanceRequests({ status: 'open' })
    ])

    return { properties, tenants, leases, maintenanceRequests }
  }
}

// Type definitions
interface AppFolioProperty { id: string; name: string; address: any; unit_count: number }
interface AppFolioUnit { id: string; unit_number: string; property_id: string; occupied: boolean }
interface AppFolioTenant { id: string; first_name: string; last_name: string; email: string; phone: string; unit_id: string }
interface AppFolioMaintenanceRequest { id: string; unit_id: string; subject: string; status: string; priority: string }
interface AppFolioLease { id: string; unit_id: string; tenant_id: string; start_date: string; end_date: string; rent: number }
```

### PMS Client Factory — `src/integrations/pms/factory.ts`

```typescript
import { PmsType } from '@prisma/client'
import { AppFolioClient } from './appfolio/client'
import { YardiClient } from './yardi/client'
import { BuildiumClient } from './buildium/client'
import { prisma } from '../../lib/prisma'
import { decryptCredentials } from '../../shared/utils/encryption'

export async function getPmsClient(organizationId: string) {
  const connection = await prisma.pmsConnection.findFirst({
    where: { organizationId, isActive: true }
  })

  if (!connection) return null

  const credentials = decryptCredentials(connection.credentials)

  switch (connection.pmsType) {
    case PmsType.APPFOLIO:
      return new AppFolioClient(credentials as any)
    case PmsType.YARDI:
      return new YardiClient(credentials as any)
    case PmsType.BUILDIUM:
      return new BuildiumClient(credentials as any)
    default:
      throw new Error(`Unsupported PMS type: ${connection.pmsType}`)
  }
}
```

---

## PMS Sync Job — `src/jobs/processors/pms-sync.processor.ts`

```typescript
import { Job } from 'bullmq'
import { prisma } from '../../lib/prisma'
import { getPmsClient } from '../../integrations/pms/factory'
import { logger } from '../../lib/logger'

export async function processPmsSync(job: Job) {
  const { organizationId, syncType } = job.data  // syncType: 'full' | 'incremental'

  const pmsClient = await getPmsClient(organizationId)
  if (!pmsClient) {
    logger.warn({ organizationId }, 'No PMS connection found for sync')
    return
  }

  const data = await pmsClient.syncAll(organizationId)
  
  // Upsert properties
  for (const property of data.properties) {
    await prisma.property.upsert({
      where: { organizationId_pmsPropertyId: { organizationId, pmsPropertyId: property.id } },
      create: {
        organizationId,
        pmsPropertyId: property.id,
        name: property.name,
        address: property.address,
        unitCount: property.unit_count || 0,
      },
      update: {
        name: property.name,
        address: property.address,
        unitCount: property.unit_count || 0,
      }
    })
  }

  // Upsert tenants
  for (const tenant of data.tenants) {
    await prisma.tenant.upsert({
      where: { organizationId_pmsTenantId: { organizationId, pmsTenantId: tenant.id } },
      create: {
        organizationId,
        pmsTenantId: tenant.id,
        firstName: tenant.first_name,
        lastName: tenant.last_name,
        email: tenant.email,
        phone: tenant.phone,
      },
      update: {
        firstName: tenant.first_name,
        lastName: tenant.last_name,
        email: tenant.email,
        phone: tenant.phone,
      }
    })
  }

  // Update last sync timestamp
  await prisma.pmsConnection.updateMany({
    where: { organizationId },
    data: { lastSyncAt: new Date(), syncStatus: 'success' }
  })

  logger.info({
    organizationId,
    propertiesCount: data.properties.length,
    tenantsCount: data.tenants.length,
  }, 'PMS sync completed')
}
```

---

## Scheduled Jobs — `src/jobs/schedulers/cron.ts`

```typescript
import { Queue } from 'bullmq'
import { prisma } from '../../lib/prisma'
import {
  complianceCheckQueue,
  renewalNudgeQueue,
  pmsSyncQueue,
  capitalPlanQueue,
  vendorDispatchQueue
} from '../queues'

export async function setupCronJobs() {
  
  // Daily compliance check — 8am every day
  await complianceCheckQueue.add(
    'daily-compliance-scan',
    {},
    {
      repeat: { pattern: '0 8 * * *' },
      jobId: 'daily-compliance-scan',
    }
  )

  // Lease renewal nudges — 9am every day
  await renewalNudgeQueue.add(
    'renewal-scan',
    {},
    {
      repeat: { pattern: '0 9 * * *' },
      jobId: 'renewal-scan',
    }
  )

  // PMS sync — every 2 hours
  await pmsSyncQueue.add(
    'pms-sync-all-orgs',
    {},
    {
      repeat: { pattern: '0 */2 * * *' },
      jobId: 'pms-sync-all-orgs',
    }
  )

  // Capital plan refresh — weekly on Monday
  await capitalPlanQueue.add(
    'capital-plan-refresh',
    {},
    {
      repeat: { pattern: '0 6 * * 1' },
      jobId: 'capital-plan-refresh',
    }
  )

  // Emergency WO timeout check — every 30 minutes
  await vendorDispatchQueue.add(
    'emergency-timeout-check',
    {},
    {
      repeat: { pattern: '*/30 * * * *' },
      jobId: 'emergency-timeout-check',
    }
  )
}
```

---

## Compliance Check Processor — `src/jobs/processors/compliance-check.processor.ts`

```typescript
import { Job } from 'bullmq'
import { prisma } from '../../lib/prisma'
import { AgentRunner } from '../../agent/core/AgentRunner'
import { addDays } from 'date-fns'

export async function processComplianceCheck(job: Job) {
  // Find all compliance tasks due in next 30 days or overdue
  const tasks = await prisma.complianceTask.findMany({
    where: {
      status: { in: ['UPCOMING', 'DUE_SOON', 'AT_RISK'] },
      dueDate: { lte: addDays(new Date(), 30) },
      completedAt: null,
    },
    include: { property: true, jurisdiction: true }
  })

  for (const task of tasks) {
    const daysUntilDue = Math.ceil((task.dueDate.getTime() - Date.now()) / 1000 / 60 / 60 / 24)

    // Update status
    let newStatus = task.status
    if (daysUntilDue < 0) newStatus = 'OVERDUE'
    else if (daysUntilDue <= 7) newStatus = 'AT_RISK'
    else if (daysUntilDue <= 30) newStatus = 'DUE_SOON'

    await prisma.complianceTask.update({
      where: { id: task.id },
      data: { status: newStatus }
    })

    // Trigger agent for overdue or at-risk tasks
    if (newStatus === 'OVERDUE' || newStatus === 'AT_RISK') {
      const runner = new AgentRunner(task.organizationId)
      await runner.run({
        organizationId: task.organizationId,
        triggerType: 'scheduled',
        triggerId: task.id,
        workflowHint: 'compliance',
        context: { complianceTask: task, property: task.property, jurisdiction: task.jurisdiction }
      })
    }

    // Send reminder for DUE_SOON (max once per day)
    if (newStatus === 'DUE_SOON') {
      const lastReminder = task.lastReminderAt
      const hoursSinceReminder = lastReminder
        ? (Date.now() - lastReminder.getTime()) / 1000 / 3600
        : Infinity

      if (hoursSinceReminder > 24) {
        // Send reminder to coordinator
        await prisma.complianceTask.update({
          where: { id: task.id },
          data: {
            remindersSent: { increment: 1 },
            lastReminderAt: new Date()
          }
        })
        // await notifyCoordinators(task)
      }
    }
  }
}
```

---

## Lease Renewal Processor — `src/jobs/processors/renewal-nudge.processor.ts`

```typescript
import { Job } from 'bullmq'
import { prisma } from '../../lib/prisma'
import { AgentRunner } from '../../agent/core/AgentRunner'
import { addDays } from 'date-fns'

export async function processRenewalNudges(job: Job) {
  // Find leases expiring in 30-90 days with no renewal pending
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
      unit: { include: { property: true } }
    }
  })

  for (const lease of expiringLeases) {
    const daysUntilExpiry = Math.ceil((lease.endDate.getTime() - Date.now()) / 1000 / 60 / 60 / 24)

    // Run renewal workflow
    const runner = new AgentRunner(lease.unit.property.organizationId)
    await runner.run({
      organizationId: lease.unit.property.organizationId,
      triggerType: 'scheduled',
      triggerId: lease.id,
      workflowHint: 'lease_renewal',
      context: {
        lease,
        tenant: lease.tenant,
        unit: lease.unit,
        property: lease.unit.property,
        daysUntilExpiry,
      }
    })

    // Mark renewal sent
    await prisma.lease.update({
      where: { id: lease.id },
      data: { renewalSentAt: new Date(), status: 'RENEWAL_PENDING' }
    })
  }
}
```
