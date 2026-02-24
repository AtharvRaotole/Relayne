/**
 * E2E integration test: inbound message → classify → route → workflow.
 * Mocks LLM and external services. Uses real DB.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { Job } from 'bullmq'
import { processInboundMessage } from '../../src/jobs/processors/inbound-message.processor'
import * as MessageClassifier from '../../src/agent/core/MessageClassifier'
import * as MaintenanceWorkflow from '../../src/agent/workflows/MaintenanceWorkflow'

const prisma = new PrismaClient()

const SKIP_INTEGRATION =
  process.env.SKIP_INTEGRATION_TESTS === '1' || process.env.CI === 'true'

describe.skipIf(SKIP_INTEGRATION)('Inbound Message E2E', () => {
  let orgId: string
  let threadId: string
  let messageId: string

  beforeAll(async () => {
    const org = await prisma.organization.findFirst({
      where: { slug: 'demo-property-co' },
    })
    if (!org) throw new Error('Run db:seed first.')

    orgId = org.id

    const tenant = await prisma.tenant.findFirst({
      where: { organizationId: orgId, email: 'jane.doe@example.com' },
    })
    if (!tenant) throw new Error('Seed tenant not found.')

    const thread = await prisma.thread.findFirst({
      where: { organizationId: orgId, tenantId: tenant.id },
      include: { messages: true },
    })
    const msg = thread?.messages?.[0]
    if (!msg) throw new Error('Seed message not found.')

    threadId = thread!.id
    messageId = msg.id
  })

  afterAll(async () => {
    await prisma.$disconnect()
    vi.restoreAllMocks()
  })

  it('processInboundMessage classifies and routes maintenance_request to MaintenanceWorkflow', async () => {
    vi.spyOn(MessageClassifier, 'classifyMessage').mockResolvedValue({
      intent: 'maintenance_request',
      sentiment: 0.2,
      summary: 'Tenant reports leaking faucet',
      hostileScore: 0,
    })

    vi.spyOn(MaintenanceWorkflow, 'runMaintenanceWorkflow').mockResolvedValue({
      agentLogId: 'mock-log-id',
      status: 'completed',
      finalAction: 'Created work order',
    } as never)

    const job = {
      data: { messageId, organizationId: orgId, tenantId: (await prisma.tenant.findFirst({ where: { organizationId: orgId } }))?.id },
      id: 'test-job-1',
    } as Job

    await processInboundMessage(job)

    expect(MessageClassifier.classifyMessage).toHaveBeenCalledWith(
      expect.stringContaining('faucet')
    )
    expect(MaintenanceWorkflow.runMaintenanceWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: orgId,
        messageId,
        tenantId: expect.any(String),
      })
    )

    const updated = await prisma.message.findUnique({
      where: { id: messageId },
    })
    expect(updated?.aiProcessed).toBe(true)
    expect(updated?.aiIntent).toBe('maintenance_request')
  })
})
