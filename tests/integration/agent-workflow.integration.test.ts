/**
 * Integration tests for agent workflows.
 * Mocks Anthropic API to avoid external calls. Uses real DB (requires DATABASE_URL).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { runMaintenanceWorkflow } from '../../src/agent/workflows/MaintenanceWorkflow'
import { ToolRegistry } from '../../src/agent/core/ToolRegistry'
import { AgentRunner } from '../../src/agent/core/AgentRunner'

const prisma = new PrismaClient()

// Skip integration tests when DB is not available (CI, or explicit skip)
const SKIP_INTEGRATION =
  process.env.SKIP_INTEGRATION_TESTS === '1' || process.env.CI === 'true'

describe.skipIf(SKIP_INTEGRATION)('Agent Workflow Integration', () => {
  let orgId: string
  let tenantId: string
  let messageId: string

  beforeAll(async () => {
    const org = await prisma.organization.findFirst({
      where: { slug: 'demo-property-co' },
    })
    if (!org) {
      throw new Error('Run db:seed first. Organization demo-property-co not found.')
    }
    orgId = org.id

    const tenant = await prisma.tenant.findFirst({
      where: { organizationId: orgId, email: 'jane.doe@example.com' },
    })
    if (!tenant) throw new Error('Seed tenant not found.')
    tenantId = tenant.id

    const thread = await prisma.thread.findFirst({
      where: { organizationId: orgId, tenantId },
      include: { messages: true },
    })
    const msg = thread?.messages?.[0]
    if (!msg) throw new Error('Seed message not found.')
    messageId = msg.id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('ToolRegistry creates work order', async () => {
    const registry = new ToolRegistry(orgId)
    const property = await prisma.property.findFirst({
      where: { organizationId: orgId },
    })
    const unit = await prisma.unit.findFirst({
      where: { propertyId: property!.id },
    })

    const result = await registry.execute('create_work_order', {
      propertyId: property!.id,
      unitId: unit!.id,
      tenantId,
      title: 'Test faucet repair',
      description: 'Integration test work order',
      category: 'PLUMBING',
      priority: 'NORMAL',
    })

    expect(result).toHaveProperty('workOrderId')
    expect(result).toHaveProperty('status', 'NEW')

    const wo = await prisma.workOrder.findUnique({
      where: { id: (result as { workOrderId: string }).workOrderId },
    })
    expect(wo).toBeTruthy()
    expect(wo!.title).toBe('Test faucet repair')
    expect(wo!.category).toBe('PLUMBING')

    await prisma.workOrder.delete({
      where: { id: wo!.id },
    })
  })

  it('ToolRegistry find_available_vendors returns scored vendors', async () => {
    const registry = new ToolRegistry(orgId)
    const result = await registry.execute('find_available_vendors', {
      trade: 'plumbing',
      propertyZip: '78701',
      priority: 'NORMAL',
    })

    expect(result).toHaveProperty('vendors')
    expect(result).toHaveProperty('totalFound')
    const vendors = (result as { vendors: unknown[] }).vendors
    if (vendors.length > 0) {
      expect(vendors[0]).toHaveProperty('vendorId')
      expect(vendors[0]).toHaveProperty('score')
      expect(vendors[0]).toHaveProperty('reasons')
    }
  })

  it('MaintenanceWorkflow loads context and returns without error', async () => {
    vi.spyOn(AgentRunner.prototype, 'run').mockResolvedValue({
      agentLogId: 'test-log-id',
      status: 'completed',
      finalAction: 'Created work order',
    })

    const result = await runMaintenanceWorkflow({
      organizationId: orgId,
      messageId,
      tenantId,
    })

    expect(result).toHaveProperty('agentLogId', 'test-log-id')
    expect(result).toHaveProperty('status', 'completed')

    vi.restoreAllMocks()
  })
})
